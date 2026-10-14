export type Member = {
  role: string;
  businessStatus: string;
  memberGrade: string;
  accountStatus: string;
} | null;
export type Tier = { minQty: number; standard: number; vip: number };
export function approved(u: Member) {
  return !!u && u.accountStatus === "ACTIVE" && u.businessStatus === "APPROVED";
}
export function canAccess(u: Member, vipOnly = false) {
  return approved(u) && (!vipOnly || u!.memberGrade === "VIP");
}
export function assertPurchase(u: Member, vipOnly = false) {
  if (!approved(u)) throw new Error("사업자 승인 후 구매할 수 있습니다.");
  if (vipOnly && u!.memberGrade !== "VIP")
    throw new Error("VIP 회원 전용 상품입니다.");
}
export function price(tiers: Tier[], qty: number, grade: string) {
  const t = [...tiers]
    .sort((a, b) => b.minQty - a.minQty)
    .find((t) => qty >= t.minQty);
  if (!t) throw new Error("적용 가능한 가격 구간이 없습니다.");
  return grade === "VIP" ? t.vip : t.standard;
}
export function validateQuantity(
  qty: number,
  moq: number,
  step: number,
  available: number,
) {
  if (!Number.isSafeInteger(qty) || qty < moq)
    throw new Error("최소 " + moq + "개 이상 주문해주세요.");
  if (qty % step !== 0) throw new Error(step + "개 단위로 주문해주세요.");
  if (qty > available)
    throw new Error("주문 가능 재고는 " + available + "개입니다.");
}
export function vat(amount: number) {
  if (!Number.isSafeInteger(amount) || amount < 0)
    throw new Error("금액이 올바르지 않습니다.");
  const supply = Math.round(amount / 1.1);
  return { supply, tax: amount - supply };
}
export type Ship = {
  id: string;
  name: string;
  origin: string;
  mode: string;
  fee: number;
  freeAbove: number | null;
  leadDays: string;
};
export function shipping(lines: { amount: number; group: Ship }[]) {
  const groups = new Map<string, { group: Ship; amount: number }>();
  for (const l of lines) {
    const old = groups.get(l.group.id);
    groups.set(l.group.id, {
      group: l.group,
      amount: l.amount + (old?.amount ?? 0),
    });
  }
  return [...groups.values()].map(({ group, amount }) => ({
    ...group,
    subtotal: amount,
    cost:
      group.mode === "FREE" ||
      (group.mode === "CONDITIONAL" &&
        group.freeAbove !== null &&
        amount >= group.freeAbove)
        ? 0
        : group.fee,
  }));
}
export function publicPrice(
  u: Member,
  vipOnly: boolean,
  tiers: Tier[],
  moq: number,
) {
  return canAccess(u, vipOnly) ? price(tiers, moq, u!.memberGrade) : null;
}
