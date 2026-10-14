import { ProductImage } from "./product-image";
import Link from "next/link";
import { Heart, ArrowUpRight } from "lucide-react";
import { ActionForm } from "./action-form";
import type { ProductCardData } from "@/lib/catalog";
import { won } from "@/lib/format";
export function ProductCard({ p }: { p: ProductCardData }) {
  return (
    <article className="product-card">
      <div className="product-media">
        <Link href={"/products/" + p.slug}>
          <ProductImage
            src={p.image}
            alt={p.name + (p.image.endsWith(".svg") ? " · 예시 이미지" : "")}
          />
        </Link>
        <ActionForm op="wishlist" className="wish">
          <input type="hidden" name="productId" value={p.id} />
          <button aria-label={p.name + " 관심 상품 저장"}>
            <Heart size={19} />
          </button>
        </ActionForm>
        {p.image.endsWith(".svg") && (
          <span className="image-note">예시 이미지</span>
        )}
      </div>
      <div className="product-body">
        <div className="badges">
          {p.recommended && <span className="badge">김우람 추천</span>}
          {p.vipOnly && <span className="badge vip">VIP 전용</span>}
          {p.moq <= 5 && <span className="badge green">소량 시작</span>}
        </div>
        <Link className="product-name" href={"/products/" + p.slug}>
          {p.name}
        </Link>
        <p className="code">{p.code}</p>
        {p.price !== null ? (
          <>
            <p className="price">
              <small>개당</small> {won(p.price)}
            </p>
            <p className="muted small">
              VAT 포함 · 최소 상품금액 {won(p.price * p.moq)}
            </p>
          </>
        ) : (
          <p className="locked">사업자 승인 후 공급가 확인</p>
        )}
        <div className="card-conditions">
          <span>
            최소 <b>{p.moq}개</b>
          </span>
          <span className={p.available === 0 ? "error" : ""}>
            {p.available === 0 ? "품절" : "재고 " + p.available + "개"}
          </span>
        </div>
        <p className="shipping-label">
          {p.shipping} · {p.groupName}
        </p>
      </div>
    </article>
  );
}
export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return products.length ? (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard key={p.id} p={p} />
      ))}
    </div>
  ) : (
    <Empty
      title="조건에 맞는 상품이 없습니다."
      description="검색어를 바꾸거나 필터를 초기화해보세요."
      href="/products"
      action="전체상품 보기"
    />
  );
}
export function SectionTitle({
  title,
  description,
  href,
}: {
  title: string;
  description?: string;
  href?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {href && (
        <Link href={href}>
          전체 보기 <ArrowUpRight size={17} />
        </Link>
      )}
    </div>
  );
}
export function Empty({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {href && (
        <Link className="btn" href={href}>
          {action ?? "상품 둘러보기"}
        </Link>
      )}
    </div>
  );
}
export function Field({
  label,
  name,
  type = "text",
  value = "",
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  value?: string | number;
  required?: boolean;
}) {
  return (
    <label>
      {label}
      <input name={name} type={type} defaultValue={value} required={required} />
    </label>
  );
}
export function Hidden({
  name,
  value,
}: {
  name: string;
  value: string | number;
}) {
  return <input type="hidden" name={name} value={value} />;
}
