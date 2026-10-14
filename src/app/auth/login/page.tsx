import Link from "next/link";
import { LoginForm } from "@/components/auth-form";
import { isDemo } from "@/lib/env";
export const metadata = {
  title: "로그인",
  robots: { index: false, follow: false },
};
export default function Login() {
  return (
    <div className="auth-box">
      <div className="eyebrow">BUSINESS MEMBERS</div>
      <h1>사업자 회원 로그인</h1>
      <p className="muted small">
        승인된 회원에게 공급가와 구매 기능이 제공됩니다.
      </p>
      <LoginForm demo={isDemo} />
      <p className="small">
        처음 방문하셨나요?{" "}
        <Link href="/auth/signup">
          <b>사업자 회원가입</b>
        </Link>
      </p>
      <p className="small muted">
        이메일 인증·비밀번호 재설정: 메일 서비스 미연동
      </p>
      {isDemo && (
        <div className="demo-accounts">
          <b>로컬 데모 계정</b>
          <code>일반: standard@demo.local</code>
          <code>VIP: vip@demo.local</code>
          <code>승인대기: pending@demo.local</code>
          <code>관리자: admin@demo.local</code>
          <p>공통 비밀번호: DemoOnly!2026</p>
          <p>운영 환경에서는 데모 계정을 사용할 수 없습니다.</p>
        </div>
      )}
    </div>
  );
}
