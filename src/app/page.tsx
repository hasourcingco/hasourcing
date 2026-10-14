import { publicMetadata } from "@/lib/seo";
import Image from "next/image";
import Link from "next/link";
import {
  PackageCheck,
  Layers,
  Star,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import { catalog } from "@/lib/catalog";
import { db } from "@/lib/db";
import { ProductGrid, SectionTitle } from "@/components/ui";
export const metadata = publicMetadata(
  "/",
  "스타강사 김우람B2B | 실전 상품 소싱",
);
export default async function Home() {
  const [recommended, small, bundle, fresh, guides, notices, hero] =
    await Promise.all([
      catalog({}, "recommended"),
      catalog({}, "small-lot"),
      catalog({}, "bundle"),
      catalog({ sort: "new" }),
      db.content.findMany({
        where: { kind: "GUIDE", published: true },
        take: 3,
      }),
      db.content.findMany({
        where: { kind: "NOTICE", published: true },
        take: 3,
      }),
      db.content.findUnique({ where: { slug: "hero" } }),
    ]);
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">THE PRACTICAL SOURCING PARTNER</div>
          <h1>
            {hero?.published ? (
              hero.title
            ) : (
              <>
                판매할 상품을 찾는
                <br />
                가장 실전적인 방법
              </>
            )}
          </h1>
          <p>
            {hero?.published
              ? hero.body
              : "김우람의 상품 큐레이션과 명확한 도매 조건으로, 내 사업에 맞는 상품을 빠르게 찾아보세요."}
          </p>
          <div className="actions">
            <Link href={hero?.href || "/products"} className="btn navy">
              상품 둘러보기 <ArrowUpRight size={15} />
            </Link>
            <Link href="/auth/signup" className="btn">
              사업자 회원가입
            </Link>
          </div>
        </div>
        <div className="hero-art">
          <Image
            unoptimized
            priority
            src="/images/hero.svg"
            alt="소량 소싱용 주방·패션·문구 상품 구성 예시"
            width={620}
            height={360}
          />
          <span className="note">
            직접 제작한 예시 이미지 · 실제 상품 사진 아님
          </span>
        </div>
      </section>
      <div className="quick-links">
        {[
          {
            href: "/collections/small-lot",
            Icon: PackageCheck,
            title: "소량으로 가볍게 시작",
            desc: "최소수량 5개 이하 상품",
          },
          {
            href: "/collections/bundle",
            Icon: Layers,
            title: "배송비를 더 효율적으로",
            desc: "같은 배송그룹 묶음배송",
          },
          {
            href: "/collections/recommended",
            Icon: Star,
            title: "김우람의 상품 큐레이션",
            desc: "추천 이유까지 확인하세요",
          },
          {
            href: "/collections/vip",
            Icon: ShieldCheck,
            title: "VIP 전용 소싱",
            desc: "전용 상품과 VIP 공급단가",
          },
        ].map(({ href, Icon, title, desc }) => (
          <Link href={href} key={href}>
            <Icon />
            <div>
              <b>{title}</b>
              <small>{desc}</small>
            </div>
          </Link>
        ))}
      </div>
      <section className="section">
        <SectionTitle
          title="김우람 추천 상품"
          description="추천 이유와 도매 조건을 함께 확인하세요."
          href="/collections/recommended"
        />
        <ProductGrid products={recommended.products.slice(0, 5)} />
      </section>
      <section className="section">
        <SectionTitle
          title="작게 시작하는 상품 소싱"
          description="부담을 줄이는 최소주문수량 5개 이하 상품"
          href="/collections/small-lot"
        />
        <ProductGrid products={small.products.slice(0, 5)} />
      </section>
      <section className="section">
        <SectionTitle
          title="같이 담고, 배송비를 줄이고"
          description="같은 배송그룹의 상품은 해당 정책에 따라 묶음배송됩니다."
          href="/collections/bundle"
        />
        <ProductGrid products={bundle.products.slice(0, 5)} />
      </section>
      <section className="section">
        <SectionTitle
          title="새롭게 들어온 상품"
          description="등록일 기준으로 확인하는 새로운 소싱 아이템"
          href="/products?sort=new"
        />
        <ProductGrid products={fresh.products.slice(0, 5)} />
      </section>
      <section className="section">
        <SectionTitle
          title="판매를 준비하는 소싱 가이드"
          description="첫 주문부터 상품자료 사용까지, 운영에 필요한 기준"
          href="/guides"
        />
        <div className="guide-grid">
          {guides.map((g, i) => (
            <Link href={"/guides/" + g.slug} className="guide-card" key={g.id}>
              <span>SOURCING GUIDE 0{i + 1}</span>
              <h3>{g.title}</h3>
              <p>{g.body.slice(0, 65)}...</p>
              <ArrowUpRight size={18} />
            </Link>
          ))}
        </div>
      </section>
      <section className="notice-panel">
        <div>
          <h3>공지사항</h3>
          {notices.map((n) => (
            <Link key={n.id} href={"/help#" + n.slug}>
              {n.title}
            </Link>
          ))}
        </div>
        <div>
          <h3>처음 이용하시나요?</h3>
          <p className="muted small">
            사업자 회원가입 → 운영자 검토 → 승인 → 구매와 자료 이용
          </p>
          <Link href="/help">가입 승인과 구매 FAQ 보기</Link>
        </div>
      </section>
    </>
  );
}
