import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { won, date, label } from "@/lib/format";
import { Empty } from "@/components/ui";
export default async function Orders() {
  const u = await requireUser();
  const orders = await db.order.findMany({
    where: { userId: u.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <div className="page-heading">
        <h1>주문 내역</h1>
        <p>주문 시점의 상품·옵션·가격을 확인하세요.</p>
      </div>
      {orders.length ? (
        orders.map((o) => (
          <Link
            className="order-row"
            key={o.id}
            href={"/account/orders/" + o.id}
          >
            <div>
              <b>{o.number}</b>
              <p>
                {o.items[0]?.productName} 외 {o.items.length - 1}개 상품 행 ·{" "}
                {date(o.createdAt)}
              </p>
              <span className="badge">
                {label(o.paymentStatus)} · {label(o.shippingStatus)}{" "}
                {o.isDemo && " · 데모"}
              </span>
            </div>
            <strong>{won(o.total)}</strong>
            <span>상세 보기</span>
          </Link>
        ))
      ) : (
        <Empty title="아직 주문 내역이 없습니다." href="/products" />
      )}
    </>
  );
}
