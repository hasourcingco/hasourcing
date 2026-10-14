import { canAccess } from "@/lib/domain";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { card, productInclude } from "@/lib/catalog";
import { ProductGrid } from "@/components/ui";
export default async function Wishlist() {
  const u = await requireUser();
  const list = await db.wishlist.findMany({
    where: {
      userId: u.id,
      product: {
        status: "ACTIVE",
        ...(canAccess(u, true) ? {} : { vipOnly: false }),
      },
    },
    include: { product: { include: productInclude } },
  });
  return (
    <>
      <div className="page-heading">
        <h1>관심 상품</h1>
        <p>관심 버튼을 다시 누르면 목록에서 삭제됩니다.</p>
      </div>
      <ProductGrid products={list.map((w) => card(w.product, u))} />
    </>
  );
}
