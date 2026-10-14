"use client";
import { useState } from "react";
type Tier = { minQty: number; standard: number; vip: number };
export function TierEditor({ initial }: { initial: Tier[] }) {
  const [tiers, setTiers] = useState(initial);
  function update(i: number, k: keyof Tier, v: number) {
    setTiers(tiers.map((t, j) => (j === i ? { ...t, [k]: v } : t)));
  }
  return (
    <div className="wide">
      <h3>수량별 공급단가 · VAT 포함</h3>
      <input type="hidden" name="tiers" value={JSON.stringify(tiers)} />
      {tiers.map((t, i) => (
        <div className="tier-row" key={i}>
          <label>
            적용 수량 이상
            <input
              type="number"
              min="1"
              required
              value={t.minQty}
              onChange={(e) => update(i, "minQty", Number(e.target.value))}
            />
          </label>
          <label>
            일반 개당 가격
            <input
              type="number"
              min="0"
              required
              value={t.standard}
              onChange={(e) => update(i, "standard", Number(e.target.value))}
            />
          </label>
          <label>
            VIP 개당 가격
            <input
              type="number"
              min="0"
              required
              value={t.vip}
              onChange={(e) => update(i, "vip", Number(e.target.value))}
            />
          </label>
          <button
            type="button"
            className="btn small"
            disabled={tiers.length === 1}
            onClick={() => setTiers(tiers.filter((_, j) => j !== i))}
          >
            구간 삭제
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn small"
        onClick={() =>
          setTiers([
            ...tiers,
            {
              minQty: (tiers.at(-1)?.minQty ?? 0) + 10,
              standard: tiers.at(-1)?.standard ?? 1000,
              vip: tiers.at(-1)?.vip ?? 900,
            },
          ])
        }
      >
        가격 구간 추가
      </button>
    </div>
  );
}
