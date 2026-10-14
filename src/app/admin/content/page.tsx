import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ActionForm } from "@/components/action-form";
import { Field, Hidden } from "@/components/ui";
export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const s = await searchParams;
  const list = await db.content.findMany({
    where: s.q ? { title: { contains: s.q } } : {},
    orderBy: { kind: "asc" },
  });
  return (
    <>
      <div className="page-heading">
        <h1>배너·공지·가이드·정책</h1>
        <p>정책은 운영 전 검토하고 버전을 갱신해주세요.</p>
      </div>
      <form className="admin-search">
        <input
          name="q"
          aria-label="콘텐츠 검색"
          defaultValue={s.q}
          placeholder="제목 검색"
        />
        <button className="btn">검색</button>
      </form>
      {[null, ...list].map((c) => (
        <details key={c?.id ?? "new"} className="panel">
          <summary>
            <b>{c ? c.kind + " · " + c.title : "새 콘텐츠 등록"}</b>
          </summary>
          <ActionForm op="admin-content">
            <Hidden name="id" value={c?.id ?? ""} />
            <div className="form-grid">
              <Field name="title" label="제목" value={c?.title} />
              <Field name="slug" label="URL slug" value={c?.slug} />
              <label>
                종류
                <select name="kind" defaultValue={c?.kind ?? "NOTICE"}>
                  {["BANNER", "NOTICE", "GUIDE", "POLICY"].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <Field
                name="version"
                label="버전"
                value={c?.version ?? "draft-v1"}
              />
              <Field
                name="href"
                label="배너 링크 (사이트 내부 경로)"
                required={false}
                value={c?.href}
              />
              <label>
                <input
                  name="published"
                  type="checkbox"
                  defaultChecked={c?.published ?? true}
                />
                공개
              </label>
              <label className="wide">
                본문
                <textarea name="body" required defaultValue={c?.body} />
              </label>
            </div>
            <button className="btn">콘텐츠 저장</button>
          </ActionForm>
        </details>
      ))}
    </>
  );
}
