import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { label } from "@/lib/format";
import { ActionForm } from "@/components/action-form";
import { Field, Hidden } from "@/components/ui";
export default async function Members({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireAdmin();
  const s = await searchParams;
  const members = await db.user.findMany({
    where: {
      ...(s.q
        ? {
            OR: [
              { name: { contains: s.q } },
              { email: { contains: s.q } },
              { company: { contains: s.q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <div className="page-heading">
        <h1>회원 승인·등급 관리</h1>
        <p>
          사업자번호 형식 검사는 공식 인증이 아닙니다. 승인 전 정보를
          검토해주세요.
        </p>
      </div>
      <form className="admin-search">
        <input
          name="q"
          defaultValue={s.q}
          aria-label="회원 검색"
          placeholder="담당자명, 이메일, 상호"
        />
        <select
          name="status"
          aria-label="사업자 상태 필터"
          defaultValue={s.status ?? ""}
        >
          <option value="">전체 상태</option>
          {["PENDING", "APPROVED", "REJECTED", "SUSPENDED"].map((v) => (
            <option key={v} value={v}>
              {label(v)}
            </option>
          ))}
        </select>
        <button className="btn">검색</button>
      </form>
      {members
        .filter((u) => !s.status || u.businessStatus === s.status)
        .map((u) => (
          <details key={u.id} className="panel">
            <summary>
              <b>
                {u.name} · {u.company}
              </b>{" "}
              <span className="badge">
                {label(u.businessStatus)} · {label(u.memberGrade)}
              </span>
            </summary>
            <p>
              {u.email} · {u.phone} · 사업자번호 {u.businessNumber}
            </p>
            <ActionForm
              op="admin-member"
              confirmMessage="회원 승인·등급·이용 상태를 변경할까요?"
            >
              <Hidden name="id" value={u.id} />
              <div className="form-grid">
                <label>
                  사업자 상태
                  <select name="businessStatus" defaultValue={u.businessStatus}>
                    {["PENDING", "APPROVED", "REJECTED", "SUSPENDED"].map(
                      (s) => (
                        <option key={s} value={s}>
                          {label(s)}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  회원 등급
                  <select name="memberGrade" defaultValue={u.memberGrade}>
                    <option value="STANDARD">일반</option>
                    <option value="VIP">VIP</option>
                  </select>
                </label>
                <label>
                  계정 상태
                  <select name="accountStatus" defaultValue={u.accountStatus}>
                    <option value="ACTIVE">활성</option>
                    <option value="DISABLED">비활성</option>
                  </select>
                </label>
                <Field label="변경 사유" name="reason" />
              </div>
              <button className="btn">회원 상태 저장</button>
            </ActionForm>
          </details>
        ))}
    </>
  );
}
