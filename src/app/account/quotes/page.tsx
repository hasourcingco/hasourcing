import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { label, date } from "@/lib/format";
import { Empty } from "@/components/ui";
export default async function Quotes() {
  const u = await requireUser();
  const list = await db.quoteRequest.findMany({
    where: { userId: u.id },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <div className="page-heading">
        <h1>내 견적 요청</h1>
        <p>
          운영자 답변은 이 화면에서 확인할 수 있습니다. 메일 발송은
          미연동입니다.
        </p>
        <Link className="btn" href="/quotes/new">
          새 견적 요청
        </Link>
      </div>
      {list.length ? (
        list.map((q) => (
          <div className="panel" key={q.id}>
            <span className="badge">{label(q.status)}</span>
            <p className="small muted">{date(q.createdAt)}</p>
            {q.items.map((i) => (
              <h3 key={i.id}>
                {i.product.name} · {i.quantity}개
              </h3>
            ))}
            <p className="preformatted">{q.message}</p>
            <div className="info-strip">
              <b>운영자 답변</b>
              <p className="preformatted">{q.reply || "답변 대기 중입니다."}</p>
            </div>
          </div>
        ))
      ) : (
        <Empty
          title="견적 요청이 없습니다."
          href="/quotes/new"
          action="견적 요청하기"
        />
      )}
    </>
  );
}
