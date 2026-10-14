import "@fontsource/noto-sans-kr/400.css";
import "@fontsource/noto-sans-kr/500.css";
import "@fontsource/noto-sans-kr/700.css";
import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag, Search, Heart, Menu, UserRound } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isDemo, env } from "@/lib/env";
import { Logout } from "@/components/auth-form";
import { label } from "@/lib/format";
import "./globals.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: {
    default: "스타강사 김우람B2B | 실전 상품 소싱",
    template: "%s | 김우람B2B",
  },
  description:
    "온라인 셀러와 사업자를 위한 실전 상품 소싱 플랫폼. 최소주문수량, 묶음배송, VIP 공급가를 명확하게 확인하세요.",
  robots:
    env.APP_ENV === "production"
      ? { index: true, follow: true }
      : { index: false, follow: false },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  const [cart, categories, settings] = await Promise.all([
    user
      ? db.cartItem.aggregate({
          where: { userId: user.id },
          _sum: { quantity: true },
        })
      : null,
    db.category.findMany(),
    db.siteSetting.findMany(),
  ]);
  const s = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  return (
    <html lang="ko">
      <body>
        <a href="#main" className="skip-link">
          본문 바로가기
        </a>
        <div className="announcement">
          {isDemo ? "데모 쇼핑몰 · 실제 결제 없음" : "사업자 승인형 도매몰"}
          <span>사업자 승인 후 공급가 확인과 구매가 가능합니다.</span>
        </div>
        <header>
          <div className="utility wrap">
            <span>온라인 셀러를 위한 실전 소싱 파트너</span>
            <div>
              {user ? (
                <>
                  <Link href="/account">
                    {user.name} · {label(user.memberGrade)}
                  </Link>
                  <Logout />
                  {user.role === "ADMIN" && <Link href="/admin">관리자</Link>}
                </>
              ) : (
                <>
                  <Link href="/auth/login">로그인</Link>
                  <Link href="/auth/signup">사업자 회원가입</Link>
                </>
              )}
              <Link href="/account/orders">주문조회</Link>
              <Link href="/help">고객센터</Link>
            </div>
          </div>
          <div className="main-header wrap">
            <Link href="/" className="wordmark" aria-label="스타강사 김우람B2B">
              <small>스타강사</small>
              <strong>
                김우람<span>B2B</span>
              </strong>
            </Link>
            <form action="/products" className="search">
              <input
                name="q"
                aria-label="상품 검색"
                placeholder="상품명, 상품번호, 키워드 검색"
              />
              <button aria-label="검색">
                <Search size={22} />
              </button>
            </form>
            <div className="header-icons">
              <Link href="/account/wishlist" aria-label="관심 상품">
                <Heart />
                <span>관심 상품</span>
              </Link>
              <Link
                href="/cart"
                aria-label={"장바구니 " + (cart?._sum.quantity ?? 0) + "개"}
              >
                <ShoppingBag />
                <span>장바구니</span>
                <b>{cart?._sum.quantity ?? 0}</b>
              </Link>
              <Link href="/account" aria-label="마이페이지">
                <UserRound />
                <span>마이페이지</span>
              </Link>
            </div>
          </div>
          <nav className="nav wrap" aria-label="주요 메뉴">
            <details className="category-menu">
              <summary>
                <Menu size={19} /> 전체 카테고리
              </summary>
              <div>
                {categories.map((c) => (
                  <Link key={c.id} href={"/products?category=" + c.slug}>
                    {c.name}
                  </Link>
                ))}
              </div>
            </details>
            <Link href="/products">전체상품</Link>
            <Link href="/collections/recommended">김우람 추천</Link>
            <Link href="/collections/small-lot">소량 시작</Link>
            <Link href="/collections/bundle">묶음배송</Link>
            <Link href="/products?sort=new">신상품</Link>
            <Link href="/collections/vip">VIP 전용</Link>
            <Link href="/guides">소싱 가이드</Link>
          </nav>
        </header>
        <main id="main" className="wrap main-content">
          {children}
        </main>
        <footer>
          <div className="wrap">
            <div className="footer-top">
              <div className="wordmark">
                <small>스타강사</small>
                <strong>김우람B2B</strong>
              </div>
              <div>
                <b>내 사업에 맞는 상품, 명확한 도매 조건.</b>
                <p>온라인 셀러와 사업자를 위한 상품 소싱 플랫폼</p>
              </div>
              <Link href="/help">고객센터</Link>
            </div>
            <div className="footer-links">
              {[
                ["terms", "이용약관"],
                ["privacy", "개인정보처리방침"],
                ["shipping", "배송 안내"],
                ["returns", "교환·반품"],
                ["assets", "자료 이용 범위"],
              ].map(([slug, title]) => (
                <Link key={slug} href={"/policies/" + slug}>
                  {title}
                </Link>
              ))}
            </div>
            <p className="small muted">
              {s.legalName
                ? "사업자명: " + s.legalName
                : "법적 사업자정보 미설정" +
                  (isDemo ? " · 데모 환경" : "")}{" "}
              {s.representative && " | 대표자: " + s.representative}{" "}
              {s.businessNumber && " | 사업자등록번호: " + s.businessNumber}
            </p>
            {s.address && <p className="small muted">{s.address}</p>}
            <p className="small muted">
              {s.supportPhone || "고객센터 연락처 설정 전"} {s.supportEmail}{" "}
              {s.supportHours}
            </p>
            <p className="small muted">
              © 김우람B2B. 상품 이미지와 자료의 이용 범위는 개별 안내를
              확인해주세요.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
