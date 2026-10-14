import { describe, it, expect } from "vitest";
import {
  approved,
  canAccess,
  assertPurchase,
  price,
  validateQuantity,
  vat,
  shipping,
  publicPrice,
} from "../src/lib/domain";
const standard = {
  role: "CUSTOMER",
  businessStatus: "APPROVED",
  memberGrade: "STANDARD",
  accountStatus: "ACTIVE",
};
const tiers = [
  { minQty: 5, standard: 980, vip: 900 },
  { minQty: 25, standard: 880, vip: 800 },
];
const a = {
  id: "a",
  name: "A",
  origin: "A",
  mode: "CONDITIONAL",
  fee: 3000,
  freeAbove: 10000,
  leadDays: "2일",
};
describe("B2B purchase rules", () => {
  it("blocks guest and pending price access", () => {
    expect(approved(null)).toBe(false);
    expect(publicPrice(null, false, tiers, 5)).toBeNull();
    expect(
      publicPrice({ ...standard, businessStatus: "PENDING" }, false, tiers, 5),
    ).toBeNull();
  });
  it("requires active business approval", () => {
    expect(() =>
      assertPurchase({ ...standard, accountStatus: "DISABLED" }),
    ).toThrow();
    expect(() =>
      assertPurchase({ ...standard, businessStatus: "SUSPENDED" }),
    ).toThrow();
  });
  it("separates admin role from purchase eligibility", () => {
    expect(
      canAccess({ ...standard, role: "ADMIN", businessStatus: "PENDING" }),
    ).toBe(false);
  });
  it("protects VIP catalogue and price", () => {
    expect(canAccess(standard, true)).toBe(false);
    expect(publicPrice(standard, true, tiers, 5)).toBeNull();
    expect(
      publicPrice({ ...standard, memberGrade: "VIP" }, true, tiers, 5),
    ).toBe(900);
  });
  it("selects quantity boundary and member price", () => {
    expect(price(tiers, 24, "STANDARD")).toBe(980);
    expect(price(tiers, 25, "STANDARD")).toBe(880);
    expect(price(tiers, 25, "VIP")).toBe(800);
  });
  it("rejects missing price band", () => {
    expect(() => price(tiers, 1, "STANDARD")).toThrow();
  });
  it("rejects MOQ, fractional values and wrong increments", () => {
    expect(() => validateQuantity(4, 5, 5, 100)).toThrow("최소");
    expect(() => validateQuantity(6, 5, 5, 100)).toThrow("단위");
    expect(() => validateQuantity(5.5, 5, 5, 100)).toThrow();
  });
  it("rejects insufficient or sold-out stock", () => {
    expect(() => validateQuantity(10, 5, 5, 9)).toThrow("재고");
    expect(() => validateQuantity(5, 5, 5, 0)).toThrow("재고");
  });
  it("accepts MOQ and exact stock", () => {
    expect(() => validateQuantity(10, 5, 5, 10)).not.toThrow();
  });
  it("VAT is included and integer KRW always reconciles", () => {
    for (const amount of [0, 980, 4900, 12345, 100000]) {
      const result = vat(amount);
      expect(result.supply + result.tax).toBe(amount);
      expect(Number.isInteger(result.supply)).toBe(true);
    }
    expect(vat(1100)).toEqual({ supply: 1000, tax: 100 });
  });
  it("combines compatible shipping groups at threshold", () => {
    expect(
      shipping([
        { amount: 5000, group: a },
        { amount: 5000, group: a },
      ])[0].cost,
    ).toBe(0);
    expect(shipping([{ amount: 9999, group: a }])[0].cost).toBe(3000);
  });
  it("charges distinct groups even if origin is same", () => {
    const result = shipping([
      { amount: 4000, group: a },
      { amount: 4000, group: { ...a, id: "b", mode: "FIXED", fee: 3500 } },
    ]);
    expect(result.reduce((n, g) => n + g.cost, 0)).toBe(6500);
  });
  it("supports unconditional free shipping", () => {
    expect(
      shipping([{ amount: 1, group: { ...a, mode: "FREE" } }])[0].cost,
    ).toBe(0);
  });
});
