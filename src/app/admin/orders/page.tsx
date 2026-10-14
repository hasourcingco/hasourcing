import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { date, won, label } from "@/lib/format";
import { ActionForm } from "@/components/action-form";
import { Field, Hidden } from "@/components/ui";
export default async function Orders({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; order?: string; status?: string }>;
}) {
  await requireAdmin();
  const s = await searchParams;
  const orders = await db.order.findMany({
    where: {
      ...(s.order ? { id: s.order } : {}),
      ...(s.q ? { number: { contains: s.q } } : {}),
      ...(s.status ? { status: s.status } : {}),
    },
    include: { user: true, items: true, shipments: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <div className="page-heading">
        <h1>주문·배송 관리</h1>
        <p>결제·주문·배송 상태는 분리 관리합니다.</p>
      </div>
      <form className="admin-search">
        <input
          name="q"
          defaultValue={s.q}
          aria-label="주문번호 검색"
          placeholder="주문번호"
        />
        <select
          name="status"
          defaultValue={s.status ?? ""}
          aria-label="주문 상태"
        >
          <option value="">전체 상태</option>
          {["PENDING", "PAID", "CANCELLED", "EXPIRED"].map((v) => (
            <option key={v} value={v}>
              {label(v)}
            </option>
          ))}
        </select>
        <button className="btn">검색</button>
      </form>
      {orders.map((o) => (
        <details key={o.id} className="panel" open={!!s.order}>
          <summary>
            <b>
              {o.number} · {o.user.name} · {won(o.total)}
            </b>{" "}
            <span className="badge">
              {label(o.paymentStatus)} · {label(o.shippingStatus)}{" "}
              {o.isDemo && " · 데모"}
            </span>
          </summary>
          <p className="small muted">
            {date(o.createdAt)} · 수령인 {o.recipient} · {o.phone}
          </p>
          <p>
            ({o.postcode}) {o.address} {o.detail}
          </p>
          <p>배송 메모: {o.memo}</p>
          <table>
            <thead>
              <tr>
                <th>상품·옵션</th>
                <th>수량</th>
                <th>단가</th>
                <th>금액</th>
              </tr>
            </thead>
            <tbody>
              {o.items.map((i) => (
                <tr key={i.id}>
                  <td>
                    {i.productName} / {i.optionName}
                  </td>
                  <td>{i.quantity}개</td>
                  <td>{won(i.unitPrice)}</td>
                  <td>{won(i.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {o.status === "PENDING" && (
            <ActionForm
              op="admin-cancel"
              confirmMessage="대기 주문을 취소하고 예약 재고를 해제할까요?"
            >
              <Hidden name="orderId" value={o.id} />
              <button className="btn">대기 주문 취소</button>
            </ActionForm>
          )}
          {[...new Set(o.items.map((i) => i.shippingGroupId))].map((id) => {
            const sh = o.shipments.find((s) => s.shippingGroupId === id);
            return (
              <ActionForm key={id} op="admin-shipment">
                <Hidden name="orderId" value={o.id} />
                <Hidden name="shippingGroupId" value={id} />
                <h3>배송그룹 {id}</h3>
                <div className="form-grid">
                  <Field label="택배사" name="carrier" value={sh?.carrier} />
                  <Field
                    label="송장번호"
                    name="trackingNumber"
                    value={sh?.trackingNumber}
                  />
                  <label>
                    배송 상태
                    <select
                      name="status"
                      defaultValue={sh?.status ?? "SHIPPED"}
                    >
                      <option value="SHIPPED">배송 중</option>
                      <option value="DELIVERED">배송 완료</option>
                    </select>
                  </label>
                </div>
                <button className="btn" disabled={o.status !== "PAID"}>
                  송장·배송 저장
                </button>
              </ActionForm>
            );
          })}
          <p className="small muted">
            실결제 환불은 PG 연동 전 제공하지 않습니다.
          </p>
        </details>
      ))}
    </>
  );
}
