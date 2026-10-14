import { publicMetadata, jsonLd } from "@/lib/seo";
import { env } from "@/lib/env";
import { ProductImage } from "@/components/product-image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { productInclude } from "@/lib/catalog";
import { canAccess, publicPrice } from "@/lib/domain";
import { won } from "@/lib/format";
import { PurchasePanel } from "@/components/purchase-panel";
import { ActionForm } from "@/components/action-form";
import { Hidden } from "@/components/ui";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const p = await db.product.findUnique({
    where: { slug: (await params).slug },
    select: { name: true, vipOnly: true, status: true },
  });
  return p && !p.vipOnly && p.status === "ACTIVE"
    ? publicMetadata("/products/" + (await params).slug, p.name)
    : { title: "상품 상세", robots: { index: false, follow: false } };
}
export default async function ProductDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const p = await db.product.findUnique({
    where: { slug: (await params).slug },
    include: productInclude,
  });
  const u = await currentUser();
  if (
    !p ||
    p.status !== "ACTIVE" ||
    !p.variants.some((v) => v.tiers.length > 0) ||
    (p.vipOnly && !canAccess(u, true))
  )
    notFound();
  const can = canAccess(u, p.vipOnly),
    v = p.variants[0],
    unit = v ? publicPrice(u, p.vipOnly, v.tiers, v.moq) : null;
  const inquiries = await db.inquiry.findMany({
    where: { productId: p.id, ...(u ? { userId: u.id } : { id: "none" }) },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      {!p.vipOnly && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              "@context": "https://schema.org",
              "@type": "Product",
              name: p.name,
              sku: p.code,
              description: p.description,
              image: new URL(p.image, env.SITE_URL).href,
              url: new URL("/products/" + p.slug, env.SITE_URL).href,
            }),
          }}
        />
      )}
      <div className="breadcrumbs">
        <Link href="/products">전체상품</Link> / {p.category.name} / {p.code}
      </div>
      <div className="detail-layout">
        <div>
          <div className="detail-image">
            <ProductImage src={p.image} alt={p.name} />
          </div>
          {p.image.startsWith("/images/") && (
            <p className="muted small">
              직접 제작한 예시 이미지입니다. 실제 상품 사진이 아닙니다.
            </p>
          )}
        </div>
        <section className="detail-panel">
          <div className="badges">
            {p.recommended && <span className="badge">김우람 추천</span>}
            {p.vipOnly && <span className="badge vip">VIP 전용</span>}
          </div>
          <h1>{p.name}</h1>
          <p className="code">상품번호 {p.code}</p>
          {unit !== null ? (
            <p className="price">
              개당 {won(unit)} <small>VAT 포함</small>
            </p>
          ) : (
            <div className="info-strip">
              사업자 승인 후 공급가 확인과 구매가 가능합니다.{" "}
              <Link href="/auth/login">로그인</Link>
            </div>
          )}
          {p.recommendation && (
            <div className="info-strip">
              <b>김우람 추천 이유</b>
              <p>{p.recommendation}</p>
            </div>
          )}
          <p className="small muted">
            {p.shippingGroup.name} · {p.shippingGroup.leadDays} 내 출고 예정
            <br />
            원산지: {p.origin}
          </p>
          {can ? (
            <PurchasePanel
              variants={p.variants.map((v) => ({
                id: v.id,
                name: v.name,
                moq: v.moq,
                step: v.step,
                available: v.onHand - v.reserved,
                tiers: v.tiers.map((t) => ({
                  minQty: t.minQty,
                  standard: u!.memberGrade === "VIP" ? t.vip : t.standard,
                  vip: u!.memberGrade === "VIP" ? t.vip : t.standard,
                })),
              }))}
              grade={u!.memberGrade}
              group={p.shippingGroup}
            />
          ) : (
            <div className="conditions">
              {p.variants.map((v) => (
                <span key={v.id}>
                  {v.name}
                  <b>
                    MOQ {v.moq}개 · 재고 {v.onHand - v.reserved}개
                  </b>
                </span>
              ))}
            </div>
          )}
          <div className="actions">
            <Link className="btn full" href={"/quotes/new?product=" + p.id}>
              대량구매 견적 요청
            </Link>
            <ActionForm op="wishlist">
              <Hidden name="productId" value={p.id} />
              <button className="btn">관심 상품 저장</button>
            </ActionForm>
          </div>
        </section>
      </div>
      <nav className="content-tabs">
        <a href="#info">상품정보</a>
        <a href="#points">판매 포인트</a>
        <a href="#inquiry">문의</a>
        <Link href="/policies/shipping">배송·교환 안내</Link>
      </nav>
      <section id="info" className="prose">
        <h2>상품정보</h2>
        {p.description}
      </section>
      <section id="points" className="prose">
        <h2>판매 포인트</h2>
        {p.sellingPoints}
        <h3>상품자료 이용 범위</h3>
        {p.assets.map((a) => (
          <p key={a.id}>
            {a.name} — {a.usageScope}
          </p>
        ))}
      </section>
      <section id="inquiry" className="panel">
        <h2>내 상품 문의</h2>
        {u ? (
          <ActionForm op="inquiry">
            <Hidden name="productId" value={p.id} />
            <label>
              문의 내용
              <textarea name="question" required maxLength={1500} />
            </label>
            <button className="btn">문의 등록</button>
          </ActionForm>
        ) : (
          <Link className="btn" href="/auth/login">
            로그인 후 문의하기
          </Link>
        )}
        {inquiries.map((i) => (
          <div className="info-strip" key={i.id}>
            <p>{i.question}</p>
            <p>답변: {i.reply || "운영자 답변 대기"}</p>
          </div>
        ))}
      </section>
    </>
  );
}
