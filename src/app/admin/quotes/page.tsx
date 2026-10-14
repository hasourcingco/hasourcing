import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { label, date } from "@/lib/format";
import { ActionForm } from "@/components/action-form";
import { Hidden } from "@/components/ui";
export default async function Quotes({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const [quotes, inquiries] = await Promise.all([
    db.quoteRequest.findMany({
      where: {
        ...(query.q
          ? {
              OR: [
                { message: { contains: query.q } },
                { user: { name: { contains: query.q } } },
              ],
            }
          : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      include: { user: true, items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.inquiry.findMany({
      include: { user: true, product: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return (
    <>
      <div className="page-heading">
        <h1>견적·상품문의</h1>
        <p>답변은 회원 화면에 저장됩니다. 이메일 발송은 미연동입니다.</p>
      </div>
      <form className="admin-search">
        <input
          name="q"
          aria-label="견적 검색"
          defaultValue={query.q}
          placeholder="회원명 또는 요청 내용"
        />
        <select
          name="status"
          aria-label="견적 상태"
          defaultValue={query.status ?? ""}
        >
          <option value="">전체 상태</option>
          {["REQUESTED", "ANSWERED", "CLOSED"].map((v) => (
            <option key={v} value={v}>
              {label(v)}
            </option>
          ))}
        </select>
        <button className="btn">검색</button>
      </form>
      {quotes.map((q) => (
        <div className="panel" key={q.id}>
          <h3>
            {q.user.name} · {label(q.status)}
          </h3>
          <p className="small muted">
            {date(q.createdAt)} · {q.phone}
          </p>
          {q.items.map((i) => (
            <p key={i.id}>
              {i.product.name} · 희망 {i.quantity}개
            </p>
          ))}
          <p className="preformatted">{q.message}</p>
          <ActionForm op="admin-quote">
            <Hidden name="id" value={q.id} />
            <label>
              견적 답변
              <textarea name="reply" defaultValue={q.reply} required />
            </label>
            <label>
              상태
              <select
                name="status"
                defaultValue={q.status === "CLOSED" ? "CLOSED" : "ANSWERED"}
              >
                <option value="ANSWERED">답변 완료</option>
                <option value="CLOSED">상담 종료</option>
              </select>
            </label>
            <button className="btn">답변 저장</button>
          </ActionForm>
        </div>
      ))}
      <h2>상품문의</h2>
      {inquiries.map((i) => (
        <div className="panel" key={i.id}>
          <h3>
            {i.product.name} · {i.user.name}
          </h3>
          <p>{i.question}</p>
          <ActionForm op="admin-inquiry">
            <Hidden name="id" value={i.id} />
            <label>
              답변
              <textarea name="reply" required defaultValue={i.reply} />
            </label>
            <button className="btn">답변 저장</button>
          </ActionForm>
        </div>
      ))}
    </>
  );
}
