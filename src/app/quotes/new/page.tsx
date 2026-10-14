import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccess } from "@/lib/domain";
import { ActionForm } from "@/components/action-form";
import { Empty, Field } from "@/components/ui";
export default async function Quote({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const u = await requireUser();
  if (!canAccess(u))
    return (
      <Empty
        title="사업자 승인 후 견적을 요청할 수 있습니다."
        href="/account"
        action="회원 상태 확인"
      />
    );
  const query = await searchParams;
  const products = await db.product.findMany({
    where: {
      status: "ACTIVE",
      ...(u.memberGrade === "VIP" ? {} : { vipOnly: false }),
    },
  });
  return (
    <div className="auth-box">
      <h1>대량구매 견적 요청</h1>
      <p className="small muted">
        요청은 DB에 저장되며 마이페이지에서 답변을 확인할 수 있습니다.
      </p>
      <ActionForm op="quote">
        <label>
          상품
          <select name="productId" defaultValue={query.product} required>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </label>
        <Field label="희망 수량" name="quantity" type="number" value={100} />
        <Field label="연락처" name="phone" type="tel" value={u.phone} />
        <label>
          요청 사항
          <textarea name="message" required maxLength={3000} />
        </label>
        <label>
          <input type="checkbox" name="agree" required />
          견적 상담을 위한 개인정보 이용에 동의합니다. (필수)
        </label>
        <button className="btn primary full">견적 요청 접수</button>
      </ActionForm>
    </div>
  );
}
