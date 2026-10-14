import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
export const metadata = {
  title: "운영 관리자",
  robots: { index: false, follow: false },
};
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h2>운영 관리자</h2>
        <nav>
          {[
            ["", "대시보드"],
            ["/products", "상품 · 옵션 · 재고"],
            ["/members", "회원 승인 · 등급"],
            ["/orders", "주문 · 배송"],
            ["/quotes", "견적 · 상품문의"],
            ["/content", "배너 · 공지 · 가이드"],
            ["/settings", "설정 · 배송 · 분류"],
            ["/audit", "변경 이력"],
          ].map(([p, t]) => (
            <Link href={"/admin" + p} key={p}>
              {t}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
