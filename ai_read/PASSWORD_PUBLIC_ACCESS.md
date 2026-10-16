# MONP 비밀번호 공개 접속

> 2026-10-16: **공개 비밀번호 방식 운영 배포·새 브라우저 검증 완료**. 사용자가 2026-10-15 서버와 Vercel 배포를 완료했다. 다른 PC/모바일에서 Tailscale 설치 없이 기존 웹 주소로 접속하는 구성이다. Google 로그인 요청은 취소됐으며 단일 비밀번호 방식으로 구현했다. 실제 비밀번호는 문서/소스/Vercel env에 저장하지 않는다.

## 현재 운영 확인

- 웹 `https://monpdb.vercel.app/`, API base `https://qbix-portfolio.shop/monp-api/api`. Vercel Production은 `VITE_DATA_MODE=http` 및 위 API 주소로 배포됐다. 배포 ID는 `56TYHtUN3ijkNBNMewzmmKZ6jsjj`이며 Git commit/push 없이 local-source 배포했다.
- 2026-10-16 인증 정보가 없는 Chromium context(390×844, 별도 로컬 네트워크 권한 부여 없음)에서 웹 200·비밀번호 화면, 정상 접속 200, versions/works 200, 새로고침 후 유지, 접속 종료 204, 폐기 token 401을 확인했다. 페이지 JavaScript 오류 0, 브라우저 API 오류 응답 0. 운영 작품/이미지 데이터는 생성·변경하지 않았다.
- 비인증 works 401, MONP health UP, portfolio health ok. monp-api·monp-backup.timer·Caddy·portfolio-blue 모두 active. CLI의 Deployment Protection 안내가 있었으나 canonical production 웹은 Vercel 로그인 없이 열렸다.
- 서버 rollback 파일: `/var/backups/monp-password-release/20261015T055422Z`. 아래 배포 명령은 완료한 절차의 기록이며 다시 설치할 필요는 없다.
- 다른 물리 PC/모바일·외부 회선의 조회/저장, 운영 rollback/복구 훈련·off-host 복제, Mac/iPhone 검증은 아직 남아 있다.

## 사용자 동작과 인증

- 기존 웹 주소 `https://monpdb.vercel.app/`에서 비밀번호 화면을 먼저 표시한다. 서버가 비밀번호를 확인한 후 작품 화면을 연다. 본인용이므로 가입/아이디/Google OAuth 설정은 없다.
- API는 기존 공개 도메인의 `https://qbix-portfolio.shop/monp-api/api`를 사용한다. 새 DNS나 TLS 인증서, 공유기 포트 추가가 필요하지 않다. Caddy는 `/monp-api/*`만 기존 MONP loopback 8181로 전달하고 portfolio upstream과 기존 tailnet site를 보존한다.
- prod는 인증이 강제되며 비밀번호 hash가 없으면 시작하지 않는다. test/dev는 기본 인증을 끈다. 비밀번호는 PBKDF2-HMAC-SHA256(salt 16 bytes, 310000 rounds, key 32 bytes)로 저장하고 처음 접속할 때만 확인한다.
- 서버가 무작위 opaque bearer token을 발급하며 server memory에는 token hash만 둔다. 유효기간 8시간, 브라우저 sessionStorage로 새로고침 시 유지한다. 서버 재시작/매일 백업 후에는 다시 비밀번호를 입력해야 한다. 비밀번호 자체는 browser storage에 저장하지 않는다.
- 비인증 요청은 health 외 모든 경로를 401로 차단한다. API·이미지·backup·versions도 포함하며, 경로 정규화 우회도 차단한다. CORS preflight와 비밀번호 확인 POST는 허용한다. 허용된 origin의 401에는 CORS 헤더가 있어 UI가 비밀번호 화면으로 돌아갈 수 있다.
- 틀린 비밀번호는 IP당 10분 창에서 5번까지 허용하며 이후 429를 반환한다. 만료된 token은 401로 처리하고 cached content로 fallback하지 않는다. 로그아웃은 server token을 폐기하고 query/text cache를 지운다.
- 이미지는 Authorization header로 fetch한 blob URL을 사용하며 컴포넌트 종료 시 폐기한다. 공개 path prefix를 유지하므로 portfolio의 `/api`로 잘못 요청하지 않는다. offline text 조회는 기존 방식으로 지원한다.

## 배포 순서

검증된 release가 준비된 뒤 저장소 루트의 MiniPC 터미널에서 실행한다. 기존 전용 DB·env·uploads를 삭제하거나 다시 만들지 않는다.

```bash
sudo bash back/deploy/deploy-password-access.sh --password-hash-file /tmp/monp-password-access.hash
```

요청한 비밀번호의 hash는 이미 `/tmp/monp-password-access.hash`에 mode 0600으로 준비했다. 위 명령은 비밀번호를 다시 입력하지 않고 이를 root 0600 env에 복사한다. 임시 파일이 없으면 `--password-hash-file ...` 부분을 빼고 실행해 요청한 값을 두 번 입력한다. plaintext는 CLI argv·소스·로그·Vercel에 저장하지 않는다. script는 검증된 JAR manifest를 대조하고 기존 DB/uploads 백업을 실행한다. 이후 백업 lock을 확보하고 기존 env/current/Caddyfile 사본을 `/var/backups/monp-password-release/<timestamp>`에 보관한다.

MONP release/env 갱신 → restart/health → 무인증 works 401 확인 → 공개 Caddy path validate/reload → 공개 API 401/portfolio health 확인 순이다. 실패 시 Caddyfile·env·이전 release symlink를 복원하고 service를 재시작한다. DB migration 변경은 없으며 운영 데이터를 덮어쓰지 않는다. 이전 release로 되돌아가면 공개 path도 함께 제거하여 인증 없는 이전 JAR가 공개되지 않게 한다. 배포 후 수동 rollback도 같은 backup의 Caddyfile과 env/current를 **함께** 되돌린다.

그다음 sudo 없이 실행한다.

```bash
bash back/deploy/publish-password-web.sh
```

이 script는 Vercel CLI **64.1.0**을 사용한다. 최초에는 사용자가 브라우저에서 Vercel 로그인을 완료하고 기존 `monpdb` 프로젝트를 선택한다. 새 프로젝트나 Git commit/push를 만들지 않는다. 프로젝트 이름을 확인한 뒤 Production의 `VITE_DATA_MODE=http`, `VITE_API_BASE_URL=https://qbix-portfolio.shop/monp-api/api`를 갱신하고 변경된 로컬 소스를 production에 배포한다. 기존 Git 기반 Redeploy만 누르면 새 인증 소스가 포함되지 않으므로 이 단계가 필요하다.

두 단계 사이에는 이전 frontend가 401을 받아 조회 오류가 보일 수 있다. 서버 적용 직후 frontend 배포까지 이어서 실행한다. 비밀번호는 `VITE_` 변수나 Vercel 환경 변수에 넣지 않는다. 사용 장치에는 Tailscale/사설망 권한이 필요하지 않으며 모든 요청이 공개 HTTPS로 전송된다. 실제 외부 장치에서 확인한 뒤에만 기존 Tailscale 경로 정리를 검토한다.

## 검증 범위

운영 3306/8181과 분리해 MariaDB 13316/13317, 검증 API 18181, Caddy path proxy 18182, web preview 4174를 사용한다. HTTP E2E는 `bash back/deploy/verify-runtime.sh --http-e2e`로 재현한다. 추가한 `password-access.spec.js`는 비밀번호 미입력 차단/오답/정상 접속/refresh/업로드 이미지 blob 표시/접속 종료 후 token 무효화를 검증한다. 기존 2개 HTTP 여정은 인증 fixture를 사용하여 CRUD·관계·백업·offline text를 계속 검증한다.

2026-10-15 최종 결과: **backend 38 tests, frontend 46 files/316 tests, 공개 prefix HTTP E2E 3/3 통과**. 실제 SQL/uploads 별도 복원, lint·public build, 최종 JAR의 별도 prod startup·login·CORS·anonymous/path-alias 거부 smoke도 통과했다. Vercel CLI 64.1.0 실행과 env add 옵션 지원 확인, 실제 Caddyfile의 공개 prefix 렌더링·validation 통과. 전체 frontend는 backend build와 병행했을 때 기존 캐릭터/플롯 3건이 시간 제한/대기에서 실패했으나 빌드·runtime 종료 후 `--maxWorkers=1` 단독 실행으로 316개 모두 통과했다. Test timeout은 변경하지 않았다.

최종 JAR SHA-256은 `e009c717a70c5b97cc25e76a7204963e3484c66bece5d8149f11656204001fa0`이며 `back/deploy/password-release.sha256`에 고정했다. 사용자가 sudo 인증·Vercel 브라우저 로그인을 완료하고 서버/웹 배포를 끝냈다. 설치·로그인 대기는 해소됐으며 위 운영 확인 결과가 현재 상태다.
