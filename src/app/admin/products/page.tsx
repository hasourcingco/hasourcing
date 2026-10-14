import { requireAdmin } from "@/lib/auth";
import Link from "next/link";
import { db } from "@/lib/db";
import { won } from "@/lib/format";
export default async function AdminProducts({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireAdmin();
  const s = await searchParams;
  const products = await db.product.findMany({
    where: {
      ...(s.q
        ? { OR: [{ name: { contains: s.q } }, { code: { contains: s.q } }] }
        : {}),
      ...(s.status ? { status: s.status } : {}),
    },
    include: { category: true, variants: { include: { tiers: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <div className="section-heading">
        <div>
          <h1>상품 관리</h1>
          <p>상품·MOQ·단가·재고를 관리합니다.</p>
        </div>
        <Link className="btn navy" href="/admin/products/new">
          상품 등록
        </Link>
      </div>
      <form className="admin-search">
        <input
          name="q"
          aria-label="상품 검색"
          defaultValue={s.q}
          placeholder="상품명 또는 상품번호"
        />
        <select
          name="status"
          aria-label="상품 상태"
          defaultValue={s.status ?? ""}
        >
          <option value="">전체 상태</option>
          <option value="ACTIVE">판매 중</option>
          <option value="HIDDEN">숨김</option>
          <option value="STOPPED">판매 중지</option>
        </select>
        <button className="btn">검색</button>
      </form>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>상품</th>
              <th>분류</th>
              <th>일반 공급가</th>
              <th>MOQ / 재고</th>
              <th>상태</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <b>{p.name}</b>
                  <p className="code">{p.code}</p>
                </td>
                <td>{p.category.name}</td>
                <td>
                  {p.variants[0]?.tiers[0]
                    ? won(p.variants[0].tiers[0].standard)
                    : "옵션 미등록"}
                </td>
                <td>
                  {p.variants.map((v) => (
                    <p key={v.id}>
                      {v.name} · 최소 {v.moq}개 / 재고 {v.onHand - v.reserved}개
                    </p>
                  ))}
                </td>
                <td>
                  {p.status}
                  {p.vipOnly && " · VIP"}
                </td>
                <td>
                  <Link className="btn small" href={"/admin/products/" + p.id}>
                    편집
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
