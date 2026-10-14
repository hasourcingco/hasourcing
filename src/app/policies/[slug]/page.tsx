import { publicMetadata } from "@/lib/seo";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const slug = (await params).slug;
  const c = await db.content.findFirst({
    where: { slug, kind: "POLICY", published: true },
  });
  return c
    ? publicMetadata("/policies/" + slug, c.title, c.body.slice(0, 150))
    : { title: "페이지 안내", robots: { index: false } };
}
export default async function Policy({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const p = await db.content.findFirst({
    where: { slug: (await params).slug, kind: "POLICY", published: true },
  });
  if (!p) notFound();
  return (
    <>
      <div className="page-heading">
        <h1>{p.title}</h1>
        <p>정책 버전 {p.version}</p>
      </div>
      <div className="info-strip">
        운영 검토용 정책입니다. 실제 운영 전 사업자정보와 적용 조건을 확정해야
        합니다.
      </div>
      <article className="prose">{p.body}</article>
    </>
  );
}
