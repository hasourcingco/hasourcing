import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ActionForm } from "@/components/action-form";
import { Field, Hidden } from "@/components/ui";
export default async function Settings() {
  await requireAdmin();
  const [list, groups, categories, collections] = await Promise.all([
    db.siteSetting.findMany(),
    db.shippingGroup.findMany(),
    db.category.findMany(),
    db.collection.findMany(),
  ]);
  const values = Object.fromEntries(list.map((x) => [x.key, x.value]));
  return (
    <>
      <div className="page-heading">
        <h1>운영 설정</h1>
        <p>
          브랜드명과 법적 사업자정보는 별도입니다. 확인된 정보만 입력해주세요.
        </p>
      </div>
      <details className="panel" open>
        <summary>
          <b>사업자정보·연락처</b>
        </summary>
        {[
          ["legalName", "법적 사업자명"],
          ["representative", "대표자"],
          ["businessNumber", "사업자등록번호"],
          ["commerceNumber", "통신판매업 신고번호"],
          ["address", "사업장 주소"],
          ["supportEmail", "고객센터 이메일"],
          ["supportPhone", "고객센터 연락처"],
          ["supportHours", "운영시간"],
          ["privacyOfficer", "개인정보 담당자"],
        ].map(([key, title]) => (
          <ActionForm key={key} op="admin-setting">
            <Hidden name="key" value={key} />
            <Field
              name="value"
              label={title}
              value={values[key] ?? ""}
              required={false}
            />
            <button className="btn small">저장</button>
          </ActionForm>
        ))}
      </details>
      <h2>출고지·배송그룹·배송정책</h2>
      {[...groups, null].map((g) => (
        <details key={g?.id ?? "new"} className="panel">
          <summary>
            <b>{g?.name ?? "배송그룹 추가"}</b>
          </summary>
          <ActionForm op="admin-shipping">
            <Hidden name="id" value={g?.id ?? ""} />
            <div className="form-grid">
              <Field label="배송그룹 이름" name="name" value={g?.name} />
              <Field label="출고지" name="origin" value={g?.origin} />
              <Field
                label="정액 배송비"
                name="fee"
                type="number"
                value={g?.fee ?? 3000}
              />
              <Field
                label="무료배송 기준금액"
                name="freeAbove"
                type="number"
                value={g?.freeAbove ?? ""}
                required={false}
              />
              <label>
                정책
                <select name="mode" defaultValue={g?.mode ?? "CONDITIONAL"}>
                  <option value="FIXED">정액</option>
                  <option value="CONDITIONAL">조건부 무료</option>
                  <option value="FREE">무료배송</option>
                </select>
              </label>
              <Field
                label="출고 예상 기간"
                name="leadDays"
                value={g?.leadDays ?? "2~3 영업일"}
              />
            </div>
            <button className="btn">배송그룹 저장</button>
          </ActionForm>
        </details>
      ))}
      <h2>카테고리·기획전</h2>
      {(["category", "collection"] as const).map((type) => (
        <div key={type}>
          {[...(type === "category" ? categories : collections), null].map(
            (c) => (
              <details key={c?.id ?? "new"} className="panel">
                <summary>
                  <b>
                    {c?.name ??
                      (type === "category" ? "카테고리 추가" : "기획전 추가")}
                  </b>
                </summary>
                <ActionForm op="admin-taxonomy">
                  <Hidden name="type" value={type} />
                  <Hidden name="id" value={c?.id ?? ""} />
                  <Field name="name" label="이름" value={c?.name} />
                  <Field name="slug" label="URL slug" value={c?.slug} />
                  {type === "collection" && (
                    <label>
                      기획전 설명
                      <textarea
                        name="description"
                        defaultValue={
                          c && "description" in c ? String(c.description) : ""
                        }
                      />
                    </label>
                  )}
                  <button className="btn">저장</button>
                </ActionForm>
              </details>
            ),
          )}
        </div>
      ))}
    </>
  );
}
