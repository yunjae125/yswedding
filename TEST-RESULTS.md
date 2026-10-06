# 청첩장 테스트 결과

실행일: 2026-10-06 (Asia/Seoul)
수정된 운영 버전: Sites v4, source f1fe9c8e147881e7b39a6d51ad1e1c341136f243

## 결과

- npm run check, npm run build: 성공.
- 단위/컴포넌트 테스트: 16개 모두 통과.
- 환경: Node 24 내장 SQLite와 D1 형태의 어댑터로 Worker 핸들러 호출.
- Wrangler 로컬 D1 통합 테스트: 통과.
- 배포 후 운영 API 스모크 테스트: 9회 요청 모두 예상 응답. CORS 204, null 입력 400, 동시 같은 ID 작성 201/200, 조회 200, 수정 200, 틀린 비밀번호 삭제 403, 정상 삭제 200, 삭제 확인 조회 200.
- 테스트 글 삭제 확인. 기존 사용자 글 수정 없음.
- 운영 응답시간 205–2158ms (각 요청 1회 측정, 성능 보장 수치 아님).

## 보완 사항

1. JSON null·배열·기본형을 입력 검증에서 400으로 처리. 기존 null 요청의 503 오분류 해결.
2. INSERT ON CONFLICT DO NOTHING RETURNING으로 중복 처리를 원자적으로 수행. 동시 같은 ID 전송도 오류 없이 한 건 저장하며, 기존 내용과 비밀번호는 유지.
3. 회귀 테스트 및 운영 API 스모크 테스트 추가. GitHub Pages와 Sites 방명록 서버 구조는 유지.

## 검증된 항목

저장과 재조회, 응답에서 비밀번호 해시·salt 제외, DB의 비밀번호 해시 저장, 틀린 비밀번호 수정·삭제 차단, 정상 수정·삭제, 존재하지 않는 글 처리, 순차 중복 전송, 입력 길이 경계, GitHub Origin CORS, 외부 Origin 쓰기 차단, SQL 특수문자 보존, 5개씩 페이지네이션, DB 장애의 503 처리, 잘못된 JSON 400, 미지원 메서드 405, 정적 파일/404.

## 한계

Sites의 일/월 요청 한도·트래픽 한도·장기 가용성은 단위 테스트나 이번 소규모 운영 테스트로 확인할 수 없음. 운영 서버 부하 테스트는 하지 않음. 스팸 방지·관리자 삭제·자동 백업은 현재 구현되지 않았고 이번 통과 결과에 포함되지 않음. 브라우저 E2E와 장기 지속성 시험은 이번 실행 범위에 포함하지 않음.

## 재현

```sh
npm run build
node --test tests/guestbook.test.mjs
npx wrangler d1 migrations apply wedding-local --local
npx wrangler dev --port 8770
# 다른 터미널에서:
node tests/live-smoke.mjs http://127.0.0.1:8770
```

live-smoke.mjs는 지정한 서버에 임시 글 하나를 생성·수정·삭제하므로 운영 주소 실행은 의도적으로 할 것.
