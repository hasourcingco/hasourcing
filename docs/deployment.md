# 운영 배포 준비

실제 운영 배포는 수행하지 않았습니다. 아래는 서버와 도메인 확정 후 사용할 예시입니다.

1. .env의 APP_ENV=production, DEMO_ENABLED=false, PAYMENT_PROVIDER=disabled, SITE_URL=https://실제도메인을 설정합니다. 새 인증 secret과 운영 DATABASE_URL을 사용합니다.
2. 운영 DATABASE_URL은 Compose 내부 db:5432를 가리켜야 합니다. DB_PASSWORD와 SITE_HOST는 Compose 실행 환경에서 전달합니다. DB는 포트를 공개하지 않습니다.
3. SITE_HOST와 도메인 DNS를 서버로 연결합니다. Caddy가 HTTPS 인증서를 발급하므로 80·443 접근이 필요합니다.
4. docker compose -f deploy/compose.production.yml build
5. docker compose -f deploy/compose.production.yml up -d
6. migrate 서비스가 Prisma migration을 적용하며 seed는 실행하지 않습니다.
7. 별도 안전한 관리 환경에서 npm run admin:create로 신규 관리자 계정을 생성합니다. 데모 계정과 비밀번호를 재사용하지 않습니다.
8. /api/health, TLS, 권한, 업로드, DB와 파일 백업·복구를 검증합니다.

운영 Docker 구성은 현재 PC에 Docker가 없어 빌드/실행 검증 전입니다. reverse proxy가 HTTPS를 제공하며 DB·비공개 자료·상품 업로드 이미지에 영속 볼륨을 제공합니다.

예약 만료 작업은 1분 간격 스케줄러에서 npm run inventory:expire 실행을 권장합니다. Linux cron 예시: 매분 프로젝트 작업 디렉터리에서 실행하고 비밀번호나 토큰이 로그에 남지 않게 합니다. 운영 이미지는 웹 실행에 필요한 파일만 포함하므로 만료 작업은 별도의 build 단계 이미지나 작업 환경에서 실행합니다.

실결제는 미연동으로 비활성 상태입니다. 운영 전 인증된 웹훅과 환불 전체 흐름을 추가하고 테스트해야 합니다.
