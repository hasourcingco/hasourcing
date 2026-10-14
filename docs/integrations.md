# 외부 연동 상태

| 기능             | 현재 상태                                   | 운영 전 작업                                          |
| ---------------- | ------------------------------------------- | ----------------------------------------------------- |
| 데모 결제        | 실제 DB 주문/재고 처리, 실제 결제 없음      | 운영에서는 금지                                       |
| 토스페이먼츠     | 서버 승인 adapter 초안, 실제 결제 UI 비활성 | 계약/키/SDK/웹훅·환불·중복 이벤트 검증 필요           |
| 이메일           | 미연동, 성공 표시 없음                      | 발송 provider와 발신 도메인, 인증/재설정 구현 및 검증 |
| 공식 사업자 인증 | 미연동, 형식 검사·운영자 승인               | 국세청 등 공식 서비스 계약·키·개인정보 정책           |
| 세금계산서       | 미연동                                      | 발급 서비스·정산·발급 정책 확정                       |
| 택배 배송조회    | 택배사/송장 저장만 제공                     | 조회 provider 연결 필요                               |
| 비공개 자료      | 로컬 비공개 저장소, S3 호환 adapter         | 운영 storage key와 권한 설정·통합 테스트              |
| CSV/PDF 견적서   | P1 미구현                                   | 필요 시 확장                                          |

토스 adapter는 공식 승인 응답의 주문번호·금액·KRW·DONE 상태를 검증하고 Idempotency-Key 헤더를 사용합니다. 실거래·웹훅·환불 전체 흐름은 미완료이며 실결제를 활성화하지 않습니다. 미검증 상태에서 설정만 바꿔 실결제가 가능한 것처럼 표시하지 않습니다.

공식 참고:

- [Next.js 설치 요구사항](https://nextjs.org/docs/app/getting-started/installation)
- [Better Auth Prisma adapter](https://better-auth.com/docs/adapters/prisma)
- [Better Auth Next.js 통합](https://better-auth.com/docs/integrations/next)
- [토스페이먼츠 코어 API](https://docs.tosspayments.com/reference)
- [PostgreSQL 개발 실행기](https://github.com/leinelissen/embedded-postgres)

Noto Sans KR은 @fontsource/noto-sans-kr 패키지로 직접 호스팅합니다. SIL Open Font License 1.1이며 패키지의 LICENSE를 포함한 의존성 배포를 유지합니다. 상품 SVG는 직접 제작한 예시입니다.
