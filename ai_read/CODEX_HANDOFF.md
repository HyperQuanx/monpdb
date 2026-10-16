# MONP Codex 인수인계 메모

> 갱신: 2026-10-16
> 목적: `front/`와 `back/`을 MiniPC로 복사한 뒤 그곳의 Codex가 작업을 이어갈 때 이 문서를 먼저 읽는다.

## 작업 위치와 운영 원칙

- **최우선 현재 상태(2026-10-16): 공개 비밀번호 운영 배포·새 브라우저 검증 완료.** 사용자가 서버 deploy-password-access와 Vercel publish-password-web을 성공시켰다. 웹 `https://monpdb.vercel.app/`, API base `https://qbix-portfolio.shop/monp-api/api`. 인증 정보 없는 새 Chromium에서 로컬 네트워크 권한 부여 없이 최초 gate·login 200·versions/works 200·refresh 유지·logout 204·폐기 token 401, 페이지 오류 0 확인. 비인증 works 401, 양쪽 health 정상, API/backup timer/Caddy/portfolio-blue active. 작품/이미지 데이터 변경 없음. 운영 rollback `/var/backups/monp-password-release/20261015T055422Z`, Vercel deployment `56TYHtUN3ijkNBNMewzmmKZ6jsjj`. 별도 PC/모바일 외부 회선·저장·운영 rollback/restore·off-host 복제·Mac/iPhone 검증은 남아 있다. 계획서와 [PASSWORD_PUBLIC_ACCESS.md](PASSWORD_PUBLIC_ACCESS.md)에 저장했다. 아래 미배포/sudo/Vercel/Tailscale-only 설명은 과거 기록이다. 재설치·재로그인·Git commit/push를 실행하지 않는다.

- **공개 비밀번호 방식 최종 검증 완료(2026-10-15):** backend 38, frontend 316(46 files), HTTP E2E 3/3, lint/public build, prod auth/path-alias smoke, SQL/uploads restore, Caddy draft validation 통과. 최종 JAR hash `e009c717a70c5b97cc25e76a7204963e3484c66bece5d8149f11656204001fa0`, manifest 고정. 요청 비밀번호의 private hash는 `/tmp/monp-password-access.hash`(0600)에 준비했고 plaintext는 코드/Vercel에 없다. 운영은 아직 private release다. sudo 비밀번호 및 Vercel 로그인 필요로 미반영. 사용자 터미널에서 `sudo bash back/deploy/deploy-password-access.sh --password-hash-file /tmp/monp-password-access.hash`, 이어서 sudo 없이 `bash back/deploy/publish-password-web.sh` 실행 후 실제 공개 웹과 외부 장치를 검증한다. 재승인/Google 계정 정보는 필요 없고 Git commit/push는 하지 않는다.

- **2026-10-15 공개 비밀번호 방식으로 변경:** 사용자는 다른 PC/모바일에서도 Tailscale 설치 없이 접속하기를 원하며 Google 로그인 대신 첫 접속 시 비밀번호만 입력하는 방식으로 최종 결정했다. 해당 비밀번호는 소스/문서/Vercel에 기록하지 않는다. 서버 PBKDF2 hash/8h token, 전체 경로 auth filter, password gate·이미지 bearer fetch·logout/cache clear 구현. 공개 API는 `https://qbix-portfolio.shop/monp-api/api`, frontend는 기존 Vercel 유지. 배포/backup/rollback 및 Git push 없는 Vercel local-source publish script 준비. 구현 중이며 운영은 아직 기존 private 방식이다. 검증 상태와 다음 실행 순서는 [PASSWORD_PUBLIC_ACCESS.md](PASSWORD_PUBLIC_ACCESS.md)를 먼저 읽는다. 이전 Tailscale-only 요구는 이 사용자 지시로 대체됐으며 Google 계정 이메일/Client ID는 필요 없다.

- **Vercel 실제 HTTP 연결 완료(2026-10-14):** 사용자가 Production env 변경/redeploy 완료. 현재 공개 bundle은 HTTP 모드·확정 API 주소를 포함하며 MiniPC Tailscale DNS enabled/일반 FQDN health UP이다. 로컬 네트워크 권한을 허용한 Chromium mobile viewport에서 공개 웹→실제 versions/works GET 200, page error 0/API failure 0, 작품 0개를 확인했다(읽기 전용). 신규 Chrome에서 권한 미허용 시 초기 요청이 local address space 접근 거부로 실패하므로 사용자가 사이트의 로컬 네트워크 접근을 허용해야 한다. 샘플은 운영 DB로 자동 옮겨지지 않는다. 다른 PC/iPhone 등록·whitelist 갱신·실접속/CRUD·외부 exposure·운영 복구 검증은 남아 있다. 아래 Vercel/DNS 대기는 과거 기록이다.

- **Caddy HTTPS 완료 후속:** connect script 성공, backup `/var/backups/monp-caddy/20261014T093633Z`. 실제 TLS health UP/works 200, Vercel origin CORS 200, 다른 origin·loopback source 403, portfolio HTTPS 정상. 모든 관련 unit active. API base `https://coke-nucbox-g3.tail4c5836.ts.net/api`. MiniPC는 accept-dns=false여서 일반 이름 조회가 실패하므로 사용자 터미널에서 `sudo tailscale set --accept-dns=true` 후 health를 확인해야 한다(IP 지정 TLS 검증은 완료). Vercel 로컬 CLI/auth 연결은 없으며 Production에 VITE_DATA_MODE=http와 해당 API base를 설정하고 redeploy가 필요하다. 현재 production fixture는 미변경, 실제 HTTPS 주소의 local HTTP build 완료. owner 기기는 MiniPC 한 대로 PC/iPhone 등록과 whitelist 갱신·실기기 검증은 남아 있다. 이전 Caddy/login 대기는 과거 기록이다.

- **HTTPS 활성화 후속:** CertDomains에 실제 MONP FQDN이 확인됐고 node Running/Online, health 문제 없다. connect script 최초 실행은 tailscaled 재시작 직후 cert 요청의 `no netmap available`로 Caddy 적용 전에 멈췄다. `TS_PERMIT_CERT_UID=caddy`는 적용됐다. script에 `tailscale wait --timeout=60s`와 해당 일시 오류만 최대 5번 재시도하는 처리를 추가했으며 일시 오류·권한 오류·재시도 한도 tests 통과. 사용자가 `sudo bash back/deploy/connect-tailscale-caddy.sh`를 재실행해 Caddy 적용·HTTPS 검증을 마쳐야 한다. MONP/portfolio는 정상이다.

- **Tailscale 등록 완료 후속:** Tailscale 1.104.1 설치와 사용자 로그인이 완료됐다. 실제 node는 `coke-nucbox-g3.tail4c5836.ts.net` / `100.66.211.102`, Running 상태이며 MONP/portfolio 정상이다. HTTPS CertDomains 미설정, 다른 owner 기기 0대다. `Peer=null`/`CertDomains=null` 응답 처리와 회귀 검증을 추가했다. 프론트 env 예시는 실제 `https://coke-nucbox-g3.tail4c5836.ts.net/api`로 확정했다. 다음은 사용자 DNS admin HTTPS 활성화·PC/iPhone 연결 후 `sudo bash back/deploy/connect-tailscale-caddy.sh`, HTTPS 접근 검증과 Vercel HTTP env/redeploy다. Caddy/Vercel은 아직 미변경이다. 아래 미설치/login 대기는 과거 기록이다.

- **2026-10-14 네트워크 연결 후속:** 사용자가 다음 단계 진행을 요청했다. Tailscale 미설치/sudo 인증 필요로 `install-tailscale.sh`의 관리자 실행은 시작 전에 종료했다. 공식 stable 1.104.1 설치·사용자 브라우저 로그인 script, 실제 owner 장치 whitelist와 rollback을 포함하는 Caddy 연결 script를 준비했다. 현재 Vercel bundle은 fixture 모드 확인, `.env.http.example` 추가 및 portfolio 주소를 MONP API 기본 예시에서 제거했다. 실제 등록/HTTPS/Caddy/Vercel 변경은 아직 없으며 [TAILSCALE_CONNECTION_GUIDE.md](TAILSCALE_CONNECTION_GUIDE.md)를 따른다. 먼저 사용자가 서버 터미널에서 설치/login하고 실제 FQDN을 확정해야 한다. 해당 다음 단계 요청을 다시 승인받지 않는다.

- **2026-10-14 로컬 설치 완료:** 사용자가 finish 스크립트를 실행했고 직접 상태 확인도 완료했다. MONP API와 backup timer enabled/active, backup Result=success/exit 0, `/var/backups/monp/20261014T083005Z` SQL/uploads checksum OK, MONP health UP·portfolio ok. 최초 timer 예정 2026-10-15 04:17:28 KST. 아래 sudo 대기/backup 실패는 과거 기록이며 재설치하지 않는다. 다음은 Tailscale/Caddy HTTPS 접근 구성과 Vercel HTTP API 연결이다. 해당 운영 변경 승인은 아직 받지 않았다.

- **2026-10-14 최초 설치 후속:** 사용자가 설치 명령을 실행해 전용 DB/migrations와 MONP API unit은 설치되어 enabled/active, health UP이다. 최초 backup은 Java 종료 코드 143이 systemd에서 failed로 판정되어 dump 전에 중단됐다. API는 trap으로 재시작됐고 portfolio 정상, timer는 disabled다. 예시에 `SuccessExitStatus=143`을 추가했고 실제 임시 user unit으로 failed→inactive 개선을 검증했다. `sudo bash back/deploy/finish-local-install.sh`로 기존 설치를 보존하며 drop-in 적용·backup/checksum·timer 활성화를 마무리한다. 초기 설치 스크립트를 다시 실행하지 않는다. 에이전트 sudo는 비밀번호 필요로 미실행이므로 서버 터미널에서 인증해야 한다. 이 후속 상태가 아래 설치 전 기록보다 우선한다.

- **2026-10-14 사용자 확인:** MONP frontend는 `https://monpdb.vercel.app/`에 Vercel 배포되어 있으며 CORS origin은 `https://monpdb.vercel.app`이다. frontend 주소 확인은 완료했고 운영 설치 승인은 아직 대기 중이다.
- **2026-10-14 설치 승인 완료:** 사용자가 전용 DB·서비스·백업 타이머 설치를 명시적으로 승인했다. `sudo -n`으로 설치를 시도했지만 비밀번호가 필요해 설치 전에 종료했다. 해당 설치에 재승인을 요청하지 않는다. 사용자 서버 터미널에서 `sudo bash back/deploy/install-local.sh https://monpdb.vercel.app`를 실행한 뒤 결과를 검증한다. Tailscale/Caddy/Vercel 변경은 아직 별도 승인 범위다.

- **2026-10-12 갱신:** 현재 작업 위치는 MiniPC `coke-NucBox-G3`의 `/home/coke/Desktop/code/monp_db_re`다. 직접 서버 점검과 분리 DB/HTTP/백업 복구 검증을 마쳤다. [MINIPC_DEPLOYMENT_REVIEW.md](MINIPC_DEPLOYMENT_REVIEW.md)와 서버 가이드가 현재 Task 20 진행 상태의 기준이다. 아래 노트북/미접속 설명은 이전 인수인계 기록이다. 운영 DB·unit·Caddy·방화벽은 아직 변경하지 않았으며 실제 frontend origin과 운영 적용 승인이 필요하다.

- 다음 단계의 서버 환경 확인과 배포는 MiniPC에서 한다. 노트북은 구현·검증에 사용했다.
- 이 프로젝트는 아직 GitHub에 올리지 않았다. `front/`의 변경사항은 commit/push하지 않았고, `back/`은 현재 front의 Git 저장소 바깥에 있다. 새 Codex 작업은 `front/ai_read/CODEX_HANDOFF.md`, `MONP_DB_IMPLEMENTATION_PLAN.md`, `SERVER_INFO.md`를 차례로 읽는다.
- 사용자는 `front/`와 `back/` 폴더를 MiniPC로 복사해 그 환경에서 Codex로 작업할 예정이다. 복사본의 파일이 이 작업공간과 같은지 확인하고, 기존 파일을 덮어쓰기 전에 서버 쪽 사본과 설정을 확인한다.
- MiniPC 서버 변경 전까지 현재 운영 Caddy·portfolio 서비스·방화벽·공유기·DB와 운영 데이터는 그대로 둔다. `/etc/portfolio/portfolio-common.env`는 MONP에서 재사용하지 않는다.
- `SERVER_INFO.md`는 기존 portfolio 인프라의 참고 문서다. 호스트명·포트·경로·DNS·SSH 포워딩이 현재 상태와 같은지 서버에서 먼저 확인한다. env 파일과 secret의 값을 터미널 출력, 문서, 로그, Git에 기록하지 않는다.
- 로컬 테스트 DB는 노트북 `/tmp/monp-db-tools/`에 만들었던 버리는 MariaDB다. MiniPC로 옮기지 않으며 운영 데이터가 아니다. 서버에서 별도 DB·DB user·upload 경로를 만든다.

## 현재 구현 상태

### Task 17~19: 노트북에서 구현 및 검증 완료

- **Task 17:** 작품, 전역 메뉴, 보관/복원, 순서 변경 API. V2 migration과 ETag/If-Match 낙관적 잠금. 기본 메뉴만 seed하며 샘플 작품은 backend 시작 때 넣지 않는다.
- **Task 18:** 6종 콘텐츠와 사용자 정의 자료, 관계, 검색, 아이디어 변환, 이미지, JSON 백업/미리보기/복구 API. V3/V4 migration과 입력·관계·이미지 검증 포함.
- **Task 19:** `VITE_DATA_MODE=fixture|http` repository 전환, HTTP API client, CORS 설정, ETag, IndexedDB 텍스트 cache(7일), 이미지 cache 제외, offline writes 차단, Capacitor Network 연결.
- 프론트 fixture 세션의 작품 repository와 콘텐츠 repository 상태 공유 버그도 수정했다.
- 검증 완료: backend 33 tests; frontend 45 files/313 tests; 기존 web Playwright 77/77; HTTP E2E 2/2; fixture/HTTP production build; lint; npm audit 0 vulnerabilities. MiniPC에서는 검증하지 않았다.
- 주요 계약 설명은 `API_AND_BACKUP_CONTRACTS.md`; API schema JSON은 `../../back/src/main/resources/contracts/schemas.json`이다.

### Task 20: MiniPC 배포 준비, 실제 배포 미완료

- **현재 결과:** backend 33 tests, frontend 313 tests, lint·fixture/HTTP build, HTTP E2E 2/2, prod health/docs/CORS/restart, 실제 SQL/upload 별도 복원 통과. 동시 빌드로 인한 frontend timeout은 1 worker·build 순차 실행으로 해소했다. Tailscale/Docker는 미설치, sudo 비밀번호 필요. 실제 Caddy+draft/staged systemd 검증은 통과했고, 최초 설치 스크립트·backup timer·tailnet Caddy 초안을 준비했다. `back/deploy/install-local.sh`는 **승인 후에만 실행**한다. 세부 경로와 검증 범위는 배포 검토 결과 문서를 따른다.

- `MINIPC_MONP_SERVER_GUIDE.md`에 배포 구조/runbook이 있다.
- `../../back/deploy/monp-api.service.example`, `monp-api.caddy.example`, `backup-monp.sh.example`은 예시 파일이다. `example.invalid` host와 경로를 실제 값으로 바꾸고 검토하기 전에는 설치·실행하지 않는다.
- 확인할 사항: SSH 접속 alias/계정/포트, OS/Java/MariaDB/Caddy/systemd 버전, portfolio의 실제 unit·listen 포트, Caddyfile과 import 경로, 현재 DNS/TLS, Tailscale 설치·ACL, UFW와 공유기 설정, 디스크/백업 위치. 비밀값은 읽거나 복사해 출력하지 말고 파일 권한·변수 존재 여부만 확인한다.
- 현재 backend는 로그인 기능이 없는 개인용 API다. CORS는 인증이 아니다. 공개 쓰기를 열지 말고 Tailscale 접근 제어를 적용·검증한다. Spring은 loopback `127.0.0.1:8181`, DB는 loopback 전용이어야 한다.
- 서버에 배포하기 전 별도 `monp` DB/user, `/etc/monp/monp-api.env`(root 0600), `/var/lib/monp-api/uploads`, systemd service, 접근 제한된 별도 Caddy host를 준비한다. portfolio env/DB/reverse proxy를 공유하지 않는다.
- Caddy 적용 전 설정 백업과 `caddy validate`가 필요하다. health, CORS preflight, 허용/거부 클라이언트, 외부 port scan, restart·rollback을 검증한다. `/healthz`는 DB를 포함하므로 UP이면 200, DB down이면 503이다.
- DB와 uploads를 같은 시점에 백업한다. 복구는 우선 별도의 임시 DB/경로에서 검증하고, production restore는 대상·시점을 확인한 후 진행한다. 자동화 스크립트는 예시이며 실제 timer·off-host 복제·복구 훈련은 미설정이다.

### Task 21: iOS scaffold, Mac 검증 미완료

- `front/ios/` Capacitor iOS 프로젝트, `front/capacitor.config.json`, 기존 로고 기반 icon/splash asset이 준비됐다.
- 버전: Capacitor core/iOS 8.5.2, Network 8.0.1, CLI 8.4.3. CLI를 8.4.3으로 고정한 후 npm audit 0건 확인. `npx cap sync ios` 성공.
- iOS 실제 빌드는 `front/.env.ios.local`에 Tailscale로 iPhone에서 접속 가능한 HTTPS API 주소가 있어야 한다. 파일은 Git에 포함하지 않는다. API 주소가 없거나 placeholder/HTTP면 `npm run build:ios`가 의도적으로 실패한다.
- Node.js 22+와 Xcode 26+가 필요하다. Mac에서 signing team, simulator/실기기, safe area, keyboard, back gesture, orientation, background/foreground, network 변경, deep/universal links를 확인한다. 아직 App Store 또는 TestFlight에 올리지 않는다.

## MiniPC에서 시작할 순서

1. Codex가 이 문서와 `MONP_DB_IMPLEMENTATION_PLAN.md`, `SERVER_INFO.md`, `MINIPC_MONP_SERVER_GUIDE.md`를 읽는다.
2. 복사된 소스와 문서 상태를 확인한다. 먼저 **읽기 전용으로** 서버 OS, Java/Node, MariaDB, 서비스, 포트, Caddy import 구조, Tailscale 상태를 조사하고 결과에서 secret을 제거해 기록한다.
3. 실제 서버 상태가 `SERVER_INFO.md`와 다르면 runbook/sample을 현재값에 맞춰 수정하고, 포트·도메인·Tailscale ACL을 정한다. DNS나 firewall/router, 기존 Caddy/portfolio 설정은 먼저 변경하지 않는다.
4. 로컬 환경으로 `back/` 빌드/통합 테스트를 재현한다. Docker가 없으면 폐기 가능한 `*_test` MariaDB를 사용한다. MiniPC 운영 DB를 테스트 DB로 지정하지 않는다.
5. 검증된 release JAR와 해시를 만든 뒤 전용 DB/user·upload 경로·prod env·systemd·Caddy draft를 준비한다. 공개 노출 여부와 rollback/backup이 검토된 후에만 운영 적용한다.
6. 서버 health/CORS/security/backup restore를 확인하고, 웹 HTTP build의 실제 HTTPS API URL을 설정한다. Vercel env나 production site를 바꾸기 전 변경 내용을 준비하고 승인받는다.
7. 이후 Mac에서 iOS build·실기기 시연을 진행하고, 최종 Task 22의 web/API/iPhone 공유 데이터와 복구 흐름을 검증한다.

## 중요한 미완료 및 알려진 한계

- MiniPC SSH 정보와 실제 서버 상태가 아직 확인되지 않았다. 이 정보가 있어야 읽기 전용 점검과 배포가 가능하다.
- Vercel production API 주소/환경 변수는 확정·변경하지 않았다. `SERVER_INFO.md`에 나오는 portfolio domain/path를 MONP API 주소라고 가정하지 않는다.
- HTTP detail 화면 일부는 항목 404와 다른 조회 오류를 모두 “찾을 수 없음”으로 표현한다. API 자체는 problem code/status를 구분한다. Task 19 후속 UX 항목으로 검토한다.
- 검색/최근 API, cache와 탐색 adapter는 일부 화면에서 snapshot 기반 frontend 순수 함수를 재사용한다. `/recent` 서버 응답 형식은 현재 frontend가 사용하지 않는 점을 염두에 두고 OpenAPI 계약과 실제 호출을 대조한다.
- Task 18 통합 테스트는 N+1 query-count 전용 gate를 포함하지 않는다. 구현은 snapshot 조회 시 작품·메뉴·컬렉션·관계를 묶어 읽지만, MiniPC 성능을 검증한 것은 아니다.
- 변경사항은 commit/push되지 않았다. 사용자가 요청하기 전 commit/push, GitHub 업로드, 배포, DNS/firewall/router 변경을 하지 않는다.
