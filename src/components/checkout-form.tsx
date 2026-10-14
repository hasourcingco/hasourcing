"use client";
import { useState } from "react";
import { ActionForm } from "./action-form";
import { Hidden } from "./ui";
import Link from "next/link";
type Address = {
  id: string;
  recipient: string;
  phone: string;
  postcode: string;
  address: string;
  detail: string;
};
export function CheckoutForm({
  token,
  fingerprint,
  policyVersion,
  addresses,
  demo,
  phone,
}: {
  token: string;
  fingerprint: string;
  policyVersion: string;
  addresses: Address[];
  demo: boolean;
  phone: string;
}) {
  const [addr, setAddr] = useState<Address | undefined>(addresses[0]);
  return (
    <ActionForm op="checkout">
      <Hidden name="idempotencyKey" value={token} />
      <Hidden name="fingerprint" value={fingerprint} />
      <Hidden name="policyVersion" value={policyVersion} />
      <h2>배송지 정보</h2>
      {addresses.length > 0 && (
        <label>
          저장한 배송지
          <select
            onChange={(e) =>
              setAddr(addresses.find((a) => a.id === e.target.value))
            }
          >
            <option value="">새 배송지 입력</option>
            {addresses.map((a) => (
              <option key={a.id} value={a.id}>
                {a.recipient} · {a.address}
              </option>
            ))}
          </select>
        </label>
      )}
      <div key={addr?.id ?? "new"} className="form-grid">
        {[
          { name: "recipient", label: "수령인", value: addr?.recipient ?? "" },
          { name: "phone", label: "연락처", value: addr?.phone ?? phone },
          {
            name: "postcode",
            label: "우편번호 (5자리)",
            value: addr?.postcode ?? "",
          },
          { name: "address", label: "기본주소", value: addr?.address ?? "" },
          { name: "detail", label: "상세주소", value: addr?.detail ?? "" },
        ].map((x) => (
          <label key={x.name}>
            {x.label}
            <input name={x.name} required defaultValue={x.value} />
          </label>
        ))}
      </div>
      <label>
        배송 메모
        <textarea name="memo" maxLength={500} />
      </label>
      <label>
        <input name="saveAddress" type="checkbox" />
        배송지 저장
      </label>
      <h3>결제수단</h3>
      <div className="info-strip">
        {demo
          ? "데모 결제 · 실제 카드번호를 입력하지 않습니다."
          : "실결제 서비스 미연동 · 주문 기능이 비활성화되었습니다."}
      </div>
      <label>
        <input name="agree" type="checkbox" required />
        <Link href="/policies/terms" target="_blank">
          주문 약관
        </Link>
        과{" "}
        <Link href="/policies/shipping" target="_blank">
          배송·교환 조건
        </Link>
        을 확인했습니다. (필수)
      </label>
      <button className="btn primary full" disabled={!demo}>
        {demo ? "데모 주문하기" : "실결제 미연동"}
      </button>
    </ActionForm>
  );
}
