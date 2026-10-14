# MONP Codex 인수인계 메모

> 갱신: 2026-10-12
> 목적: `front/`와 `back/`을 MiniPC로 복사한 뒤 그곳의 Codex가 작업을 이어갈 때 이 문서를 먼저 읽는다.

## 작업 위치와 운영 원칙

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
