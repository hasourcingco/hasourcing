# Git → GitHub → Sites 배포 진행

## 1. Git

- main 브랜치에 소스와 기존 검증 기록을 저장합니다.
- .env와 환경별 설정, 비공개 파일, 상품 업로드, 로컬 PostgreSQL, 의존성/빌드/테스트 결과/패키지 캐시는 제외합니다.
- .env.example에는 변수 이름과 개발용 기본값만 보관합니다.
- 실제 코드의 첫 커밋은 로컬 재현 가능한 Node/PostgreSQL 앱입니다.

## 2. GitHub

연결 계정은 hasourcingco. 김대표님이 공개 hasourcingco/hasourcing의 별도 브랜치를 선택했습니다. b2bsite 브랜치에 B2B 앱을 올리며 기존 main은 그대로 보존합니다. 브랜치는 기존 main 커밋을 부모로 하여 B2B 앱 소스 전체를 적용합니다. 기존 Vite 앱과 혼합하지 않으며 운영용 환경파일은 새 브랜치에서 제외합니다.

GitHub로 push할 때 필요한 인증은 Git Credential Manager의 공식 로그인 흐름을 이용합니다. 비밀번호·개인 토큰을 채팅이나 소스에 입력하지 않습니다.

.github/workflows/ci.yml은 PostgreSQL 17 서비스에서 migration/seed, strict typecheck, lint, 단위·통합 검사, standalone build, Chromium E2E를 실행하도록 준비했습니다. GitHub에 아직 업로드하지 않았으므로 원격 CI 결과는 미확인입니다. 기존 docs/test-results.md는 2026-10-07 로컬 검증 기록이며 이번 날짜의 성공으로 갱신하지 않습니다.

## 3. Sites 실행 환경 검토

현재 앱: Next.js standalone Node 서버, Prisma PostgreSQL 연결, SELECT FOR UPDATE와 Serializable 주문 예약, Better Auth DB 세션, 로컬 파일 저장소.

Sites 스킬의 실행 계약: Cloudflare Workers, isolate 128 MB, HTTP 기반 외부 연결, raw TCP 불가. Node Docker 이미지를 Sites에 직접 올리는 방식은 지원 계약에 맞지 않습니다.

| 현재 구현                             | Sites 배포 전에 필요한 작업                                 |
| ------------------------------------- | ----------------------------------------------------------- |
| Next standalone                       | Sites Vinext/Worker 빌드로 이식                             |
| PostgreSQL TCP와 Prisma 네이티브 엔진 | 운영 PostgreSQL + 호환 HTTP 데이터 접근 계층                |
| 주문 트랜잭션·잠금                    | 동시 예약·중복 결제·만료 경쟁을 새 계층에서 재검증          |
| Better Auth 회원 세션                 | Sites 방문자 인증 및 기존 사업자 회원 체계의 연동 방식 확정 |
| 로컬 비공개 자료와 업로드             | R2 또는 외부 비공개 객체 저장소로 교체                      |
| localhost SITE_URL                    | 실제 Sites URL과 운영 secret 설정                           |

원래 요구사항이 PostgreSQL 유지이므로 D1으로 임의 전환하지 않습니다. 외부 운영 DB, HTTP 접근 방식, 인증 방식이 없는 상태에서는 실제 쇼핑몰을 Sites에 배포할 수 없습니다. 정적 화면만 배포해 주문과 관리자가 작동하는 것으로 표시하지 않습니다.

가능한 경로:

1. PostgreSQL 유지 + Sites 이식: 외부 PostgreSQL과 HTTP 접근 계층을 마련하고 Vinext·인증·파일 저장소를 이식합니다. Prisma Accelerate의 HTTP 접근은 후보이며 현재 앱의 raw SQL/대화형 트랜잭션/실행 제한 호환성을 별도 검증해야 합니다. 서비스 연결과 요금은 아직 설정하지 않았습니다.
2. 기존 앱 유지: 준비된 Docker 구성으로 Node·PostgreSQL 지원 서버에 전체 앱을 배포합니다. Sites가 필요하면 별도 프런트 역할로 연결하되 서버 인증·API 접근을 별도로 설계합니다.

현재 Sites 등록·버전 저장·배포는 수행하지 않았습니다.

## 마지막에 필요한 설정

- GitHub Git 쓰기 인증이 요청되면 공식 로그인 창에서 완료.
- Sites 운영용 데이터베이스/HTTP 연결 및 인증 경로 선택.
- 운영 관리자, 인증 secret, 실상품·사업자정보·정책, 실제 PG·이메일 연동.

참고: [Sites 스킬](C:/Users/wewep/.codex/plugins/cache/openai-curated-remote/sites/1.0.2-remix-a.1/skills/sites/SKILL.md), [Prisma Accelerate 시작 안내](https://www.prisma.io/docs/accelerate/getting-started), [GitHub setup-node](https://github.com/actions/setup-node).
