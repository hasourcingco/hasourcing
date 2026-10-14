import { Prisma } from "@prisma/client";
import { db } from "./db";
import {
  assertPurchase,
  price,
  shipping,
  validateQuantity,
  vat,
} from "./domain";
import { env, isDemo } from "./env";
export async function cartQuote(userId: string, selectedOnly = false) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  assertPurchase(user);
  const items = await db.cartItem.findMany({
    where: { userId, ...(selectedOnly ? { selected: true } : {}) },
    include: {
      variant: {
        include: { tiers: true, product: { include: { shippingGroup: true } } },
      },
    },
    orderBy: { variantId: "asc" },
  });
  const lines = items.map((item) => {
    const v = item.variant;
    assertPurchase(user, v.product.vipOnly);
    if (v.product.status !== "ACTIVE")
      throw new Error(v.product.name + "은 판매 중지되었습니다.");
    validateQuantity(item.quantity, v.moq, v.step, v.onHand - v.reserved);
    const unitPrice = price(v.tiers, item.quantity, user.memberGrade),
      amount = unitPrice * item.quantity;
    return { ...item, unitPrice, amount, ...vat(amount) };
  });
  const groups = shipping(
    lines.map((l) => ({
      amount: l.amount,
      group: l.variant.product.shippingGroup,
    })),
  );
  const subtotal = lines.reduce((s, l) => s + l.amount, 0),
    delivery = groups.reduce((s, g) => s + g.cost, 0);
  const supply =
    lines.reduce((s, l) => s + l.supply, 0) +
    groups.reduce((s, g) => s + vat(g.cost).supply, 0);
  return {
    lines,
    groups,
    subtotal,
    shipping: delivery,
    total: subtotal + delivery,
    supply,
    tax: subtotal + delivery - supply,
  };
}
export async function createOrder(
  userId: string,
  input: {
    recipient: string;
    phone: string;
    postcode: string;
    address: string;
    detail: string;
    memo: string;
    idempotencyKey: string;
    fingerprint: string;
    policyVersion: string;
  },
) {
  if (!isDemo || env.PAYMENT_PROVIDER !== "mock")
    throw new Error("실결제는 아직 연동되지 않았습니다.");
  const old = await db.order.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (old) {
    if (old.userId !== userId) throw new Error("잘못된 주문 요청입니다.");
    return old;
  }
  return db
    .$transaction(
      async (tx) => {
        const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
        assertPurchase(user);
        const policy = await tx.content.findUnique({
          where: { slug: "terms" },
        });
        if (input.policyVersion !== (policy?.version ?? "draft-v1"))
          throw new Error("정책이 변경되었습니다. 주문서를 다시 확인해주세요.");
        const items = await tx.cartItem.findMany({
          where: { userId, selected: true },
          include: {
            variant: {
              include: {
                tiers: true,
                product: { include: { shippingGroup: true } },
              },
            },
          },
          orderBy: { variantId: "asc" },
        });
        if (!items.length) throw new Error("선택한 장바구니 상품이 없습니다.");
        const lines = items.map((item) => {
          const v = item.variant;
          assertPurchase(user, v.product.vipOnly);
          if (v.product.status !== "ACTIVE")
            throw new Error("판매 중지된 상품입니다.");
          validateQuantity(item.quantity, v.moq, v.step, v.onHand - v.reserved);
          const unitPrice = price(v.tiers, item.quantity, user.memberGrade),
            amount = unitPrice * item.quantity;
          return { item, unitPrice, amount, ...vat(amount) };
        });
        const groups = shipping(
          lines.map((l) => ({
            amount: l.amount,
            group: l.item.variant.product.shippingGroup,
          })),
        );
        const subtotal = lines.reduce((s, l) => s + l.amount, 0),
          delivery = groups.reduce((s, g) => s + g.cost, 0),
          total = subtotal + delivery;
        const fingerprint = JSON.stringify({
          lines: lines.map((l) => [
            l.item.variantId,
            l.item.quantity,
            l.unitPrice,
            l.item.variant.moq,
            l.item.variant.step,
          ]),
          groups: groups.map((g) => [
            g.id,
            g.cost,
            g.mode,
            g.fee,
            g.freeAbove,
            g.origin,
            g.leadDays,
          ]),
          total,
        });
        if (input.fingerprint !== fingerprint)
          throw new Error(
            "가격 또는 배송 조건이 변경되었습니다. 주문서를 새로고침 후 다시 확인해주세요.",
          );
        const supply =
          lines.reduce((s, l) => s + l.supply, 0) +
          groups.reduce((s, g) => s + vat(g.cost).supply, 0);
        const order = await tx.order.create({
          data: {
            number: "WB" + Date.now() + Math.floor(Math.random() * 1000),
            userId,
            idempotencyKey: input.idempotencyKey,
            isDemo: true,
            recipient: input.recipient,
            phone: input.phone,
            postcode: input.postcode,
            address: input.address,
            detail: input.detail,
            memo: input.memo,
            subtotal,
            shipping: delivery,
            total,
            supply,
            tax: total - supply,
            shippingSnapshot: groups,
            policyVersion: input.policyVersion,
            consentAt: new Date(),
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            items: {
              create: lines.map((l) => ({
                variantId: l.item.variantId,
                productId: l.item.variant.productId,
                productName: l.item.variant.product.name,
                productCode: l.item.variant.product.code,
                optionName: l.item.variant.name,
                quantity: l.item.quantity,
                unitPrice: l.unitPrice,
                amount: l.amount,
                supply: l.supply,
                tax: l.tax,
                shippingGroupId: l.item.variant.product.shippingGroupId,
              })),
            },
            payment: {
              create: { provider: "mock", status: "PENDING", amount: total },
            },
          },
        });
        for (const l of lines) {
          const changed =
            await tx.$executeRaw`UPDATE "ProductVariant" SET "reserved"="reserved"+${l.item.quantity} WHERE "id"=${l.item.variantId} AND "onHand"-"reserved">=${l.item.quantity}`;
          if (changed !== 1)
            throw new Error("재고가 변경되었습니다. 장바구니를 확인해주세요.");
          await tx.inventoryReservation.create({
            data: {
              orderId: order.id,
              variantId: l.item.variantId,
              quantity: l.item.quantity,
            },
          });
        }
        await tx.cartItem.deleteMany({
          where: { id: { in: items.map((i) => i.id) } },
        });
        return order;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
    .catch(async (error) => {
      // A concurrent retry can lose the unique-key or serialization race.
      // Return the already committed order without reserving inventory again.
      const committed = await db.order.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (committed) {
        if (committed.userId !== userId)
          throw new Error("잘못된 주문 요청입니다.");
        return committed;
      }
      throw error;
    });
}
export async function settleOrder(
  orderId: string,
  mode: "PAID" | "CANCELLED" | "EXPIRED",
  ownerId?: string,
) {
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      { id: string }[]
    >`SELECT "id" FROM "Order" WHERE "id"=${orderId} FOR UPDATE`;
    if (!rows.length) throw new Error("주문을 찾을 수 없습니다.");
    const o = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { reservations: true },
    });
    if (ownerId && o.userId !== ownerId)
      throw new Error("주문 접근 권한이 없습니다.");
    if (o.status !== "PENDING") {
      if (o.status === mode) return o;
      throw new Error("이미 처리된 주문은 해당 상태로 전환할 수 없습니다.");
    }
    if (mode === "PAID" && o.expiresAt <= new Date())
      throw new Error("재고 예약이 만료되었습니다.");
    if (mode === "PAID" && (!isDemo || !o.isDemo))
      throw new Error("검증된 결제 승인이 필요합니다.");
    if (mode === "EXPIRED" && o.expiresAt > new Date()) return o;
    for (const r of o.reservations) {
      if (r.status !== "RESERVED") continue;
      await tx.productVariant.update({
        where: { id: r.variantId },
        data: {
          reserved: { decrement: r.quantity },
          ...(mode === "PAID" ? { onHand: { decrement: r.quantity } } : {}),
        },
      });
      await tx.inventoryReservation.update({
        where: { id: r.id },
        data: { status: mode === "PAID" ? "COMMITTED" : "RELEASED" },
      });
    }
    await tx.payment.update({
      where: { orderId },
      data: { status: mode, confirmedAt: mode === "PAID" ? new Date() : null },
    });
    return tx.order.update({
      where: { id: orderId },
      data: { status: mode, paymentStatus: mode },
    });
  });
}
export function quoteFingerprint(q: Awaited<ReturnType<typeof cartQuote>>) {
  return JSON.stringify({
    lines: q.lines.map((l) => [
      l.variantId,
      l.quantity,
      l.unitPrice,
      l.variant.moq,
      l.variant.step,
    ]),
    groups: q.groups.map((g) => [
      g.id,
      g.cost,
      g.mode,
      g.fee,
      g.freeAbove,
      g.origin,
      g.leadDays,
    ]),
    total: q.total,
  });
}
