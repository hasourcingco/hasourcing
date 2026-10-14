import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { date } from "@/lib/format";
export default async function Audit() {
  await requireAdmin();
  const logs = await db.auditLog.findMany({
    include: { actor: true },
    take: 200,
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <div className="page-heading">
        <h1>관리자 변경 이력</h1>
        <p>최근 200개의 상품·가격·재고·회원·배송 변경</p>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>일시</th>
              <th>운영자</th>
              <th>작업</th>
              <th>대상·상세</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{date(l.createdAt)}</td>
                <td>{l.actor.name}</td>
                <td>{l.action}</td>
                <td>
                  {l.target}
                  <details>
                    <summary>상세 보기</summary>
                    <pre className="preformatted">
                      {JSON.stringify(l.detail, null, 2)}
                    </pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
