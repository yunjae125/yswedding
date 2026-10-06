# yunjae & sojung

2027년 4월 24일 오전 11시 · 군산 스테이 웨딩

청첩장: https://yunjae125.github.io/yswedding/

## 구성

- `public/`: 사진, 달력, 일정 저장, 공유, 방명록 화면. GitHub Pages에 자동 배포됩니다.
- `worker/index.js`: 방명록 API와 정적 파일 서버.
- `db/schema.ts`, `drizzle/`: D1 스키마와 버전별 마이그레이션.
- `scripts/`: 빌드 및 로컬 API 검증.

방명록은 기존 Sites 서버와 D1을 사용합니다. GitHub Pages 자체는 서버 코드를 실행하거나 방명록을 저장하지 않습니다. 기존 Sites 서버를 유지해야 방명록이 동작합니다. GitHub 저장소에는 소스만 있고 방문자의 글/비밀번호 데이터는 없습니다.

GitHub의 `main`에 화면 변경을 커밋하면 Pages가 자동으로 배포됩니다. 서버 소스 변경은 별도 서버 배포가 필요합니다. 나중에 본인 Cloudflare 계정으로 서버를 이전할 때는 D1 데이터 이전 및 `public/features.js`의 API 주소 변경이 필요합니다.

## 로컬 실행

```sh
npm ci
npm run build
npx wrangler d1 migrations apply wedding-local --local
npx wrangler dev --port 8768
```

검증: `npm run check`, 로컬 서버 실행 중 `node scripts/test-api.mjs`.

사진은 기존 샘플 사진입니다. 연락처와 계좌 안내는 실제 정보가 준비될 때 추가합니다. 기존 마이그레이션은 변경하지 말고 새 마이그레이션을 추가합니다.
