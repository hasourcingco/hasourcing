import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccess } from "@/lib/domain";
import { isDemo } from "@/lib/env";
import { Empty } from "@/components/ui";
export default async function Downloads() {
  const u = await requireUser();
  if (!canAccess(u))
    return (
      <Empty
        title="승인된 회원만 구매자료를 이용할 수 있습니다."
        href="/account"
        action="회원 상태 확인"
      />
    );
  const orders = await db.order.findMany({
    where: {
      userId: u.id,
      paymentStatus: "PAID",
      ...(isDemo ? {} : { isDemo: false }),
    },
    include: { items: true },
  });
  const ids = [
    ...new Set(orders.flatMap((o) => o.items.map((i) => i.productId))),
  ];
  const assets = await db.productAsset.findMany({
    where: {
      productId: { in: ids },
      ...(u.memberGrade === "VIP" ? {} : { product: { vipOnly: false } }),
    },
    include: { product: true },
  });
  return (
    <>
      <div className="page-heading">
        <h1>구매 상품자료</h1>
        <p>
          사용 범위를 확인해주세요. 구매는 저작권의 이전을 의미하지 않습니다.
        </p>
      </div>
      {assets.length ? (
        assets.map((a) => (
          <div className="panel" key={a.id}>
            <h3>{a.product.name}</h3>
            <p>
              {a.name} · {Math.ceil(a.size / 1024)}KB
            </p>
            <p className="small muted">{a.usageScope}</p>
            <a className="btn" href={"/api/assets/" + a.id}>
              허용 자료 다운로드
            </a>
          </div>
        ))
      ) : (
        <Empty
          title="다운로드 가능한 구매자료가 없습니다."
          description="결제 확인된 구매 상품의 자료가 표시됩니다."
          href="/products"
        />
      )}
    </>
  );
}
