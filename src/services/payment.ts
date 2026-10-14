export interface PaymentProvider {
  confirm(input: {
    orderId: string;
    paymentKey: string;
    amount: number;
    idempotencyKey: string;
  }): Promise<{ status: string; paymentKey: string }>;
}
export class MockPaymentProvider implements PaymentProvider {
  async confirm(input: {
    orderId: string;
    paymentKey: string;
    amount: number;
    idempotencyKey: string;
  }) {
    if (process.env.APP_ENV === "production")
      throw new Error("운영에서 데모 결제 금지");
    return { status: "DEMO_PAID", paymentKey: input.paymentKey };
  }
}
// Prepared adapter only. Storefront real payments stay disabled until webhook/refund verification is complete.
export class TossPaymentProvider implements PaymentProvider {
  async confirm(input: {
    orderId: string;
    paymentKey: string;
    amount: number;
    idempotencyKey: string;
  }) {
    const key = process.env.TOSS_SECRET_KEY;
    if (!key) throw new Error("TOSS_SECRET_KEY 미설정");
    const res = await fetch(
      "https://api.tosspayments.com/v1/payments/confirm",
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(key + ":").toString("base64"),
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify({
          orderId: input.orderId,
          paymentKey: input.paymentKey,
          amount: input.amount,
        }),
      },
    );
    if (!res.ok) throw new Error("PG 승인 실패");
    const p = await res.json();
    if (
      p.orderId !== input.orderId ||
      p.totalAmount !== input.amount ||
      p.currency !== "KRW" ||
      p.status !== "DONE"
    )
      throw new Error("PG 거래 검증 실패");
    return { status: p.status as string, paymentKey: p.paymentKey as string };
  }
}
