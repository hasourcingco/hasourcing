import { publicMetadata } from "@/lib/seo";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const slug = (await params).slug;
  const c = await db.content.findFirst({
    where: { slug, kind: "GUIDE", published: true },
  });
  return c
    ? publicMetadata("/guides/" + slug, c.title, c.body.slice(0, 150))
    : { title: "페이지 안내", robots: { index: false } };
}
export default async function Guide({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const c = await db.content.findFirst({
    where: { slug: (await params).slug, kind: "GUIDE", published: true },
  });
  if (!c) notFound();
  return (
    <>
      <div className="page-heading">
        <h1>{c.title}</h1>
      </div>
      <article className="prose">{c.body}</article>
      <Link className="btn" href="/guides">
        다른 가이드 보기
      </Link>
    </>
  );
}
