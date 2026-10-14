import { requireUser } from "@/lib/auth";
import { OrderDetail } from "@/components/order-detail";
export default async function Detail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <OrderDetail id={(await params).id} userId={(await requireUser()).id} />
  );
}
