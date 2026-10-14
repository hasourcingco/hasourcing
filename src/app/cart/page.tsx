import { ProductImage } from "@/components/product-image";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { cartQuote } from "@/lib/orders";
import { db } from "@/lib/db";
import { won } from "@/lib/format";
import { ActionForm } from "@/components/action-form";
import { Empty, Hidden } from "@/components/ui";
import { canAccess } from "@/lib/domain";
export const metadata = {
  title: "장바구니",
  robots: { index: false, follow: false },
};
export default async function Cart() {
  const u = await requireUser();
  if (!canAccess(u))
    return (
      <Empty
        title="사업자 승인 후 장바구니를 이용할 수 있습니다."
        href="/account"
        action="회원 상태 확인"
      />
    );
  let q;
  try {
    q = await cartQuote(u.id);
  } catch (e) {
    const items = await db.cartItem.findMany({
      where: { userId: u.id },
      include: { variant: { include: { product: true } } },
    });
    return (
      <>
        <h1>장바구니 조건이 변경되었습니다.</h1>
        <p className="error">
          {e instanceof Error ? e.message : "구매 조건을 확인해주세요."}
        </p>
        {items.map((i) => (
          <div className="panel" key={i.id}>
            <h3>
              {i.variant.product.name} · {i.variant.name}
            </h3>
            <p>
              현재 수량 {i.quantity}개 · MOQ {i.variant.moq}개 · 가용 재고{" "}
              {i.variant.onHand - i.variant.reserved}개
            </p>
            <ActionForm op="cart-update" className="inline-form">
              <Hidden name="variantId" value={i.variantId} />
              <input
                name="quantity"
                type="number"
                aria-label="변경 수량"
                defaultValue={i.quantity}
              />
              <button className="btn small">수량 변경</button>
            </ActionForm>
            <ActionForm op="cart-remove">
              <Hidden name="id" value={i.id} />
              <button className="btn small">삭제</button>
            </ActionForm>
          </div>
        ))}
      </>
    );
  }
  if (!q.lines.length)
    return (
      <Empty
        title="장바구니가 비어 있습니다."
        description="상품별 MOQ와 배송그룹을 확인하며 상품을 담아보세요."
        href="/products"
      />
    );
  const selected = await cartQuote(u.id, true);
  return (
    <>
      <div className="page-heading">
        <h1>장바구니</h1>
        <p>배송그룹별로 상품과 배송 조건을 확인하세요.</p>
      </div>
      <div className="split">
        <div>
          <div className="actions">
            <ActionForm op="cart-select">
              <Hidden name="selected" value="true" />
              <button className="btn small">전체 선택</button>
            </ActionForm>
            <ActionForm op="cart-select">
              <Hidden name="selected" value="false" />
              <button className="btn small">전체 선택 해제</button>
            </ActionForm>
            <ActionForm
              op="cart-delete-selected"
              confirmMessage="선택한 상품을 장바구니에서 삭제할까요?"
            >
              <button className="btn small">선택 삭제</button>
            </ActionForm>
          </div>
          {q.groups.map((g) => (
            <section key={g.id} className="panel">
              <h3>{g.name}</h3>
              <p className="muted small">
                {g.origin} · {g.leadDays} 내 출고 ·{" "}
                {g.mode === "FREE"
                  ? "무료배송"
                  : g.mode === "CONDITIONAL"
                    ? won(g.freeAbove ?? 0) + " 이상 무료배송"
                    : won(g.fee) + " 정액배송"}
              </p>
              {q.lines
                .filter((l) => l.variant.product.shippingGroupId === g.id)
                .map((l) => (
                  <div className="cart-row" key={l.id}>
                    <ProductImage
                      src={l.variant.product.image}
                      alt={l.variant.product.name}
                    />
                    <div>
                      <Link href={"/products/" + l.variant.product.slug}>
                        <b>{l.variant.product.name}</b>
                      </Link>
                      <p className="small muted">
                        {l.variant.name} · 개당 {won(l.unitPrice)} · VAT 포함
                      </p>
                      <ActionForm op="cart-select">
                        <Hidden name="id" value={l.id} />
                        <Hidden
                          name="selected"
                          value={l.selected ? "false" : "true"}
                        />
                        <button className="btn small">
                          {l.selected ? "선택됨 · 해제" : "주문에 선택"}
                        </button>
                      </ActionForm>
                      <ActionForm op="cart-remove">
                        <Hidden name="id" value={l.id} />
                        <button className="btn small">삭제</button>
                      </ActionForm>
                    </div>
                    <div>
                      <b>{won(l.amount)}</b>
                      <ActionForm op="cart-update" className="inline-form">
                        <Hidden name="variantId" value={l.variantId} />
                        <input
                          aria-label={l.variant.name + " 수량"}
                          name="quantity"
                          type="number"
                          min={l.variant.moq}
                          step={l.variant.step}
                          defaultValue={l.quantity}
                        />
                        <button className="btn small">변경</button>
                      </ActionForm>
                    </div>
                  </div>
                ))}
            </section>
          ))}
        </div>
        <aside className="panel">
          <h2>선택 상품 주문금액</h2>
          <div className="summary">
            <p>
              <span>상품금액</span>
              <b>{won(selected.subtotal)}</b>
            </p>
            {selected.groups.map((g) => (
              <p key={g.id}>
                <span>{g.name} 배송</span>
                <b>{won(g.cost)}</b>
              </p>
            ))}
            <p className="total">
              <span>합계</span>
              <b>{won(selected.total)}</b>
            </p>
            <p className="small muted">
              VAT 포함 · 가격은 주문 시 재검증됩니다.
            </p>
          </div>
          {selected.lines.length ? (
            <Link className="btn primary full" href="/checkout">
              선택 상품 주문하기
            </Link>
          ) : (
            <p className="muted">주문할 상품을 선택해주세요.</p>
          )}
        </aside>
      </div>
    </>
  );
}
