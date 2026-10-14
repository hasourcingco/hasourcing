# 백업과 복구

데이터베이스와 파일 저장소는 함께 보존합니다. 백업 파일에는 개인정보가 있으므로 암호화와 접근 제한을 적용합니다.

## 백업

- DB: pg_dump --format=custom --file=backup.dump "$DATABASE_URL"
- 파일: storage/private와 public/uploads 또는 대응하는 영속 볼륨을 백업합니다.
- S3 자료는 private bucket의 버전 관리와 수명 정책을 별도로 적용합니다.
- 백업 작업 기록, 성공 여부, 보존 기간을 운영 정책으로 확정합니다.

## 복구

1. 웹과 주문/예약 작업을 중지해 추가 변경을 막습니다.
2. 새 비공개 DB를 생성하고 pg_restore --no-owner --dbname="$RESTORE_DATABASE_URL" backup.dump를 실행합니다.
3. 동일 시점의 비공개 자료와 상품 업로드 파일을 복구합니다.
4. DATABASE_URL과 파일 경로를 새 DB/저장소로 연결합니다.
5. npm run db:migrate로 migration 상태를 확인합니다. 운영 seed는 실행하지 않습니다.
6. 주문 스냅샷·예약 재고·구매자료 권한·관리자 로그인·health check를 확인합니다.
7. 검증 후 트래픽과 만료 작업을 다시 연결합니다.

기존 운영 DB를 직접 덮어쓰거나 삭제하지 않습니다. 실제 백업/복구는 실행하지 않았으며 운영 시작 전 별도 복구 리허설이 필요합니다.
