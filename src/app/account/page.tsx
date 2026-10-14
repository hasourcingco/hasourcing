import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { date, label } from "@/lib/format";
import { ActionForm } from "@/components/action-form";
import { Hidden } from "@/components/ui";
export default async function Account() {
  const u = await requireUser();
  const [orders, wish, quotes, addresses] = await Promise.all([
    db.order.count({ where: { userId: u.id } }),
    db.wishlist.count({ where: { userId: u.id } }),
    db.quoteRequest.count({ where: { userId: u.id } }),
    db.address.findMany({ where: { userId: u.id } }),
  ]);
  return (
    <>
      <div className="page-heading">
        <h1>{u.name}님의 마이페이지</h1>
        <p>
          {u.company} · {u.email}
        </p>
      </div>
      <div className="info-strip">
        <b>
          사업자 {label(u.businessStatus)} · {label(u.memberGrade)}
        </b>
        <p>
          {u.businessStatus === "APPROVED"
            ? "공급가 확인과 구매 기능을 이용할 수 있습니다."
            : "운영자의 사업자 검토가 완료되면 공급가 확인과 구매 기능을 이용할 수 있습니다."}
        </p>
      </div>
      <div className="stat-grid">
        {[
          [orders, "주문 내역", "/account/orders"],
          [wish, "관심 상품", "/account/wishlist"],
          [quotes, "견적 요청", "/account/quotes"],
        ].map(([v, t, h]) => (
          <Link className="stat" href={String(h)} key={String(t)}>
            <small>{t}</small>
            <b>{v}</b>
          </Link>
        ))}
      </div>
      <div className="panel">
        <h2>회원정보</h2>
        <p>
          사업자등록번호: {u.businessNumber || "미등록"} · 형식 확인 및 운영자
          검토
        </p>
        <p>연락처: {u.phone}</p>
        <p>
          약관 동의: {u.policyVersion} ·{" "}
          {u.consentAt ? date(u.consentAt) : "미기록"}
        </p>
        <p className="small muted">
          이메일 인증·비밀번호 재설정은 메일 서비스 미연동입니다.
        </p>
      </div>
      <div className="panel">
        <h2>저장한 배송지</h2>
        {addresses.length ? (
          addresses.map((a) => (
            <div key={a.id}>
              <p>
                {a.recipient} · {a.phone} · ({a.postcode}) {a.address}{" "}
                {a.detail}
              </p>
              <ActionForm op="address-remove">
                <Hidden name="id" value={a.id} />
                <button className="btn small">배송지 삭제</button>
              </ActionForm>
            </div>
          ))
        ) : (
          <p className="muted">주문서에서 배송지를 저장할 수 있습니다.</p>
        )}
      </div>
      {u.role === "ADMIN" && (
        <Link className="btn navy" href="/admin">
          관리자 열기
        </Link>
      )}
    </>
  );
}
