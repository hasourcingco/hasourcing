import { requireUser } from "@/lib/auth";
import { OrderDetail } from "@/components/order-detail";
export const metadata = {
  title: "주문 완료",
  robots: { index: false, follow: false },
};
export default async function Complete({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <OrderDetail
      id={(await params).id}
      userId={(await requireUser()).id}
      complete
    />
  );
}
