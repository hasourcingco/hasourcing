# 스타강사 김우람B2B

독립형 Next.js B2B 도매몰입니다. 상품·회원·장바구니·재고·주문은 자체 PostgreSQL에 저장합니다. 관리자까지 구현했으며 실제 결제와 운영 배포는 수행하지 않았습니다.

## 지금 실행 중인 로컬 환경

- 쇼핑몰: http://127.0.0.1:3001
- 관리자: http://127.0.0.1:3001/admin
- 현재 PC의 3000 포트가 사용 중이라 3001에서 검증했습니다. SITE_URL과 실제 서버 포트를 일치시켜야 합니다.
- PostgreSQL: 127.0.0.1:5432, 프로젝트 전용 .local-db/data에 영속 저장

## 빠른 실행 (표준 Docker)

Node.js 20.9 이상 권장 24 LTS, Docker Compose가 필요합니다.

1. npm install (또는 pnpm install --frozen-lockfile)
2. docker compose up -d db
3. npm run setup
4. npm run dev
5. http://localhost:3000 접속

setup은 .env가 없을 때만 생성하고 새 인증 secret을 만듭니다. 기존 .env는 덮어쓰지 않습니다. DB 연결 확인 후 migration을 적용하며 local/demo와 DEMO_ENABLED=true일 때만 seed를 실행합니다. 운영 환경에서는 seed를 자동 실행하지 않습니다.

## Docker 없는 개발 환경

1. npm install
2. 별도 터미널에서 npm run db:local
3. npm run setup
4. npm run dev -- --port 3001

.env의 SITE_URL=http://127.0.0.1:3001 설정과 서버 포트를 맞추세요. db:local은 개발 전용 실제 PostgreSQL 실행기이며 기존 클러스터를 삭제하지 않습니다. 동시에 Docker DB를 실행하면 5432 포트가 충돌하므로 한 가지 실행 방법을 사용합니다.

배포용 빌드의 로컬 실행은 npm run build 후 npm start입니다. standalone 서버에 정적 파일을 복사하며 .env의 SITE_URL 포트를 사용합니다.

## 데모 계정

| 상태          | 이메일              | 비밀번호      |
| ------------- | ------------------- | ------------- |
| 승인대기      | pending@demo.local  | DemoOnly!2026 |
| 일반 승인회원 | standard@demo.local | DemoOnly!2026 |
| VIP 승인회원  | vip@demo.local      | DemoOnly!2026 |
| 관리자        | admin@demo.local    | DemoOnly!2026 |

로컬 데모 전용입니다. production에서 데모 로그인과 mock 결제를 차단하며 새 운영 DB와 관리자 계정을 사용합니다.

## 구현 범위

- 홈: 검색·카테고리·추천·소량·묶음배송·신상품·가이드·공지
- 상품: 검색/결과 내 검색/URL 필터/현재 등급 기준 가격 정렬/20개 페이지/옵션/수량별 공급가/MOQ/재고/배송비
- 회원: Better Auth 이메일·비밀번호 인증, DB 세션, 사업자 승인 상태와 VIP 등급 분리, 약관 동의 기록
- 구매: DB 장바구니·선택 주문·서버 재계산·가격 조건 변경 확인·배송지 저장·데모 주문·주문조회·재구매
- 재고: 보유/예약 분리, 트랜잭션과 원자적 조건부 예약, 중복 확인·취소·만료 방지, 실행 가능한 만료 작업
- 자료: 비공개 저장소, 주문 소유권·결제·회원 상태 검사 후 다운로드, 파일 타입/크기 검사, S3 호환 adapter
- 상담: 견적 요청·관리자 답변, 개인 상품문의·운영자 답변
- 관리자: 상품 등록/수정/사진/옵션/수량별 가격/재고 조정, 회원 승인·VIP·이용중지, 주문·송장·배송, 구매자료, 배너·공지·가이드·정책, 배송그룹·카테고리·기획전, 설정·감사 로그
- 운영 준비: migration·seed·Dockerfile·Compose·HTTPS 예시·health check·백업/복구·환경변수 검증

P1의 실제 PG·메일·공식 사업자 인증·세금계산서·택배조회·CSV·견적서 PDF는 미완료/미연동입니다. 동작하지 않는 성공 버튼을 표시하지 않습니다.

## 버전과 검증

실제 설치 버전은 pnpm-lock.yaml로 고정합니다. 검증 환경: Node 24.19.0 / Next 16.3.8 / React 19.3.0 / TypeScript 5.9.3 / Prisma 6.19.3 / Better Auth 1.7.7 / PostgreSQL 17.4 / Tailwind 4.3.3 / Vitest 3.2.7 / Playwright 1.63.0. Prisma 6은 현재 인증 adapter와 호환되는 구성으로 유지했습니다.

- npm run typecheck
- npm run lint
- npm test (실행 중인 local/demo PostgreSQL 필요)
- npm run build
- npx playwright install chromium
- npm run test:e2e (실행 중인 웹앱 필요, 기본 127.0.0.1:3001 또는 E2E_BASE_URL)
- npm run inventory:expire
- npm run admin:create (운영용 새 관리자 생성)

테스트 결과는 docs/test-results.md, 화면은 docs/screenshots에서 확인합니다.

## 마지막에 직접 설정할 항목

[운영 체크리스트](docs/production-checklist.md)에 모았습니다. 사업자정보·정책·실상품·배송정책은 관리자 화면에서 설정하고, 서버·도메인·인증키·외부 서비스 연동은 운영 전에 준비하세요.

- [가정](docs/assumptions.md)
- [연동 상태와 공식 출처](docs/integrations.md)
- [운영 배포 예시](docs/deployment.md)
- [백업·복구](docs/backup-and-restore.md)

샘플 이미지와 주문·견적·사업자 계정은 모두 데모입니다. 임의의 실제 경력·성과·리뷰·회사 연락처는 만들지 않았습니다. Noto Sans KR은 SIL OFL 1.1로 자체 호스팅하며 라이선스는 docs/licenses에 보존합니다.

## GitHub와 Sites 운영 배포

[단계별 진행과 현재 제약](docs/git-github-sites.md)을 확인하세요. GitHub Actions 설정을 준비했으며 현재 Next.js/PostgreSQL 앱은 Sites Worker 환경으로 이식이 필요합니다.
