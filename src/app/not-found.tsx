import { Empty } from "@/components/ui";
export default function NotFound() {
  return (
    <Empty
      title="페이지를 찾을 수 없습니다."
      description="상품이 판매 중지되었거나 주소가 변경되었을 수 있습니다."
      href="/products"
    />
  );
}
