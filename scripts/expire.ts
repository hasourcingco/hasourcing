import "dotenv/config";
import { db } from "../src/lib/db";
import { settleOrder } from "../src/lib/orders";
async function main() {
  const orders = await db.order.findMany({
    where: { status: "PENDING", expiresAt: { lte: new Date() } },
  });
  for (const o of orders) await settleOrder(o.id, "EXPIRED");
  console.log("만료 처리 대상:", orders.length);
}
main().finally(() => db.$disconnect());
