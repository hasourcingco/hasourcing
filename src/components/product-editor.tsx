import { TierEditor } from "./tier-editor";
import { db } from "@/lib/db";
import { productInclude } from "@/lib/catalog";
import type { ProductFull } from "@/lib/catalog";
import { ActionForm } from "./action-form";
import { Field, Hidden } from "./ui";
export async function ProductEditor({
  product: p,
}: {
  product: ProductFull | null;
}) {
  const [categories, groups, collections] = await Promise.all([
    db.category.findMany(),
    db.shippingGroup.findMany(),
    db.collection.findMany(),
  ]);
  return (
    <>
      <h1>{p ? "상품 편집" : "상품 등록"}</h1>
      <p className="muted">
        기본정보 저장 후 옵션·가격·재고와 구매자료를 등록합니다.
      </p>
      <div className="panel">
        <ActionForm
          op="admin-product"
          confirmMessage="상품 정보를 저장할까요? 판매 중지와 VIP 변경은 구매 가능 여부에 영향을 줍니다."
        >
          <Hidden name="id" value={p?.id ?? ""} />
          <div className="form-grid">
            <Field label="상품명" name="name" value={p?.name} />
            <Field label="상품번호 (고유)" name="code" value={p?.code} />
            <Field label="상품 URL slug" name="slug" value={p?.slug} />
            <Field
              label="원산지·확인 상태"
              name="origin"
              value={p?.origin ?? "확인 필요"}
            />
            <label>
              카테고리
              <select name="categoryId" defaultValue={p?.categoryId}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              배송그룹
              <select name="shippingGroupId" defaultValue={p?.shippingGroupId}>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              노출·판매 상태
              <select name="status" defaultValue={p?.status ?? "HIDDEN"}>
                <option value="ACTIVE">판매 중</option>
                <option value="HIDDEN">숨김</option>
                <option value="STOPPED">판매 중지</option>
              </select>
            </label>
            <Field
              label="태그 (쉼표 구분)"
              name="tags"
              value={p?.tags.join(",")}
              required={false}
            />
            <label className="wide">
              상품 설명
              <textarea
                name="description"
                required
                defaultValue={p?.description}
              />
            </label>
            <label className="wide">
              판매 포인트
              <textarea
                name="sellingPoints"
                required
                defaultValue={p?.sellingPoints}
              />
            </label>
            <label className="wide">
              추천 이유
              <textarea
                name="recommendation"
                defaultValue={p?.recommendation}
              />
            </label>
            <label>
              <input
                name="recommended"
                type="checkbox"
                defaultChecked={p?.recommended}
              />
              김우람 추천 상품
            </label>
            <label>
              <input
                name="vipOnly"
                type="checkbox"
                defaultChecked={p?.vipOnly}
              />
              VIP 전용 상품
            </label>
            <div className="wide">
              <b>기획전</b>
              {collections.map((c) => (
                <label key={c.id}>
                  <input
                    name="collectionId"
                    value={c.id}
                    type="checkbox"
                    defaultChecked={p?.collections.some((x) => x.id === c.id)}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </div>
          <button className="btn navy">상품 정보 저장</button>
        </ActionForm>
      </div>
      {p && (
        <>
          <h2>옵션·MOQ·가격·재고</h2>
          {[...p.variants, null].map((v, i) => (
            <details className="panel" key={v?.id ?? "new"} open={i === 0}>
              <summary>
                <b>{v ? v.name + " · SKU " + v.sku : "새 옵션 추가"}</b>
              </summary>
              <ActionForm
                op="admin-variant"
                confirmMessage="MOQ·가격·재고 변경을 저장할까요?"
              >
                <Hidden name="id" value={v?.id ?? ""} />
                <Hidden name="productId" value={p.id} />
                <div className="form-grid">
                  <Field label="SKU (고유)" name="sku" value={v?.sku} />
                  <Field label="옵션명" name="name" value={v?.name} />
                  <Field
                    label="MOQ"
                    name="moq"
                    type="number"
                    value={v?.moq ?? 1}
                  />
                  <Field
                    label="주문 단위"
                    name="step"
                    type="number"
                    value={v?.step ?? 1}
                  />
                  <Field
                    label="보유 재고 (예약 재고 포함)"
                    name="onHand"
                    type="number"
                    value={v?.onHand ?? 0}
                  />
                  <Field label="변경·재고 조정 사유" name="reason" />
                  <TierEditor
                    initial={
                      v?.tiers.map((t) => ({
                        minQty: t.minQty,
                        standard: t.standard,
                        vip: t.vip,
                      })) ?? [{ minQty: 1, standard: 1000, vip: 900 }]
                    }
                  />
                </div>
                <p className="small muted">
                  현재 예약 재고 {v?.reserved ?? 0}개. MOQ에서 시작하는 중복
                  없는 가격 구간을 입력하세요.
                </p>
                <button className="btn">옵션·가격·재고 저장</button>
              </ActionForm>
            </details>
          ))}
          <div className="panel">
            <h2>상품 이미지</h2>
            <ActionForm op="admin-image">
              <Hidden name="productId" value={p.id} />
              <label>
                상품 사진 · PNG / JPEG, 최대 10MB
                <input
                  type="file"
                  name="file"
                  accept=".png,.jpg,.jpeg"
                  required
                />
              </label>
              <button className="btn">상품 이미지 저장</button>
            </ActionForm>
            <h2>비공개 구매자료 업로드</h2>
            <ActionForm op="admin-asset">
              <Hidden name="productId" value={p.id} />
              <label>
                파일 · PNG / JPEG / PDF, 최대 10MB
                <input
                  type="file"
                  name="file"
                  accept=".png,.jpg,.jpeg,.pdf"
                  required
                />
              </label>
              <label>
                사용 허용 범위
                <textarea name="usageScope" required />
              </label>
              <button className="btn">구매자료 등록</button>
            </ActionForm>
            {p.assets.map((a) => (
              <p key={a.id}>
                {a.name} · {a.usageScope}
              </p>
            ))}
          </div>
        </>
      )}
    </>
  );
}
export async function loadProduct(id: string) {
  return db.product.findUnique({ where: { id }, include: productInclude });
}
