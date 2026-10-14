import Link from "next/link";
import { requireUser } from "@/lib/auth";
export const metadata = { robots: { index: false, follow: false } };
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return (
    <>
      <nav className="account-nav" aria-label="마이페이지 메뉴">
        {[
          ["", "회원정보"],
          ["/orders", "주문 내역"],
          ["/wishlist", "관심 상품"],
          ["/downloads", "구매자료"],
          ["/quotes", "견적 요청"],
        ].map(([p, t]) => (
          <Link href={"/account" + p} key={p}>
            {t}
          </Link>
        ))}
      </nav>
      {children}
    </>
  );
}
