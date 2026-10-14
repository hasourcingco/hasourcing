import Link from "next/link";
import { catalog } from "@/lib/catalog";
import { db } from "@/lib/db";
import { canAccess } from "@/lib/domain";
import { ProductGrid, Empty } from "./ui";
const titles: Record<string, string> = {
  recommended: "김우람 추천",
  "small-lot": "소량 시작",
  bundle: "묶음배송",
  vip: "VIP 전용 상품관",
};
export async function CatalogPage({
  query,
  collection,
}: {
  query: Record<string, string | undefined>;
  collection?: string;
}) {
  const [result, categories, info] = await Promise.all([
    catalog(query, collection),
    db.category.findMany(),
    collection
      ? db.collection.findUnique({ where: { slug: collection } })
      : null,
  ]);
  const allow = canAccess(result.user);
  if (collection === "vip" && !canAccess(result.user, true))
    return (
      <>
        <div className="page-heading">
          <h1>VIP 전용 상품관</h1>
          <p>승인된 VIP 회원을 위한 전용 상품과 공급가</p>
        </div>
        <Empty
          title="VIP 회원 승인 후 이용할 수 있습니다."
          description="현재 회원등급은 마이페이지에서 확인할 수 있습니다."
          href="/account"
          action="회원 상태 확인"
        />
      </>
    );
  const base = collection ? "/collections/" + collection : "/products";
  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v) params.set(k, v);
    params.set("page", String(page));
    return base + "?" + params;
  };
  return (
    <>
      <div className="page-heading">
        <div className="breadcrumbs">홈 / 상품 소싱</div>
        <h1>
          {collection
            ? (info?.name ?? titles[collection] ?? "기획전")
            : query.q
              ? "“" + query.q + "” 검색 결과"
              : "전체상품"}
        </h1>
        <p>
          {info?.description ??
            "개당 공급단가와 최소주문수량을 한눈에 비교하세요."}
        </p>
      </div>
      <div className="catalog-layout">
        <details open className="filters">
          <summary>검색 필터 열기</summary>
          <div className="filter-body">
            <h3>조건으로 찾기</h3>
            <form action={base}>
              <div className="filter-fields">
                <label>
                  상품명·상품번호·키워드
                  <input name="q" defaultValue={query.q ?? ""} />
                </label>
                <label>
                  결과 내 검색
                  <input name="within" defaultValue={query.within ?? ""} />
                </label>
                <label>
                  카테고리
                  <select name="category" defaultValue={query.category ?? ""}>
                    <option value="">전체 카테고리</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  최소주문수량 상한
                  <input
                    name="moq"
                    type="number"
                    min="1"
                    defaultValue={query.moq ?? ""}
                    placeholder="예: 5"
                  />
                </label>
                {allow ? (
                  <>
                    <label>
                      개당 최소 가격
                      <input
                        name="min"
                        type="number"
                        min="0"
                        defaultValue={query.min ?? ""}
                      />
                    </label>
                    <label>
                      개당 최대 가격
                      <input
                        name="max"
                        type="number"
                        min="0"
                        defaultValue={query.max ?? ""}
                      />
                    </label>
                  </>
                ) : (
                  <p className="small muted">
                    가격 필터는 사업자 승인 후 이용할 수 있습니다.
                  </p>
                )}
                <label>
                  정렬
                  <select
                    aria-label="정렬"
                    name="sort"
                    defaultValue={
                      allow
                        ? (query.sort ?? "recommended")
                        : query.sort === "new"
                          ? "new"
                          : "recommended"
                    }
                  >
                    <option value="recommended">추천순</option>
                    <option value="new">신상품순</option>
                    {allow && (
                      <>
                        <option value="low">낮은 단가순</option>
                        <option value="high">높은 단가순</option>
                      </>
                    )}
                  </select>
                </label>
              </div>
              <label>
                <input
                  type="checkbox"
                  name="stock"
                  value="1"
                  defaultChecked={query.stock === "1"}
                />
                재고 있는 상품
              </label>
              <label>
                <input
                  type="checkbox"
                  name="bundle"
                  value="1"
                  defaultChecked={query.bundle === "1"}
                />
                묶음배송
              </label>
              <label>
                <input
                  type="checkbox"
                  name="free"
                  value="1"
                  defaultChecked={query.free === "1"}
                />
                무료배송
              </label>
              <button className="btn navy">필터 적용</button>
              <Link className="btn" href={base}>
                초기화
              </Link>
            </form>
          </div>
        </details>
        <section>
          <div className="results-bar">
            <b>총 {result.total}개 상품</b>
            <span>현재 회원등급 기준 · 페이지당 20개</span>
          </div>
          <div className="filter-chips">
            {Object.entries(query)
              .filter(
                ([k, v]) =>
                  v && k !== "page" && (allow || !["min", "max"].includes(k)),
              )
              .map(([k, v]) => (
                <span className="filter-chip" key={k}>
                  {k}: {v}
                </span>
              ))}
          </div>
          <ProductGrid products={result.products} />
          <nav className="pagination" aria-label="상품 페이지">
            {Array.from({ length: result.pages }, (_, i) => (
              <Link
                key={i}
                className={result.page === i + 1 ? "active" : ""}
                href={pageHref(i + 1)}
              >
                {i + 1}
              </Link>
            ))}
          </nav>
        </section>
      </div>
    </>
  );
}
