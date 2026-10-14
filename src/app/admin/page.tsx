import { requireAdmin } from "@/lib/auth";
import Link from "next/link";
import { db } from "@/lib/db";
import { won, date, label } from "@/lib/format";
export default async function Dashboard() {
  await requireAdmin();
  const [products, pending, orders, quotes, revenue, list] = await Promise.all([
    db.product.count(),
    db.user.count({ where: { businessStatus: "PENDING" } }),
    db.order.count(),
    db.quoteRequest.count({ where: { status: "REQUESTED" } }),
    db.order.aggregate({
      where: { isDemo: false, paymentStatus: "PAID" },
      _sum: { total: true },
    }),
    db.order.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { user: true },
    }),
  ]);
  return (
    <>
      <div className="page-heading">
        <h1>운영 대시보드</h1>
        <p>실제 DB 데이터로 확인하는 운영 현황</p>
      </div>
      <div className="stat-grid">
        {[
          [products, "등록 상품", "/admin/products"],
          [pending, "사업자 승인 대기", "/admin/members"],
          [orders, "전체 주문 · 데모 포함", "/admin/orders"],
          [quotes, "미답변 견적", "/admin/quotes"],
        ].map(([v, t, h]) => (
          <Link href={String(h)} className="stat" key={String(t)}>
            <small>{t}</small>
            <b>{v}</b>
          </Link>
        ))}
        <div className="stat">
          <small>실결제 매출 · 데모 제외</small>
          <b>{won(revenue._sum.total ?? 0)}</b>
        </div>
      </div>
      <div className="panel">
        <h2>최근 주문</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>주문번호</th>
                <th>회원</th>
                <th>금액</th>
                <th>상태</th>
                <th>일시</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={"/admin/orders?order=" + o.id}>{o.number}</Link>
                    {o.isDemo && <span className="badge">데모</span>}
                  </td>
                  <td>{o.user.name}</td>
                  <td>{won(o.total)}</td>
                  <td>{label(o.status)}</td>
                  <td>{date(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="info-strip">
        데모 주문은 실결제 매출에서 제외됩니다. 운영 전 사업자정보·정책·PG 연동
        설정을 확인해주세요.
      </div>
    </>
  );
}
