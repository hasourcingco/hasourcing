import { requireAdmin } from "@/lib/auth";
import { notFound } from "next/navigation";
import { ProductEditor, loadProduct } from "@/components/product-editor";
export default async function Edit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const id = (await params).id;
  const p = id === "new" ? null : await loadProduct(id);
  if (id !== "new" && !p) notFound();
  return <ProductEditor product={p} />;
}
