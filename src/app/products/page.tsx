import { publicMetadata } from "@/lib/seo";
import { CatalogPage } from "@/components/catalog-page";
export const metadata = publicMetadata("/products", "전체상품");
export default async function Products({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return <CatalogPage query={await searchParams} />;
}
