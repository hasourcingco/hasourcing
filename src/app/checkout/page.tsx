import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/auth";
import { cartQuote, quoteFingerprint } from "@/lib/orders";
import { db } from "@/lib/db";
import { isDemo } from "@/lib/env";
import { won } from "@/lib/format";
import { CheckoutForm } from "@/components/checkout-form";
import { Empty } from "@/components/ui";
export const metadata = {
  title: "주문서",
  robots: { index: false, follow: false },
};
export default async function Checkout() {
  const u = await requireUser();
  let q;
  try {
    q = await cartQuote(u.id, true);
  } catch (e) {
    return (
      <Empty
        title="주문 조건을 다시 확인해주세요."
        description={
          e instanceof Error ? e.message : "구매 권한을 확인해주세요."
        }
        href="/cart"
        action="장바구니 확인"
      />
    );
  }
  if (!q.lines.length)
    return (
      <Empty
        title="선택한 상품이 없습니다."
        href="/cart"
        action="장바구니로 이동"
      />
    );
  const [addresses, policy] = await Promise.all([
    db.address.findMany({ where: { userId: u.id } }),
    db.content.findUnique({ where: { slug: "terms" } }),
  ]);
  return (
    <>
      <div className="page-heading">
        <h1>주문서</h1>
        <p>
          주문자: {u.name} · {u.company} · {u.email}
        </p>
      </div>
      <div className="split">
        <div className="panel">
          <CheckoutForm
            token={randomUUID()}
            fingerprint={quoteFingerprint(q)}
            policyVersion={policy?.version ?? "draft-v1"}
            addresses={addresses}
            demo={isDemo}
            phone={u.phone}
          />
        </div>
        <aside className="panel">
          <h2>주문 상품 · 최종 금액</h2>
          {q.lines.map((l) => (
            <div key={l.id}>
              <b>{l.variant.product.name}</b>
              <p className="small muted">
                {l.variant.name} · {l.quantity}개 · 개당 {won(l.unitPrice)}
              </p>
              <p>{won(l.amount)}</p>
            </div>
          ))}
          <div className="summary">
            <p>
              <span>상품금액</span>
              <b>{won(q.subtotal)}</b>
            </p>
            {q.groups.map((g) => (
              <p key={g.id}>
                <span>{g.name} 배송비</span>
                <b>{won(g.cost)}</b>
              </p>
            ))}
            <p>
              <span>공급가액</span>
              <span>{won(q.supply)}</span>
            </p>
            <p>
              <span>포함된 VAT</span>
              <span>{won(q.tax)}</span>
            </p>
            <p className="total">
              <span>최종 금액</span>
              <b>{won(q.total)}</b>
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
