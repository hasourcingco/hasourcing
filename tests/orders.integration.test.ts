import "dotenv/config";
import { beforeAll, afterAll, beforeEach, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import {
  cartQuote,
  quoteFingerprint,
  createOrder,
  settleOrder,
} from "../src/lib/orders";
const prefix = "test-" + randomUUID();
let variantId: string;
let productId: string;
const users = [prefix + "-a", prefix + "-b"];
let ids: string[] = [];
const input = (fingerprint: string, key = randomUUID()) => ({
  recipient: "테스트",
  phone: "01000000000",
  postcode: "00000",
  address: "자동 테스트 주소",
  detail: "테스트용",
  memo: "",
  policyVersion: "draft-v1",
  idempotencyKey: key,
  fingerprint,
});
describe("PostgreSQL order and reservation transactions", () => {
  beforeAll(async () => {
    if (!["local", "demo"].includes(process.env.APP_ENV ?? ""))
      throw new Error("local/demo only");
    const c = await db.category.findFirstOrThrow(),
      g = await db.shippingGroup.findFirstOrThrow();
    const p = await db.product.create({
      data: {
        code: prefix,
        slug: prefix,
        name: "자동 테스트 상품",
        description: "test",
        sellingPoints: "test",
        tags: [],
        image: "/images/product-1.svg",
        categoryId: c.id,
        shippingGroupId: g.id,
        variants: {
          create: {
            sku: prefix,
            name: "test",
            moq: 5,
            step: 5,
            onHand: 10,
            tiers: { create: { minQty: 5, standard: 1000, vip: 900 } },
          },
        },
      },
      include: { variants: true },
    });
    productId = p.id;
    variantId = p.variants[0].id;
    for (const id of users)
      await db.user.create({
        data: {
          id,
          name: "자동 테스트",
          email: id + "@example.invalid",
          businessStatus: "APPROVED",
        },
      });
  });
  beforeEach(async () => {
    await db.cartItem.deleteMany({ where: { userId: { in: users } } });
    await db.productVariant.update({
      where: { id: variantId },
      data: { onHand: 10, reserved: 0 },
    });
    for (const userId of users)
      await db.cartItem.create({ data: { userId, variantId, quantity: 10 } });
  });
  afterAll(async () => {
    ids = (
      await db.order.findMany({
        where: { userId: { in: users } },
        select: { id: true },
      })
    ).map((o) => o.id);
    await db.inventoryReservation.deleteMany({
      where: { orderId: { in: ids } },
    });
    await db.payment.deleteMany({ where: { orderId: { in: ids } } });
    await db.orderItem.deleteMany({ where: { orderId: { in: ids } } });
    await db.order.deleteMany({ where: { id: { in: ids } } });
    await db.cartItem.deleteMany({ where: { userId: { in: users } } });
    await db.priceTier.deleteMany({ where: { variantId } });
    await db.productVariant.delete({ where: { id: variantId } });
    await db.product.delete({ where: { id: productId } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.$disconnect();
  });
  it("recalculates DB price and refuses changed checkout conditions", async () => {
    const q = await cartQuote(users[0], true);
    await db.priceTier.updateMany({
      where: { variantId },
      data: { standard: 1100 },
    });
    await expect(
      createOrder(users[0], input(quoteFingerprint(q))),
    ).rejects.toThrow("가격");
    await db.priceTier.updateMany({
      where: { variantId },
      data: { standard: 1000 },
    });
    expect(
      (await db.productVariant.findUniqueOrThrow({ where: { id: variantId } }))
        .reserved,
    ).toBe(0);
  });
  it("is idempotent and commits inventory exactly once", async () => {
    const q = await cartQuote(users[0], true),
      i = input(quoteFingerprint(q));
    const o = await createOrder(users[0], i);
    expect(
      (await db.productVariant.findUniqueOrThrow({ where: { id: variantId } }))
        .reserved,
    ).toBe(10);
    expect((await createOrder(users[0], i)).id).toBe(o.id);
    await settleOrder(o.id, "PAID", users[0]);
    await settleOrder(o.id, "PAID", users[0]);
    const v = await db.productVariant.findUniqueOrThrow({
      where: { id: variantId },
    });
    expect(v.onHand).toBe(0);
    expect(v.reserved).toBe(0);
  });
  it("returns one order for simultaneous retries with the same key", async () => {
    const q = await cartQuote(users[0], true),
      i = input(quoteFingerprint(q));
    const orders = await Promise.all([
      createOrder(users[0], i),
      createOrder(users[0], i),
    ]);
    expect(orders[0].id).toBe(orders[1].id);
    expect(
      await db.order.count({ where: { idempotencyKey: i.idempotencyKey } }),
    ).toBe(1);
    expect(
      (await db.productVariant.findUniqueOrThrow({ where: { id: variantId } }))
        .reserved,
    ).toBe(10);
  });
  it("prevents simultaneous overselling with atomic reservation", async () => {
    const q = await cartQuote(users[0], true);
    const results = await Promise.allSettled(
      users.map((id) => createOrder(id, input(quoteFingerprint(q)))),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      (await db.productVariant.findUniqueOrThrow({ where: { id: variantId } }))
        .reserved,
    ).toBe(10);
  });
  it("cancellation releases stock once", async () => {
    const q = await cartQuote(users[0], true),
      o = await createOrder(users[0], input(quoteFingerprint(q)));
    await settleOrder(o.id, "CANCELLED", users[0]);
    await settleOrder(o.id, "CANCELLED", users[0]);
    const v = await db.productVariant.findUniqueOrThrow({
      where: { id: variantId },
    });
    expect(v.onHand).toBe(10);
    expect(v.reserved).toBe(0);
  });
  it("checks ownership and rejects reuse by other user", async () => {
    const q = await cartQuote(users[0], true),
      i = input(quoteFingerprint(q)),
      o = await createOrder(users[0], i);
    await expect(settleOrder(o.id, "PAID", users[1])).rejects.toThrow("권한");
    await expect(createOrder(users[1], i)).rejects.toThrow("잘못된");
  });
  it("expiration and confirmation cannot both consume stock", async () => {
    const q = await cartQuote(users[0], true),
      o = await createOrder(users[0], input(quoteFingerprint(q)));
    await db.order.update({
      where: { id: o.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await Promise.allSettled([
      settleOrder(o.id, "PAID", users[0]),
      settleOrder(o.id, "EXPIRED"),
    ]);
    const v = await db.productVariant.findUniqueOrThrow({
        where: { id: variantId },
      }),
      order = await db.order.findUniqueOrThrow({ where: { id: o.id } });
    expect(order.status).toBe("EXPIRED");
    expect(v.onHand).toBe(10);
    expect(v.reserved).toBe(0);
  });
  it("approval is rechecked from DB at order time", async () => {
    const q = await cartQuote(users[0], true);
    await db.user.update({
      where: { id: users[0] },
      data: { businessStatus: "SUSPENDED" },
    });
    await expect(
      createOrder(users[0], input(quoteFingerprint(q))),
    ).rejects.toThrow("승인");
    await db.user.update({
      where: { id: users[0] },
      data: { businessStatus: "APPROVED" },
    });
  });
});
