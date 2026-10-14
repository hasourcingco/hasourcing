export const won = (v: number) =>
  new Intl.NumberFormat("ko-KR").format(v) + "원";
export const date = (v: Date) =>
  new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(v);
export const statusLabels: Record<string, string> = {
  PENDING: "대기",
  APPROVED: "승인",
  REJECTED: "반려",
  SUSPENDED: "이용 중지",
  STANDARD: "일반 사업자",
  VIP: "VIP",
  ACTIVE: "활성",
  DISABLED: "비활성",
  PAID: "결제 확인",
  CANCELLED: "취소",
  EXPIRED: "예약 만료",
  UNFULFILLED: "출고 준비",
  SHIPPED: "배송 중",
  DELIVERED: "배송 완료",
  REQUESTED: "견적 접수",
  ANSWERED: "답변 완료",
  CLOSED: "종료",
};
export const label = (s: string) => statusLabels[s] ?? s;
