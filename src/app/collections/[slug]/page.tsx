import { publicMetadata } from "@/lib/seo";
import { db } from "@/lib/db";
import { CatalogPage } from "@/components/catalog-page";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const slug = (await params).slug;
  if (slug === "vip")
    return { title: "VIP 전용", robots: { index: false, follow: false } };
  const c = await db.collection.findUnique({ where: { slug } });
  return publicMetadata("/collections/" + slug, c?.name ?? "상품 기획전");
}
export default async function Collection({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return (
    <CatalogPage query={await searchParams} collection={(await params).slug} />
  );
}
