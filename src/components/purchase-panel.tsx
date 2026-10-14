"use client";
import { useState } from "react";
import { ActionForm } from "./action-form";
import { price, shipping } from "@/lib/domain";
import { won } from "@/lib/format";
import type { Tier, Ship } from "@/lib/domain";
export function PurchasePanel({
  variants,
  grade,
  group,
}: {
  variants: {
    id: string;
    name: string;
    moq: number;
    step: number;
    available: number;
    tiers: Tier[];
  }[];
  grade: string;
  group: Ship;
}) {
  const [id, setId] = useState(variants[0]?.id ?? "");
  const v = variants.find((v) => v.id === id)!;
  const [qty, setQty] = useState(v?.moq ?? 1);
  const [buy, setBuy] = useState(false);
  if (!v) return <p>구매 옵션이 준비되지 않았습니다.</p>;
  const quantityError =
    qty < v.moq
      ? "최소 " + v.moq + "개 이상 주문해주세요."
      : qty % v.step !== 0
        ? v.step + "개 단위로 주문해주세요."
        : qty > v.available
          ? "주문 가능 재고는 " + v.available + "개입니다."
          : "";
  const unit = price(v.tiers, Math.max(qty, v.moq), grade),
    amount = unit * qty,
    delivery = shipping([{ amount, group }])[0].cost;
  return (
    <div>
      <label>
        옵션
        <select
          aria-label="옵션"
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            setQty(variants.find((v) => v.id === e.target.value)!.moq);
          }}
        >
          {variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} · 재고 {v.available}개
            </option>
          ))}
        </select>
      </label>
      <div className="conditions">
        <span>
          최소주문 <b>{v.moq}개</b>
        </span>
        <span>
          주문 단위 <b>{v.step}개</b>
        </span>
        <span>
          주문 가능 재고 <b>{v.available}개</b>
        </span>
      </div>
      <table>
        <thead>
          <tr>
            <th>주문 수량</th>
            <th>개당 공급단가 · VAT 포함</th>
          </tr>
        </thead>
        <tbody>
          {v.tiers.map((t) => (
            <tr key={t.minQty}>
              <td>{t.minQty}개 이상</td>
              <td>{won(grade === "VIP" ? t.vip : t.standard)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ActionForm op="cart-add">
        <input type="hidden" name="variantId" value={id} />
        <input type="hidden" name="buy" value={buy ? "1" : "0"} />
        <label>
          주문 수량
          <div className="quantity">
            <button
              type="button"
              aria-label="수량 감소"
              onClick={() => setQty(Math.max(v.moq, qty - v.step))}
            >
              −
            </button>
            <input
              aria-label="주문 수량"
              aria-describedby={quantityError ? "quantity-error" : undefined}
              aria-invalid={!!quantityError}
              name="quantity"
              type="number"
              min={v.moq}
              step={v.step}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
            />
            <button
              type="button"
              aria-label="수량 증가"
              onClick={() => setQty(qty + v.step)}
            >
              +
            </button>
          </div>
        </label>
        {quantityError && (
          <p id="quantity-error" className="error" role="alert">
            {quantityError}
          </p>
        )}
        <div className="summary">
          <p>
            <span>상품금액</span>
            <b>{won(amount)}</b>
          </p>
          <p>
            <span>예상 배송비</span>
            <b>{won(delivery)}</b>
          </p>
          <p className="total">
            <span>예상 총액</span>
            <b>{won(amount + delivery)}</b>
          </p>
        </div>
        <div className="actions">
          <button
            className="btn"
            onClick={() => setBuy(false)}
            disabled={v.available < v.moq || !!quantityError}
          >
            장바구니 담기
          </button>
          <button
            className="btn primary"
            type="button"
            disabled={v.available < v.moq || !!quantityError}
            onClick={async (e) => {
              const form = e.currentTarget.closest("form")!;
              setBuy(true);
              queueMicrotask(() => form.requestSubmit());
            }}
          >
            구매하기
          </button>
        </div>
      </ActionForm>
      <p className="muted small">
        배송 조건과 가격은 주문 시 서버에서 다시 확인합니다.
      </p>
    </div>
  );
}
