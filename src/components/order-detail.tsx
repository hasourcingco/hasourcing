import Link from "next/link";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { won, date, label } from "@/lib/format";
import { ActionForm } from "./action-form";
import { Hidden } from "./ui";
export async function OrderDetail({
  id,
  userId,
  complete = false,
}: {
  id: string;
  userId: string;
  complete?: boolean;
}) {
  const o = await db.order.findFirst({
    where: { id, userId },
    include: { items: true, shipments: true },
  });
  if (!o) notFound();
  return (
    <>
      <div className="page-heading">
        <h1>{complete ? "주문이 완료되었습니다." : "주문 상세"}</h1>
        <p>
          {o.number} · {date(o.createdAt)}
        </p>
      </div>
      {o.isDemo && (
        <div className="info-strip">
          데모 주문입니다. 실제 결제가 발생하지 않았습니다.
        </div>
      )}
      <div className="split">
        <section>
          <div className="panel">
            <h2>상품 내역</h2>
            {o.items.map((i) => (
              <div className="order-row" key={i.id}>
                <div>
                  <b>{i.productName}</b>
                  <p>
                    {i.optionName} · {i.quantity}개 · 개당 {won(i.unitPrice)}
                  </p>
                </div>
                <strong>{won(i.amount)}</strong>
              </div>
            ))}
            <ActionForm op="reorder">
              <Hidden name="orderId" value={o.id} />
              <button className="btn">현재 조건으로 재구매</button>
            </ActionForm>
            <p className="small muted">
              현재 가격·MOQ·재고를 다시 확인하여 장바구니에 담습니다.
            </p>
          </div>
          <div className="panel">
            <h2>수령인과 배송</h2>
            <p>
              {o.recipient} · {o.phone}
            </p>
            <p>
              ({o.postcode}) {o.address} {o.detail}
            </p>
            <p>배송 메모: {o.memo || "없음"}</p>
            <p>배송 상태: {label(o.shippingStatus)}</p>
            {o.shipments.map((s) => (
              <p key={s.id}>
                {s.carrier} · {s.trackingNumber} · {label(s.status)}
              </p>
            ))}
          </div>
        </section>
        <aside>
          <div className="panel">
            <h2>주문·결제 상태</h2>
            <p>주문: {label(o.status)}</p>
            <p>결제: {label(o.paymentStatus)}</p>
            <div className="summary">
              <p>
                <span>상품금액</span>
                <b>{won(o.subtotal)}</b>
              </p>
              <p>
                <span>배송비</span>
                <b>{won(o.shipping)}</b>
              </p>
              <p>
                <span>포함 VAT</span>
                <b>{won(o.tax)}</b>
              </p>
              <p className="total">
                <span>합계</span>
                <b>{won(o.total)}</b>
              </p>
            </div>
            {o.status === "PENDING" && (
              <ActionForm
                op="cancel-order"
                confirmMessage="대기 주문을 취소하고 예약 재고를 해제할까요?"
              >
                <Hidden name="orderId" value={o.id} />
                <button className="btn">주문 취소</button>
              </ActionForm>
            )}
            <Link href="/account/downloads" className="btn full">
              구매 상품자료 확인
            </Link>
            <Link href="/account/orders" className="btn full">
              주문 내역
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
