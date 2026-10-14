import { publicMetadata } from "@/lib/seo";
import { db } from "@/lib/db";
export const metadata = publicMetadata("/help", "고객센터");
export default async function Help() {
  const [notices, settings] = await Promise.all([
    db.content.findMany({
      where: { kind: "NOTICE", published: true },
      orderBy: { createdAt: "desc" },
    }),
    db.siteSetting.findMany(),
  ]);
  const s = Object.fromEntries(settings.map((x) => [x.key, x.value]));
  return (
    <>
      <div className="page-heading">
        <h1>고객센터</h1>
        <p>회원 승인부터 주문·배송·자료 이용까지 확인하세요.</p>
      </div>
      <div className="two-col">
        <div className="panel">
          <h2>자주 묻는 질문</h2>
          <div className="faq">
            {[
              [
                "공급가가 보이지 않아요.",
                "로그인하고 사업자 승인이 완료되어야 공급가를 볼 수 있습니다. 승인 상태는 마이페이지에 표시됩니다.",
              ],
              [
                "서로 다른 옵션의 수량을 합칠 수 있나요?",
                "MOQ와 주문 단위는 SKU별로 적용됩니다. 다른 옵션의 수량을 합해 최소수량을 채울 수 없습니다.",
              ],
              [
                "묶음배송은 어떻게 계산하나요?",
                "같은 배송그룹의 상품은 해당 배송정책으로 합산됩니다. 공급처가 같아도 배송그룹이 다르면 배송비가 별도로 계산됩니다.",
              ],
              [
                "데모 주문에 결제가 발생하나요?",
                "아니요. 데모 환경은 실제 카드정보를 입력하지 않으며 실제 결제와 매출이 발생하지 않습니다.",
              ],
              [
                "구매자료를 받을 수 있나요?",
                "결제 확인된 구매 상품의 자료를 마이페이지에서 받습니다. 승인 상태·주문 소유권·파일별 사용 범위가 적용됩니다.",
              ],
              [
                "사업자번호 인증이 완료되었나요?",
                "입력 형식 검사와 운영자 승인은 공식 사업자 인증이 아닙니다. 공식 인증 서비스는 아직 미연동입니다.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
        <div>
          <div className="panel">
            <h2>공지사항</h2>
            {notices.map((n) => (
              <article id={n.slug} key={n.id}>
                <h3>{n.title}</h3>
                <p className="preformatted">{n.body}</p>
              </article>
            ))}
          </div>
          <div className="panel">
            <h2>운영 연락처</h2>
            <p>{s.supportPhone || "고객센터 연락처 미설정"}</p>
            <p>{s.supportEmail || "이메일 미설정"}</p>
            <p>{s.supportHours || "운영시간 미설정"}</p>
          </div>
        </div>
      </div>
    </>
  );
}
