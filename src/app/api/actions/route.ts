import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { auth, currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertPurchase, validateQuantity, canAccess } from "@/lib/domain";
import { createOrder, settleOrder } from "@/lib/orders";
import { mkdir, writeFile } from "node:fs/promises";
import { sensitiveRateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { storage, validateUpload } from "@/services/storage";
const text = (n = 200) => z.string().trim().min(1).max(n);
const int = (min = 1) => z.coerce.number().int().min(min).max(100000000);
const field = (f: FormData, k: string) => String(f.get(k) ?? "");
export async function POST(req: NextRequest) {
  try {
    if (req.headers.get("origin") !== new URL(env.SITE_URL).origin)
      return NextResponse.json(
        { error: "요청 출처를 확인할 수 없습니다." },
        { status: 403 },
      );
    if (Number(req.headers.get("content-length") ?? 0) > 12 * 1024 * 1024)
      return NextResponse.json(
        { error: "요청 파일 크기는 10MB 이하로 제한됩니다." },
        { status: 413 },
      );
    const f = await req.formData();
    const op = field(f, "op");
    if (op === "signup") {
      const s = z
        .object({
          name: text(80),
          email: z.email(),
          password: z.string().min(10).max(128),
          phone: z.string().regex(/^[0-9+ -]{9,20}$/),
          company: text(100),
          businessNumber: z.string().regex(/^\d{3}-?\d{2}-?\d{5}$/),
          agree: z.literal("on"),
        })
        .parse(Object.fromEntries(f));
      await sensitiveRateLimit("signup:" + s.email, 5);
      await sensitiveRateLimit("signup:global", 20);
      const policy = await db.content.findUnique({ where: { slug: "terms" } });
      if (field(f, "policyVersion") !== (policy?.version ?? "draft-v1"))
        throw new Error("약관이 변경되었습니다. 새로고침 후 확인해주세요.");
      const r = await auth.api.signUpEmail({
        body: { name: s.name, email: s.email, password: s.password },
        headers: req.headers,
        asResponse: true,
      });
      if (!r.ok)
        throw new Error(
          "가입할 수 없습니다. 이메일 중복 여부와 입력 정보를 확인해주세요.",
        );
      const b = await r.json();
      await db.user.update({
        where: { id: b.user.id },
        data: {
          phone: s.phone,
          company: s.company,
          businessNumber: s.businessNumber.replaceAll("-", ""),
          consentAt: new Date(),
          policyVersion: field(f, "policyVersion"),
          marketingConsent: field(f, "marketing") === "on",
        },
      });
      const response = NextResponse.json({ redirect: "/account" });
      for (const c of r.headers.getSetCookie())
        response.headers.append("set-cookie", c);
      return response;
    }
    const u = await currentUser();
    if (!u) throw new Error("로그인이 필요합니다.");
    await sensitiveRateLimit("sensitive:" + u.id);
    if (op.startsWith("admin-") && u.role !== "ADMIN")
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다." },
        { status: 403 },
      );
    const audit = async (
      action: string,
      target: string,
      detail: Prisma.InputJsonValue,
    ) =>
      db.auditLog.create({ data: { actorId: u.id, action, target, detail } });
    if (op === "cart-add" || op === "cart-update") {
      assertPurchase(u);
      const variantId = text().parse(field(f, "variantId")),
        quantity = int().parse(field(f, "quantity"));
      await db.$transaction(async (tx) => {
        const v = await tx.productVariant.findUniqueOrThrow({
          where: { id: variantId },
          include: { product: true },
        });
        assertPurchase(u, v.product.vipOnly);
        if (v.product.status !== "ACTIVE")
          throw new Error("판매 중지 상품입니다.");
        const old = await tx.cartItem.findUnique({
          where: { userId_variantId: { userId: u.id, variantId } },
        });
        const qty =
          op === "cart-add" ? quantity + (old?.quantity ?? 0) : quantity;
        validateQuantity(qty, v.moq, v.step, v.onHand - v.reserved);
        await tx.cartItem.upsert({
          where: { userId_variantId: { userId: u.id, variantId } },
          create: { userId: u.id, variantId, quantity: qty },
          update: { quantity: qty },
        });
      });
      return NextResponse.json({
        redirect: field(f, "buy") === "1" ? "/checkout" : "/cart",
      });
    } else if (op === "cart-remove") {
      await db.cartItem.deleteMany({
        where: { userId: u.id, id: field(f, "id") },
      });
    } else if (op === "cart-select") {
      await db.cartItem.updateMany({
        where: {
          userId: u.id,
          ...(field(f, "id") ? { id: field(f, "id") } : {}),
        },
        data: { selected: field(f, "selected") === "true" },
      });
    } else if (op === "cart-delete-selected") {
      await db.cartItem.deleteMany({ where: { userId: u.id, selected: true } });
    } else if (op === "wishlist") {
      const productId = text().parse(field(f, "productId"));
      const p = await db.product.findUniqueOrThrow({
        where: { id: productId },
      });
      if (p.vipOnly && !canAccess(u, true))
        throw new Error("VIP 전용 상품입니다.");
      const old = await db.wishlist.findUnique({
        where: { userId_productId: { userId: u.id, productId } },
      });
      if (old) await db.wishlist.delete({ where: { id: old.id } });
      else await db.wishlist.create({ data: { userId: u.id, productId } });
    } else if (op === "checkout") {
      const s = z
        .object({
          recipient: text(80),
          phone: z.string().regex(/^[0-9+ -]{9,20}$/),
          postcode: z.string().regex(/^\d{5}$/),
          address: text(200),
          detail: text(200),
          memo: z.string().max(500),
          idempotencyKey: z.uuid(),
          fingerprint: text(20000),
          policyVersion: text(),
          agree: z.literal("on"),
        })
        .parse(Object.fromEntries(f));
      const o = await createOrder(u.id, s);
      await settleOrder(o.id, "PAID", u.id);
      if (field(f, "saveAddress") === "on") {
        const found = await db.address.findFirst({
          where: { userId: u.id, address: s.address, detail: s.detail },
        });
        if (!found)
          await db.address.create({
            data: {
              userId: u.id,
              recipient: s.recipient,
              phone: s.phone,
              postcode: s.postcode,
              address: s.address,
              detail: s.detail,
            },
          });
      }
      return NextResponse.json({ redirect: "/orders/" + o.id + "/complete" });
    } else if (op === "cancel-order") {
      await settleOrder(field(f, "orderId"), "CANCELLED", u.id);
    } else if (op === "reorder") {
      const o = await db.order.findFirstOrThrow({
        where: { id: field(f, "orderId"), userId: u.id },
        include: { items: true },
      });
      assertPurchase(u);
      await db.$transaction(async (tx) => {
        for (const i of o.items) {
          const v = await tx.productVariant.findUniqueOrThrow({
            where: { id: i.variantId },
            include: { product: true, tiers: true },
          });
          assertPurchase(u, v.product.vipOnly);
          if (v.product.status !== "ACTIVE")
            throw new Error("판매 중지된 상품이 포함되어 있습니다.");
          const old = await tx.cartItem.findUnique({
            where: { userId_variantId: { userId: u.id, variantId: v.id } },
          });
          const quantity = i.quantity + (old?.quantity ?? 0);
          validateQuantity(quantity, v.moq, v.step, v.onHand - v.reserved);
          await tx.cartItem.upsert({
            where: { userId_variantId: { userId: u.id, variantId: v.id } },
            create: { userId: u.id, variantId: v.id, quantity },
            update: { quantity },
          });
        }
      });
      return NextResponse.json({ redirect: "/cart" });
    } else if (op === "quote") {
      const s = z
        .object({
          productId: text(),
          quantity: int(),
          message: text(3000),
          phone: text(20),
          agree: z.literal("on"),
        })
        .parse(Object.fromEntries(f));
      const p = await db.product.findUniqueOrThrow({
        where: { id: s.productId },
      });
      assertPurchase(u, p.vipOnly);
      await db.quoteRequest.create({
        data: {
          userId: u.id,
          message: s.message,
          phone: s.phone,
          consentAt: new Date(),
          items: { create: { productId: s.productId, quantity: s.quantity } },
        },
      });
      return NextResponse.json({ redirect: "/account/quotes" });
    } else if (op === "inquiry") {
      const p = await db.product.findUniqueOrThrow({
        where: { id: field(f, "productId") },
      });
      if (p.vipOnly && !canAccess(u, true))
        throw new Error("VIP 전용 상품입니다.");
      await db.inquiry.create({
        data: {
          userId: u.id,
          productId: p.id,
          question: text(1500).parse(field(f, "question")),
        },
      });
    } else if (op === "address-remove") {
      await db.address.deleteMany({
        where: { id: field(f, "id"), userId: u.id },
      });
    } else if (op === "admin-member") {
      const s = z
        .object({
          id: text(),
          businessStatus: z.enum([
            "PENDING",
            "APPROVED",
            "REJECTED",
            "SUSPENDED",
          ]),
          memberGrade: z.enum(["STANDARD", "VIP"]),
          accountStatus: z.enum(["ACTIVE", "DISABLED"]),
          reason: text(300),
        })
        .parse(Object.fromEntries(f));
      if (s.id === u.id)
        throw new Error("본인 관리자 계정은 이 화면에서 변경할 수 없습니다.");
      await db.$transaction(async (tx) => {
        const before = await tx.user.findUniqueOrThrow({ where: { id: s.id } });
        await tx.user.update({
          where: { id: s.id },
          data: {
            businessStatus: s.businessStatus,
            memberGrade: s.memberGrade,
            accountStatus: s.accountStatus,
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: u.id,
            action: op,
            target: s.id,
            detail: {
              before: {
                businessStatus: before.businessStatus,
                memberGrade: before.memberGrade,
                accountStatus: before.accountStatus,
              },
              after: s,
            },
          },
        });
      });
    } else if (op === "admin-product") {
      const s = z
        .object({
          id: z.string(),
          code: text(30),
          slug: z.string().regex(/^[a-z0-9-]+$/),
          name: text(150),
          description: text(5000),
          sellingPoints: text(3000),
          categoryId: text(),
          shippingGroupId: text(),
          status: z.enum(["ACTIVE", "HIDDEN", "STOPPED"]),
          origin: text(100),
          recommendation: z.string().max(500),
        })
        .parse(Object.fromEntries(f));
      const data = {
        code: s.code,
        slug: s.slug,
        name: s.name,
        description: s.description,
        sellingPoints: s.sellingPoints,
        categoryId: s.categoryId,
        shippingGroupId: s.shippingGroupId,
        status: s.status,
        origin: s.origin,
        recommendation: s.recommendation,
        recommended: field(f, "recommended") === "on",
        vipOnly: field(f, "vipOnly") === "on",
        tags: field(f, "tags")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };
      const collections = f
        .getAll("collectionId")
        .map((id) => ({ id: String(id) }));
      const p = s.id
        ? await db.product.update({
            where: { id: s.id },
            data: { ...data, collections: { set: collections } },
          })
        : await db.product.create({
            data: {
              ...data,
              image: "/images/product-1.svg",
              collections: { connect: collections },
            },
          });
      await audit(op, p.id, { name: p.name, status: p.status });
      return NextResponse.json({ redirect: "/admin/products/" + p.id });
    } else if (op === "admin-variant") {
      const s = z
        .object({
          id: z.string(),
          productId: text(),
          sku: text(50),
          name: text(100),
          moq: int(),
          step: int(),
          onHand: int(0),
          reason: text(300),
          tiers: text(5000),
        })
        .parse(Object.fromEntries(f));
      if (s.moq % s.step !== 0)
        throw new Error("MOQ는 주문 단위의 배수여야 합니다.");
      const tiers = z
        .array(z.object({ minQty: int(), standard: int(0), vip: int(0) }))
        .min(1)
        .max(20)
        .parse(JSON.parse(s.tiers));
      if (
        !tiers.some((t) => t.minQty === s.moq) ||
        new Set(tiers.map((t) => t.minQty)).size !== tiers.length ||
        tiers.some((t) => t.minQty < s.moq || t.minQty % s.step !== 0)
      )
        throw new Error(
          "가격 구간은 MOQ에서 시작하며 주문 단위의 배수여야 합니다.",
        );
      await db.$transaction(async (tx) => {
        let id = s.id;
        if (id) {
          const old = await tx.productVariant.findUniqueOrThrow({
            where: { id },
          });
          if (s.onHand < old.reserved)
            throw new Error("예약 재고보다 재고를 줄일 수 없습니다.");
          await tx.productVariant.update({
            where: { id },
            data: {
              sku: s.sku,
              name: s.name,
              moq: s.moq,
              step: s.step,
              onHand: s.onHand,
            },
          });
          await tx.priceTier.deleteMany({ where: { variantId: id } });
        } else {
          const v = await tx.productVariant.create({
            data: {
              productId: s.productId,
              sku: s.sku,
              name: s.name,
              moq: s.moq,
              step: s.step,
              onHand: s.onHand,
            },
          });
          id = v.id;
        }
        await tx.priceTier.createMany({
          data: tiers.map((t) => ({ ...t, variantId: id })),
        });
        await tx.auditLog.create({
          data: {
            actorId: u.id,
            action: op,
            target: id,
            detail: {
              onHand: s.onHand,
              moq: s.moq,
              step: s.step,
              reason: s.reason,
              tiers,
            },
          },
        });
      });
    } else if (op === "admin-shipping") {
      const s = z
        .object({
          id: z.string(),
          name: text(100),
          origin: text(200),
          fee: int(0),
          freeAbove: z.string(),
          mode: z.enum(["FREE", "FIXED", "CONDITIONAL"]),
          leadDays: text(80),
        })
        .parse(Object.fromEntries(f));
      const data = {
        name: s.name,
        origin: s.origin,
        fee: s.fee,
        freeAbove: s.freeAbove ? int(0).parse(s.freeAbove) : null,
        mode: s.mode,
        leadDays: s.leadDays,
      };
      if (data.mode === "CONDITIONAL" && data.freeAbove === null)
        throw new Error("조건부 무료배송 기준을 입력해주세요.");
      const g = s.id
        ? await db.shippingGroup.update({ where: { id: s.id }, data })
        : await db.shippingGroup.create({ data });
      await audit(op, g.id, data);
    } else if (op === "admin-taxonomy") {
      const s = z
        .object({
          id: z.string(),
          type: z.enum(["category", "collection"]),
          name: text(100),
          slug: z.string().regex(/^[a-z0-9-]+$/),
        })
        .parse(Object.fromEntries(f));
      if (s.type === "category") {
        const d = { name: s.name, slug: s.slug };
        const c = s.id
          ? await db.category.update({ where: { id: s.id }, data: d })
          : await db.category.create({ data: d });
        await audit(op, c.id, d);
      } else {
        const d = {
          name: s.name,
          slug: s.slug,
          description: field(f, "description"),
        };
        const c = s.id
          ? await db.collection.update({ where: { id: s.id }, data: d })
          : await db.collection.create({ data: d });
        await audit(op, c.id, d);
      }
    } else if (op === "admin-shipment") {
      const s = z
        .object({
          orderId: text(),
          shippingGroupId: text(),
          carrier: text(60),
          trackingNumber: text(100),
          status: z.enum(["SHIPPED", "DELIVERED"]),
        })
        .parse(Object.fromEntries(f));
      await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id"=${s.orderId} FOR UPDATE`;
        const o = await tx.order.findUniqueOrThrow({
          where: { id: s.orderId },
          include: { items: true, shipments: true },
        });
        if (
          o.status !== "PAID" ||
          !o.items.some((i) => i.shippingGroupId === s.shippingGroupId)
        )
          throw new Error("결제된 주문의 배송그룹만 출고할 수 있습니다.");
        const old = o.shipments.find(
          (x) => x.shippingGroupId === s.shippingGroupId,
        );
        if (old?.status === "DELIVERED" && s.status !== "DELIVERED")
          throw new Error("배송 완료 상태는 되돌릴 수 없습니다.");
        await tx.shipment.upsert({
          where: {
            orderId_shippingGroupId: {
              orderId: s.orderId,
              shippingGroupId: s.shippingGroupId,
            },
          },
          create: s,
          update: {
            carrier: s.carrier,
            trackingNumber: s.trackingNumber,
            status: s.status,
          },
        });
        const shipments = await tx.shipment.findMany({
          where: { orderId: o.id },
        });
        const groupIds = new Set(o.items.map((i) => i.shippingGroupId));
        const allDelivered =
          shipments.length === groupIds.size &&
          shipments.every((x) => x.status === "DELIVERED");
        await tx.order.update({
          where: { id: o.id },
          data: { shippingStatus: allDelivered ? "DELIVERED" : "SHIPPED" },
        });
        await tx.auditLog.create({
          data: { actorId: u.id, action: op, target: o.id, detail: s },
        });
      });
    } else if (op === "admin-quote") {
      const s = z
        .object({
          id: text(),
          reply: text(3000),
          status: z.enum(["ANSWERED", "CLOSED"]),
        })
        .parse(Object.fromEntries(f));
      await db.quoteRequest.update({
        where: { id: s.id },
        data: { reply: s.reply, status: s.status },
      });
      await audit(op, s.id, s);
    } else if (op === "admin-inquiry") {
      await db.inquiry.update({
        where: { id: field(f, "id") },
        data: { reply: text(1500).parse(field(f, "reply")) },
      });
      await audit(op, field(f, "id"), { reply: field(f, "reply") });
    } else if (op === "admin-content") {
      const s = z
        .object({
          id: z.string(),
          slug: z.string().regex(/^[a-z0-9-]+$/),
          kind: z.enum(["GUIDE", "NOTICE", "BANNER", "POLICY"]),
          title: text(200),
          body: text(20000),
          href: z.string(),
          version: text(50),
        })
        .parse(Object.fromEntries(f));
      if (s.href && (!s.href.startsWith("/") || s.href.startsWith("//")))
        throw new Error("링크는 사이트 내부 경로를 입력해주세요.");
      const data = {
        slug: s.slug,
        kind: s.kind,
        title: s.title,
        body: s.body,
        href: s.href,
        version: s.version,
        published: field(f, "published") === "on",
      };
      const c = s.id
        ? await db.content.update({ where: { id: s.id }, data })
        : await db.content.create({ data });
      await audit(op, c.id, data);
    } else if (op === "admin-setting") {
      const allowed = [
        "legalName",
        "representative",
        "businessNumber",
        "commerceNumber",
        "address",
        "supportEmail",
        "supportPhone",
        "supportHours",
        "privacyOfficer",
      ];
      const key = z
        .enum(allowed as [string, ...string[]])
        .parse(field(f, "key"));
      const value = z.string().max(2000).parse(field(f, "value"));
      await db.siteSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
      await audit(op, key, { value });
    } else if (op === "admin-image") {
      const productId = text().parse(field(f, "productId"));
      const file = f.get("file");
      if (!(file instanceof File)) throw new Error("이미지를 선택해주세요.");
      const b = Buffer.from(await file.arrayBuffer()),
        ext = validateUpload(file.name, file.type, b);
      if (ext === ".pdf") throw new Error("상품 사진은 PNG/JPEG만 허용합니다.");
      const name = randomUUID() + ext;
      await mkdir("public/uploads", { recursive: true });
      await writeFile("public/uploads/" + name, b);
      await db.product.update({
        where: { id: productId },
        data: { image: "/uploads/" + name },
      });
      await audit(op, productId, { image: name });
    } else if (op === "admin-cancel") {
      await settleOrder(field(f, "orderId"), "CANCELLED");
      await audit(op, field(f, "orderId"), { status: "CANCELLED" });
    } else if (op === "admin-asset") {
      const productId = text().parse(field(f, "productId")),
        usageScope = text(2000).parse(field(f, "usageScope"));
      const file = f.get("file");
      if (!(file instanceof File)) throw new Error("자료 파일을 선택해주세요.");
      const b = Buffer.from(await file.arrayBuffer()),
        ext = validateUpload(file.name, file.type, b),
        storageKey = randomUUID() + ext;
      await storage.put(storageKey, b, file.type);
      const a = await db.productAsset.create({
        data: {
          productId,
          name: file.name.replace(/[^a-zA-Z0-9가-힣_. -]/g, ""),
          usageScope,
          mime: file.type,
          size: b.length,
          storageKey,
        },
      });
      await audit(op, a.id, { productId, usageScope });
    } else throw new Error("지원하지 않는 요청입니다.");
    return NextResponse.json({ ok: true });
  } catch (e) {
    const error =
      e instanceof z.ZodError
        ? "입력값을 확인해주세요: " +
          e.issues.map((i) => i.path.join(".") + " " + i.message).join(", ")
        : e instanceof Prisma.PrismaClientKnownRequestError
          ? e.code === "P2002"
            ? "이미 사용 중인 상품번호·SKU·이메일입니다."
            : "데이터가 변경되었거나 요청을 저장하지 못했습니다."
          : e instanceof Error
            ? e.message
            : "처리 중 오류가 발생했습니다.";
    return NextResponse.json({ error }, { status: 400 });
  }
}
