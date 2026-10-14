import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Field, Hidden } from "@/components/ui";
import { db } from "@/lib/db";
export const metadata = {
  title: "사업자 회원가입",
  robots: { index: false, follow: false },
};
export default async function Signup() {
  const policy = await db.content.findUnique({ where: { slug: "terms" } });
  return (
    <div className="auth-box">
      <h1>사업자 회원가입</h1>
      <p className="small muted">
        가입 → 사업자 정보 검토 → 운영자 승인 → 구매
      </p>
      <ActionForm op="signup">
        <Hidden name="policyVersion" value={policy?.version ?? "draft-v1"} />
        <Field label="담당자명" name="name" />
        <Field label="이메일" name="email" type="email" />
        <label>
          비밀번호 · 10자 이상
          <input
            name="password"
            type="password"
            minLength={10}
            maxLength={128}
            autoComplete="new-password"
            required
          />
        </label>
        <Field label="연락처" name="phone" type="tel" />
        <Field label="상호" name="company" />
        <label>
          사업자등록번호
          <input
            name="businessNumber"
            required
            placeholder="000-00-00000"
            pattern="[0-9]{3}-?[0-9]{2}-?[0-9]{5}"
          />
        </label>
        <p className="small muted">
          형식 확인은 공식 인증이 아닙니다. 운영자가 검토합니다.
        </p>
        <label>
          <input name="agree" type="checkbox" required />
          <Link href="/policies/terms" target="_blank">
            이용약관
          </Link>{" "}
          및{" "}
          <Link href="/policies/privacy" target="_blank">
            개인정보 수집·이용
          </Link>{" "}
          동의 (필수)
        </label>
        <label>
          <input name="marketing" type="checkbox" />
          마케팅 정보 수신 동의 (선택)
        </label>
        <button className="btn primary full">사업자 회원가입</button>
      </ActionForm>
    </div>
  );
}
