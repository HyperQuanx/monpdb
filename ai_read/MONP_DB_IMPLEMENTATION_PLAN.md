# MONP DB 다작품 소설 설정 관리 시스템 구현 계획

## 1. 목표와 구현 순서

현재 React/Vite 캐릭터 프로토타입을 기반으로 다음 순서대로 구현한다.

1. 정적 샘플 데이터로 전체 웹 프론트엔드 완성
2. 저장소 루트 `back/`에 Spring Boot 3·Java 17·MariaDB 백엔드 구축 (Task 16에서 3.x OSS 지원 종료로 Spring Boot 4.1.1(Java 17)로 결정)
3. MiniPC에 기존 포트폴리오와 충돌 없이 배포
4. Capacitor로 iPhone 앱 제작
5. iPhone에서 텍스트 오프라인 조회 지원

각 Task는 아래 순서대로 하나씩 구현한다. 테스트 우선으로 진행하고 관련 테스트·lint·build를 통과시킨 뒤 다음 Task로 이동한다. 각 Task 종료 시 변경 내용, 검증 결과, 시연 가능한 기능을 보고한다.

## 구현 진행 현황

> 마지막 갱신: 2026-10-18

> **2026-10-18 Task 20 후속 준비·분리 검증:** 공개 웹 200/무인증 API 401/CORS 허용 200·거부 403, 서비스 4개 active/백업 success, DB·API loopback 확인. 분리 DB runtime 훈련 재실행으로 재시작 저장 유지·백업 checksum·dump 실패 후 재시작·SQL/uploads 복원·이미지 조회 통과. 운영 백업 파일은 root 권한으로 아직 미열람이며 운영 rollback/restore 미실행. 읽기 전용 복구 사전 점검 및 기본 계획 모드 SSH 복제 도구와 손상/실패/기존 사본 보존 검증을 추가했다. [TASK20_OPERATIONS_CHECKLIST.md](TASK20_OPERATIONS_CHECKLIST.md)의 실제 외부 기기 절차·복구 대상/백업 시점 확인·외부 저장 대상 확정 후 이어간다. 원격 복제 미구성, Task 20~22 미완료 유지. 기존 미커밋 변경 보존, commit/push 없음.

> **새 채팅 인수인계 저장(2026-10-17):** [CODEX_HANDOFF.md](CODEX_HANDOFF.md) 상단에 현재 MiniPC 작업공간·공개 비밀번호 운영 구성·최신 디자인 배포 ID·미커밋 수정·검증 범위·Task 20~22 미완료 항목·재배포 방법을 정리했다. 새 창에서는 이 최신 요약을 먼저 읽으며 아래 과거 설치/승인 대기 기록을 현재 상태로 해석하지 않는다. 이번 요청 작업과 배포/검증은 종료됐다.

> **2026-10-17 모던 디자인 전환:** 사용자 요청으로 공통 청록색 테마를 흰색·차콜·회색으로 교체했다. 로그인은 wordmark/큰 문구/접속 폼의 데스크톱 2열·모바일 1열로 재구성하고, 버튼·카드·헤더·사이드바·하단 탐색·작품 홈의 색상/그림자/여백/타이포그래피를 정리했다. 사용자 작품의 표지·저장된 강조색 데이터는 유지하며 신규 작품 기본 강조색은 회색이다. 키보드 focus는 파란색으로 명확하게 표시한다. 기존 로그인/작품 선택/관리 단위 테스트 5개, 주요 화면 모바일·데스크톱 WCAG 및 작품 관리 브라우저 테스트 11개, lint/build 통과. 로그인·선택·홈은 1440/390/320px에서 가로 넘침 0, 로그인 WCAG 검사 통과. 캡처를 직접 확인했다. **Vercel production `4v6E2Dm9bSUXRufzy2yQZMn19LBT` 배포 완료**. 공개 주소의 새 브라우저에서 웹 200·새 로그인 문구·차콜 버튼 실제 색상 `rgb(32, 33, 36)`·390px overflow 0·페이지 오류 0을 확인했다. 서버/DB 변경과 Git commit/push는 없다.

> **2026-10-16 작품 입력 간소화:** 작품 추가/수정 화면의 슬러그 입력란을 제거했다. 신규 작품의 내부 slug는 UUID로 자동 생성하고 기존 작품 수정 시 기존 slug를 보존한다. 기존 작품 관리 단위 테스트와 모바일 크기 Chromium 추가/보관/복구 여정 각 1개, lint/build 통과. Vercel production 재배포 `EX4k7LfmSijGTUumAKGAbbJBddrE` 완료 후 실제 공개 작품 관리 bundle의 입력란 제거·자동 생성 포함을 확인했다. 운영 DB/API 변경과 Git commit/push는 없다.

> **현재 운영 상태:** 공개 HTTPS + 최초 비밀번호 접속 **배포 완료**. 사용자가 2026-10-15 서버 배포와 Vercel local-source production 배포를 모두 완료했다. 웹은 `https://monpdb.vercel.app/`, API base는 `https://qbix-portfolio.shop/monp-api/api`다. Google 로그인·기기별 Tailscale 설치는 필요 없다. 비밀번호 자체는 문서/소스/Vercel에 저장하지 않는다. [PASSWORD_PUBLIC_ACCESS.md](PASSWORD_PUBLIC_ACCESS.md)가 현재 접속 방식의 기준이다.

> **2026-10-16 중단 지점부터 운영 검증 완료:** 인증 정보가 없는 새 Chromium context(390×844, 로컬 네트워크 접근 권한 부여 없음)에서 공개 웹 200·최초 비밀번호 화면 → 비밀번호 확인 200 → versions/works 조회 200 → 새로고침 후 접속 유지 → 접속 종료 204 → 폐기한 token으로 works 요청 401을 확인했다. 페이지 JavaScript 오류 0, 브라우저 API 오류 응답 0. 비인증 works는 401이며 MONP health UP·portfolio health ok, monp-api/monp-backup.timer/Caddy/portfolio-blue 모두 active다. 운영 작품/이미지 생성·수정은 하지 않았다. CLI의 Deployment Protection 안내와 별개로 canonical production 주소는 인증 없는 새 브라우저에서 Vercel 로그인 없이 열렸다.

> **검증된 구현과 배포 이력:** backend 38 tests, frontend 46 files/316 tests, 공개 prefix HTTP E2E 3/3, lint/build, 최종 prod auth smoke, 분리 DB/uploads backup restore와 Caddy validation 통과. 운영 rollback 파일은 `/var/backups/monp-password-release/20261015T055422Z`. Vercel deployment ID `56TYHtUN3ijkNBNMewzmmKZ6jsjj`, Production env는 HTTP 모드와 위 공개 API base다. Git commit/push는 하지 않았다.

> **남은 범위:** 별도 PC·모바일의 실제 외부 회선에서 조회/저장, 운영 rollback·복구 훈련, off-host 백업 복제와 Task 21 Mac/Xcode/iPhone 실기기 검증은 미완료다. MiniPC의 새 브라우저 검증을 다른 물리 장치의 검증으로 간주하지 않는다. Task 20~22 전체는 아직 완료 처리하지 않는다. 아래 Tailscale-only 구성·설치 승인/sudo/Vercel 대기는 과거 진행 이력이며 현재 운영 상태보다 우선하지 않는다.

> Caddy HTTPS 후속: 운영 MONP site validation/reload·TLS health/works·Vercel origin CORS 허용·다른 origin/source 차단 검증 완료, portfolio 정상. MiniPC DNS 사용 활성화가 필요하며 현재 미실행이다. Vercel Production HTTP env/redeploy·다른 PC/iPhone 등록과 조회/저장·공개 인터넷 exposure/복구 검증은 아직 남아 있다. API base는 `https://coke-nucbox-g3.tail4c5836.ts.net/api`.

> Tailscale 후속: 1.104.1 설치·사용자 로그인 완료, Running. node `coke-nucbox-g3.tail4c5836.ts.net`로 확정했으며 frontend env 예시 반영 완료. HTTPS CertDomains는 비어 있고 PC/iPhone 추가 등록 전이므로 DNS admin HTTPS 활성화와 Caddy 적용·실접속 검증·Vercel HTTP env/redeploy가 남아 있다. 로컬 MONP/backup/portfolio 정상 상태를 유지한다.

> 네트워크 연결 준비: 다음 단계 진행 요청에 따라 Tailscale 1.104.1 signed apt 설치/login 및 owner-device whitelist Caddy script를 준비했다. sudo·사용자 로그인 대기로 실적용 전이다. 공개 Vercel bundle은 fixture 모드 확인, 실제 FQDN이 확정되고 HTTPS 접근이 검증된 뒤 Vercel HTTP env/redeploy를 진행한다. 자세한 순서는 `TAILSCALE_CONNECTION_GUIDE.md`를 따른다.

> 2026-10-14 최신 상태: 전용 MONP DB·API service·backup timer **로컬 운영 설치 완료**. API/timer enabled·active, 최초 backup 성공 및 SQL/uploads checksum OK, MONP health UP·portfolio 정상. Task 20의 Tailscale/Caddy HTTPS·장치 접근 제어·외부 노출·운영 복구 검증과 이후 Vercel HTTP 연결은 남아 있다. 아래 승인/sudo/backup 실패 대기 설명은 설치 과정 기록이다.
>
> 현재 상태: **Phase A(Task 1~15) 완료. Task 16~19 구현·검증 완료. Task 20 MiniPC 직접 점검·분리 DB build/HTTP/backup restore 검증 완료, 전용 DB·systemd·Tailscale·Caddy 운영 적용 승인 대기. Task 21 Capacitor iOS scaffold·앱 자산 준비 중(Xcode/실기기 검증은 Mac 필요). 다음 환경으로 작업을 옮길 때 `CODEX_HANDOFF.md`를 먼저 읽는다.**
> 이 섹션이 현재 구현 상태의 기준이며, 아래 `3. 현재 코드 분석 요약`은 Task 1 시작 전 초기 분석 기록이다.

> 2026-10-14 후속: 전용 MONP DB·서비스·백업 타이머 **설치 승인 완료**. 설치 실행은 sudo 비밀번호가 없어 시작 전에 종료됐으며 서버 터미널의 관리자 인증이 필요하다. 해당 설치 승인은 유지한다. Tailscale/Caddy 운영 적용은 아직 미승인·미실행이다.

> 2026-10-14 설치 실행 후: 사용자가 터미널에서 설치하여 전용 DB/Flyway V1~V4·API unit 설치 완료, MONP health UP·portfolio 정상. 최초 backup은 Java exit 143을 failed로 판정해 중단되었고 timer는 미활성이다. `SuccessExitStatus=143` 수정은 임시 user systemd unit에서 검증했다. `finish-local-install.sh`의 sudo 실행으로 backup 재검증·timer 활성화가 필요하며 에이전트에는 sudo 인증이 없다. Task 20은 아직 미완료다.

### 완료된 Task

#### [x] Task 17: Work/Menu/Archive API (2026-10-07)

- `/api/v1/works`, `/api/v1/menu/sections`, `/api/v1/menu/items`, tree, reorder, archive/restore 구현.
- V2 migration: 작품·섹션·메뉴, unique slug, FK, 버전, 메뉴 트랜잭션 잠금. 기본 6개 섹션·31개 메뉴만 초기화하며 운영 DB에 샘플 작품은 넣지 않음.
- JSON DTO는 프론트 Zod에서 추출한 계약을 서버가 검증. 데이터는 FK/index 컬럼 + JSON document로 저장하고 Spring JDBC 트랜잭션 사용(JPA 프록시/N+1 없이 DTO 유지).
- `ETag`/`If-Match` 기반 낙관적 잠금. 누락 428, 버전 충돌 409. reorder에는 모든 active ID와 버전 필수, 한 항목 충돌 시 전체 롤백.
- 작품·섹션 보관은 부모 접근 차단으로 하위 항목을 함께 숨기고, 하위 항목의 기존 보관 상태와 관계를 보존.
- 프론트 작품 저장소를 콘텐츠 공유 상태에 연결: 새 작품의 콘텐츠 생성·백업, 작품 수정 정보 반영 회귀 테스트 추가.
- 노트북 `/tmp`에 분리한 MariaDB 10.11.14에서 backend 26개 통과. frontend 44 files/309 tests, lint/build 통과. MiniPC 운영 변경 없음.

#### [x] Task 18: Specialized content/relation/search/image/export API (2026-10-07)

- 세계관·플롯·설정·아이디어·메모·일반 자료와 관계 API를 추가했다. 작품 단위 스냅샷/검색/최근, 아이디어 변환, JSON 백업·미리보기·복원, UUID 이미지 저장/조회도 포함한다.
- V3 콘텐츠/관계와 V4 이미지 metadata migration 추가. same-work foreign keys, DTO schema validation, plot reference integrity, MIME/signature·pixel 검사, `ETag`/`If-Match`를 적용했다.
- `/api/v1` OpenAPI 및 프론트 Zod 계약에서 생성한 JSON schemas를 유지한다. 사용자 데이터와 샘플 작품을 운영 DB 시작 시 seed하지 않는다.
- 검증: 분리 MariaDB 10.11.14에서 backend **33 tests 통과**, front **313 tests 통과**, lint/build 통과. HTTP Playwright **2 tests 통과**(저장·관계·수정·새로고침·백업/복원·오프라인 text·6종 전문 editor).

#### [x] Task 19: Front HTTP connection과 text offline read cache (2026-10-07)

- `VITE_DATA_MODE=fixture|http` 전환과 repository adapter, API timeout/cancel·ETag/If-Match, 정확한 CORS 허용 origin, offline write block을 추가했다.
- React Query persistent cache와 별도 text response cache를 IndexedDB에 저장한다. 7일 TTL/buster를 적용하고 이미지/data URL은 저장하지 않는다. 서버 outage와 브라우저 offline에서 저장된 text를 읽고 편집은 차단한다.
- Capacitor Network plugin 상태를 web online/offline 이벤트와 연결했다. API fallback은 네트워크 오류·일부 5xx만 허용한다.
- 검증: front **45 files/313 tests**, lint, fixture/HTTP build, 기존 Playwright **77/77**, HTTP browser **2/2** 통과. npm audit **0 vulnerabilities**(Capacitor CLI 취약 patch와 아이콘 tool 제거 후).

#### [ ] Task 20: MiniPC deployment와 server guide (2026-10-16 공개 비밀번호 운영 배포·브라우저 검증 완료, 외부 실기기/운영 복구 검증 남음)

- **최신 상태:** 전용 DB·API·일일 백업 timer와 공개 Caddy prefix, Vercel 비밀번호 화면까지 운영 배포 완료. 공개 새 브라우저에서 인증/조회/refresh/logout·token 폐기 검증 통과. 별도 장치·외부 회선, 운영 rollback/복구와 off-host 복제가 남아 있다. 아래 환경/승인 대기 항목은 2026-10-12~14 점검 당시 이력이다.

- `front/ai_read/MINIPC_MONP_SERVER_GUIDE.md`에 전용 systemd service, Tailscale에서만 허용하는 Caddy host 예시, prod env, setup/rollback/backup/restore/runbook을 작성했다.
- `coke-NucBox-G3`에서 직접 확인: Ubuntu 24.04.2, Java 17.0.18, Node 22.22.1, MariaDB 10.11.14, Caddy 2.6.2. portfolio Blue 8081 active, MONP 8181 미사용, DB loopback. Tailscale/Docker 미설치이며 `sudo`는 비밀번호가 필요하다.
- 분리 MariaDB 13316/13317에서 backend **33 tests**, frontend **313 tests**(`--maxWorkers=1`), lint, fixture/HTTP build, HTTP Playwright **2/2**, prod health/docs/CORS/restart, dump·uploads checksum·별도 DB/경로 복원 및 이미지 조회 통과.
- 백업 중 MONP만 잠시 중지해 SQL/upload 일관성을 확보하고 실패 시 재시작하는 trap, flock, SHA256SUMS, daily timer를 추가했다. lifecycle은 mock systemctl로 검증했고 실제 운영 unit은 미설치다. shared MiniPC JVM heap을 512MiB로 제한했다.
- `back/deploy/`에 검증 재현 스크립트, checksum 고정 최초 로컬 설치 스크립트, env와 tailnet IPv4/IPv6 Caddy 초안을 준비했다. 기존 Caddy+초안 및 staged systemd validation 통과. 운영 Caddy·DB·service·firewall·router는 변경하지 않았다.
- 2026-10-14 사용자가 frontend Vercel 주소를 확인했다: CORS origin `https://monpdb.vercel.app`. Tailscale owner enrollment/ACL/MagicDNS FQDN과 운영 설치 승인은 아직 필요하다. TLS·외부 노출·운영 restart/rollback·off-host 복제 검증 후 Task 20을 완료한다. [MINIPC_DEPLOYMENT_REVIEW.md](MINIPC_DEPLOYMENT_REVIEW.md)에 결과·JAR hash·적용 범위를 기록했다.

#### [ ] Task 21: Capacitor iOS project와 iPhone UX (scaffold 완료, Mac 검증 필요)

- Capacitor core/iOS **8.5.2**, Network plugin **8.0.1**, CLI **8.4.3**으로 pin했다. npm audit은 0 vulnerabilities다. CLI는 현재 보안 수정 경로를 택한 같은 major의 8.4.3을 쓴다.
- `front/ios/`에 Swift Package Manager Xcode project를 만들고 기존 MONP 로고로 iOS icon/splash asset을 준비했다. safe area와 네이티브 Network status 반영을 설정했다.
- `npm run cap:sync:ios` 동기화는 성공했다. iOS production build는 `.env.ios.local`의 실제 HTTPS API host가 없으면 거부하도록 했다.
- Simulator/실기기, Universal Links, 키보드/back gesture, 백그라운드 복귀는 macOS/Xcode가 필요해 미검증이다. iOS build workflow는 `front/README.md`에 기록했다.

#### [x] Task 16: `back/` Spring Boot·MariaDB foundation (Docker 환경의 Testcontainers 실행 확인만 남음)

##### 버전 결정

- Spring Boot 3.x는 2026-06-30에 OSS 지원이 끝났다([endoflife.date](https://endoflife.date/spring-boot)). 1절의 "Spring Boot 3" 대신, Task 16 지침("Java 17-compatible maintained")에 맞춰 Java 17에서 도는 **Spring Boot 4.1.1**(Initializr 기본 GA)을 썼다. 3.5.x로 바꾸려면 plugin 버전과 Boot 4 전용 test starter만 바꾸면 된다.
- 관리 의존성은 Boot BOM이 고정한다: Spring Framework 7, Tomcat 11.0.24, Hibernate 7.4.5, Flyway 12.4.0 + `flyway-mysql`, Testcontainers 2.0.5, Jackson 3. BOM 밖의 springdoc은 `3.1.0`으로 직접 고정했다.
- Gradle Wrapper 9.7.1: wrapper jar를 Gradle 공식 SHA-256과 대조했고, `distributionSha256Sum`으로 배포본 checksum을 고정했다.
- Java package `shop.qbixportfolio.monp`, artifact `monp-api`, 배포 파일 `build/libs/monp-api.jar`(plain jar 비활성화).

##### 구현

- 설정(`application.yml`, `application-prod.yml`):
  - `127.0.0.1:8181`에만 bind한다(`MONP_SERVER_ADDRESS`, `MONP_SERVER_PORT`). portfolio가 8081/8082를 쓴다.
  - DB는 `MONP_DB_URL`/`MONP_DB_USERNAME`/`MONP_DB_PASSWORD`. `prod` profile에는 기본값이 없고, 빠지면 `ProductionEnvironmentCheck`가 DataSource를 만들기 전에 빠진 변수 이름을 알려 주며 멈춘다. 이 검사가 없으면 Boot가 `${MONP_DB_URL}`을 글자 그대로 넘겨 "'url' must start with jdbc"처럼 엉뚱한 오류가 났다.
  - Flyway가 schema를 관리하고 Hibernate는 `ddl-auto=validate`, `open-in-view=false`, UTC 저장.
  - `forward-headers-strategy=native`(같은 host의 Caddy가 보내는 X-Forwarded-*).
  - springdoc은 `/api/**`만 문서화한다. `prod`에서는 `/v3/api-docs`와 Swagger UI를 기본으로 끈다.
- `/healthz`: actuator health를 `/healthz`로 옮기고 다른 actuator endpoint는 노출하지 않는다. 세부 정보는 숨긴다. DB가 포함되어 MariaDB가 멈추면 503 `DOWN`이다.
- Problem Details(`error/ApiExceptionHandler`): 모든 MVC 오류를 RFC 9457 `application/problem+json`으로 보낸다. `code`(검증 `validation_failed`, `ApiException` code, 그 밖에는 HTTP 상태 snake_case)와 `instance`를 붙이고, 검증 오류는 `errors[{field, message}]`로 준다. body 검증과 `@RequestParam` 검증이 같은 형식이다. 예상 못 한 예외는 로그에만 남기고 내부 메시지를 응답에 넣지 않는다.
- `V1__database_defaults.sql`: DB 기본 문자셋을 `utf8mb4`/`utf8mb4_unicode_ci`로 맞춘다. DBA가 latin1로 만든 DB도 이후 table은 한국어를 안전하게 저장한다.
- OpenAPI 3.1 문서(`MONP DB API`, `v1`)에 인증이 없다는 경고와 오류 형식을 적었다. 아직 API path는 없다(Task 17부터).
- `back/README.md`: 스택, 명령, 테스트 DB 선택, 환경 변수, endpoint, 오류 형식, migration 규칙, 보안.

##### 검증 중 찾아 고친 문제

- Hibernate 시작 로그(HHH10001005)가 MariaDB driver가 돌려준 JDBC URL을 **비밀번호째 평문으로** 출력했다. 서버에서는 journald에 남는다. 해당 logger를 WARN으로 낮추고 설정 테스트로 고정했다. 이후 build·test 출력과 test report에서 비밀번호 문자열이 0건인지 확인했다.
- MariaDB를 멈추자 `/healthz`가 Hikari 기본 connection timeout 때문에 **30초** 뒤에야 503을 돌려줬다. `connection-timeout`을 5초로 줄여 5초 안에 503이 나오는 것을 확인했다.

##### 테스트 (23개)

- `ConfigurationDefaultsTest`(5): 설정 파일만 읽어 host 환경과 무관하게 loopback·8181, `validate`, health만 노출, prod 필수 값·문서 비활성화, 5초 timeout, 로그 비밀번호 차단을 검사한다.
- `ApiExceptionHandlerTest`(7, `@WebMvcTest`, DB 불필요): 404, body 검증, parameter 검증, 깨진 JSON, 405, `ApiException` 409, 500에서 내부 메시지 미노출.
- `ProductionEnvironmentCheckTest`(2), `TestcontainersConfigurationTest`(2): 필수 변수 검사, 외부 테스트 DB 이름 안전장치.
- 통합(`@IntegrationTest`, 한 context 공유): `HealthzIntegrationTest`(3), `FlywayMigrationIntegrationTest`(2), `OpenApiIntegrationTest`(2).
- 통합 테스트 DB: 기본은 Testcontainers `mariadb:10.11.14`(서버와 같은 버전). Docker가 없으면 `MONP_TEST_DB_URL` 등으로 버려도 되는 MariaDB를 지정한다. DB 이름에 `test`가 없으면 Flyway 전에 거부한다.

##### 실행한 검증 (2026-10-01)

- 이 개발 PC에는 Java·Docker가 없고 sudo 비밀번호가 필요하다. JDK는 sudo 없이 Temurin 17.0.20.1을 `~/.jdks/`에 설치했다(SHA-256 확인).
- Docker 대신 Ubuntu 패키지 MariaDB **10.11.14**(서버와 같은 버전)를 `/tmp`에 풀어 사용자 권한으로 띄웠다. 테스트 DB를 일부러 latin1로 만든 뒤 `./gradlew clean build --warning-mode all`: **23/23 통과**, Gradle deprecation 경고 0건. 검증 후 임시 MariaDB는 지웠다.
- jar 시연: `/healthz` 200 `UP` → MariaDB 중지 시 5초 안에 503 `DOWN`, `/v3/api-docs`·Swagger UI 200(prod에서는 404), 없는 `/api/v1/works`는 404 problem+json, `/actuator/env` 404, `127.0.0.1:8181`에만 listen, prod에서 DB 변수 없으면 빠진 이름을 알리고 종료.
- **확인하지 못한 것**: Testcontainers 컨테이너 모드(`MONP_TEST_DB_URL` 없이 `./gradlew test`)는 Docker가 없어 실행하지 못했다. Initializr가 만든 구성에 image만 고정한 것이지만, Docker가 있는 PC나 CI에서 한 번 돌려 확인해야 한다.

#### [x] Task 15: 전체 Web milestone 검증 및 Vercel 정리

##### 정리 작업

- 쓰지 않는 파일 삭제:
  - Vite template 자산 `public/favicon.svg`, `public/icons.svg`
  - 쓰지 않는 placeholder `src/pages/HomePage.jsx`, `src/pages/TaskPlaceholderPage.jsx`, `TaskPlaceholderPage.module.css`
  - 삭제는 working tree에만 있고 staging하지 않았다.
- `src/pages/ErrorPage.jsx`(root error boundary)를 실제 화면으로 교체했다.
  - 없는 URL(404): "페이지를 찾을 수 없습니다"
  - route chunk 다운로드 실패: "화면을 불러오지 못했습니다"
  - 그 밖의 오류: "문제가 발생했습니다"
  - 작품 선택으로 돌아가기 버튼과, 404가 아닐 때는 새로고침 버튼을 둔다. `WorkRouteErrorPage.module.css`에 `.actions`를 추가했다.
- `index.html`: 기존 icon·description에 더해 `apple-touch-icon`, `apple-mobile-web-app-title`, Open Graph(`og:*`), `color-scheme`, `format-detection`, `noscript` 안내, `robots noindex`를 추가했다.
- `vercel.json`:
  - SPA rewrite에서 `/assets`, `/coverImage`, `/defaultImage` 정적 파일은 제외한다.
  - `/assets`에 해시 파일 1년 immutable 캐시, `index.html`에 no-cache를 준다.
  - 보안 헤더 `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`, `X-Robots-Tag: noindex`를 추가했다.
- `.env.example`:
  - 주소를 계획 문서의 확정값 `https://qbix-portfolio.shop/api`로 맞췄다. 이전 값은 `:8443`이었다.
  - `VITE_` 값에는 비밀을 넣지 말라는 안내와, fixture 모드에서는 쓰지 않는다는 설명을 추가했다.
- `playwright.config.js`: HTML 보고서를 `open: "never"`로 바꾸고 line/list reporter를 함께 쓴다. 이제 `npm run test:e2e`가 실패해도 report server 때문에 명령이 멈추지 않는다.
- 접근성 자동 검사 dependency로 `@axe-core/playwright` `4.13.0`을 devDependency에 exact로 추가했다. 설치 후 npm audit은 0 vulnerabilities다.
- `e2e/web-milestone.spec.js`를 새로 만들었다.
  - 대표 화면 27개를 390px·1200px에서 axe-core로 WCAG 2.1 A/AA 자동 검사한다. 대상은 선택·관리·작품 홈과 6개 유형의 목록·상세·편집, 검색·최근·관계 목록/그래프, 보관함·백업, 404다.
  - 기본 31개 메뉴를 390px에서 모두 열어 제목 표시, 가로 넘침 없음, 오류 화면 없음을 확인한다.
  - 깊은 잘못된 URL에서 404 화면이 뜨고 작품 선택으로 돌아가는지 확인한다.
- `README.md`를 Vite template 문구에서 프로젝트 문서로 교체했다. 스택, 명령어, fixture 데이터 모드와 백업, 환경 변수, URL 표, 구조, Vercel 배포 설정, 접근성 검사 범위를 담았다.

##### 빈 상태·로딩·오류 문구

- 목록 화면은 모두 로딩("…불러오는 중입니다."), 오류("…불러오지 못했습니다."), 빈 상태(등록 없음·필터 결과 없음·보관 없음)를 구분해 보여 준다.
- 보관함, 관계 탐색, 최근 항목(두 곳)은 로딩 중에 안내 없이 skeleton만 보였다. 검색 화면과 같게 `role="status"`와 화면 낭독기용 "…불러오는 중입니다." 문구를 추가했다. web-milestone E2E는 axe 검사 전에 이 문구가 사라질 때까지 기다리므로 이 화면들도 로딩이 끝난 뒤 검사한다.
- 상세 화면은 조회 실패도 "찾을 수 없습니다"로 보여 준다. fixture `get()`이 없는 항목에 예외를 던져 두 경우를 구분할 수 없기 때문이다. HTTP adapter(Task 19)에서 404와 네트워크·5xx 오류를 다른 error type으로 나누고 화면 문구도 나눈다.

##### 불안정한 단위 테스트 수정

- 원인: `CharacterPages.test.jsx` › "creates every editable field with a relation and enforces the species branch"는 큰 controlled form에 25번쯤 입력하고, 입력할 때마다 form 전체가 다시 그려진다(jsdom에서 입력당 약 40ms). 단독 실행은 1.9초지만 전체 suite를 16 core에서 병렬로 돌리면 4.9~5.1초가 걸려 Vitest 기본 timeout 5초를 넘었다(전체 실행 3회 중 2회 실패). 화면 로직 문제는 아니었다.
- 수정: `vite.config.js`에 `test.testTimeout: 15_000`, `src/test/setup.js`에 Testing Library `asyncUtilTimeout: 3_000`을 설정했다. debounce 시간을 검사하는 곳은 `timeout`을 직접 넘기므로 영향이 없다.
- 반복 실행 중 두 번째 race를 찾았다. `SettingPages.test.jsx`의 사용자 필터 단계는 "그림자 보법이 사라짐"만 기다려, 필터 결과를 불러오는 동안(두 카드가 모두 없음) 통과한 뒤 "청운검법"을 바로 찾다가 가끔 실패했다. 한 `waitFor` 안에서 두 조건을 함께 확인하도록 고쳤다. 같은 패턴을 모든 화면 테스트에서 찾아봤고 다른 곳은 없었다.

##### 남아 있던 버그 수정

- `CharacterListPage`: 링크·뒤로 가기처럼 바깥에서 URL의 `q`/`affiliation`이 바뀌면, 300ms 늦게 따라오는 debounce 값이 URL을 이전 값으로 되돌렸다(Task 9에서 World·Plot만 고침). World와 같게 debounce 값이 입력값과 같아진 사용자 편집만 URL에 쓴다. 회귀 테스트 "follows external URL filter changes without reverting them"을 먼저 추가해 실패를 확인한 뒤 고쳤다.

##### 성능 (production build)

- 첫 로딩: entry `index` 240.92kB(gzip 75.59kB) + `appRepositories` 258.66kB(gzip 77.48kB), 합계 약 500kB(gzip 약 153kB). Task 14 때보다 entry가 조금 커지고(ErrorPage 등) `appRepositories`가 줄었다.
- Tiptap `editor` chunk 422.01kB(gzip 135.19kB)는 편집·상세 화면에서만 받는다. 500kB를 넘는 파일은 없다.
- 당시 측정은 Task 15 fixture build 기준이다. Task 19 HTTP adapter는 fixture repository를 읽기 보조 로직에도 사용하므로 fixture 코드가 bundle에서 빠지지 않는다.

##### Vercel preview 시연

- 선택 → 전체 메뉴 → 검색 → 내보내기 흐름은 production build(`vite preview`)를 대상으로 한 E2E로 검증했다.
- 실제 Vercel preview 배포는 공유 환경 변경이라 **사용자 확인 뒤에 진행한다.** 이 개발 환경에는 Vercel CLI가 없다.

##### 검증 (2026-10-01)

- `npm test`: 44 files, 308 tests 통과. 두 테스트 수정 뒤 전체 실행을 9회 반복해 모두 통과했다(수정 전에는 3회 중 2회 timeout 실패).
- `npm run lint`: 통과
- `npm run test:e2e`(build 포함): **77/77 통과**(기존 21개 + web-milestone 56개, axe 위반 0건)
- `npm audit --audit-level=high`: 0 vulnerabilities
- `git diff --check`: 통과. 추적하지 않는 새 파일 195개도 줄 끝 공백이 없다.

#### [x] Task 14: 보관함과 JSON 내보내기/가져오기

- `/works/:workId/archive`: 모든 유형의 보관 항목을 한곳에서 보고(유형 필터) 개별 또는 선택 복원한다. 복원은 항목별로 실행해, 메뉴가 보관된 항목처럼 막힌 경우에도 나머지는 복원하고 실패 사유를 항목별로 보여 준다.
- `src/data/backup/workBackup.js`: 형식 `monp-db-backup`, 버전 1. 한 작품의 캐릭터·세계관·플롯 장면·설정·아이디어·메모·자료·관계와 전역 메뉴를 담는다. 업로드 이미지(data URL)는 비우고 `images` 목록에 `omitted-upload`로, 외부/로컬 이미지 URL은 그대로 두고 목록에 남긴다.
- 파일 검사: 손상된 JSON, 다른 형식, 잘못된 버전, 앱보다 새 버전, 필수 항목 누락, 다른 작품 항목 혼입을 구분해 알려 준다.
- 가져오기: **병합**(새 ID 추가, 같은 ID가 다르면 현재 유지/백업으로 덮어쓰기) 또는 **교체**(작품 데이터를 백업 내용으로 바꿈, 확인 체크 필요). 메뉴는 전역이라 없는 섹션·메뉴만 추가한다. 다른 작품이 쓰는 ID·백업 안 중복 ID는 거부하고, 결과 전체를 schema로 검증(관계 무결성 포함)한 뒤 한 번에 반영한다(실패 시 아무것도 바뀌지 않음). 다른 작품의 백업은 해당 작품에서만 가져올 수 있다.
- `/works/:workId/backup`: 내보내기(파일 다운로드, 제외 이미지 수 안내), 파일 선택 → 미리보기 표(백업·추가·충돌·삭제 수) → 가져오기 실행.
- sidebar "작품 탐색"과 모바일 메뉴 시트에 보관함·백업을 추가했다(sidebar link 38개).
- 검증: `workBackup.test.js` 11개(round trip, 버전, 손상 파일, 중복 ID, 병합/교체, 무결성, 메뉴 병합, 이미지 목록), `ArchiveBackupPages.test.jsx` 3개. E2E: 설정 자료 + 사용자 관계 생성 → 내보내기 다운로드 → 새로고침(깨끗한 세션) → 교체 가져오기 → 검색으로 찾아 관계 복구 확인 → 보관 → 보관함에서 복원.

#### [x] Task 13: 통합 검색·필터·최근 항목·관계 그래프

##### 검색

- `src/domain/exploration.js`: 한국어 검색 정규화(NFC·소문자·공백), 띄어쓰기 무시 매칭("청운 검법" → "청운검법"), 제목 초성 검색("ㅇㅎ" → "연화"), Tiptap 본문 텍스트 추출, 결과 발췌, 점수(제목 일치 > 제목 시작 > 제목 포함 > 태그 > 요약 > 유형별 필드 > 본문). 초성 매칭은 긴 본문에서 오탐이 많아 제목에만 적용한다.
- `fixtureExplorationRepository.search`: 캐릭터·세계관·플롯 장면·설정·아이디어·메모·사용자 정의 generic 자료를 한 index로 검색한다. 유형·메뉴(전체 메뉴는 섹션 전체)·상태·보관 포함 필터를 AND로 결합하고, 현재 조건에서 가능한 상태 목록을 함께 돌려준다.
- `/works/:workId/search`: `q`, `kind`, `menu`, `status`, `archived=1`을 URL에 보존한다(300ms debounce, 외부 URL 변경을 되돌리지 않음). 결과마다 유형·메뉴·상태·보관 badge, 일치 필드 발췌, 상세 deep link, "관계 탐색" link를 보여 준다.

##### 최근 항목

- `src/shared/navigation/recentViews.js`: 세션 동안 작품별 "최근 본 항목"을 기록한다(최신 우선, 중복 제거, 20개). `RootLayout`이 URL이 상세 화면이면 자동으로 기록하므로 feature 화면을 고치지 않는다.
- `/works/:workId/recent`: 최근 본 항목(사라진 항목은 제외, 보관 항목은 badge)과 최근 수정한 항목 20개, 기록 지우기.

##### 관계 탐색

- 그래프 = 명시적 relation + 플롯 장면 필드에서 파생한 연결(POV, 등장 인물, 장소, 복선 회수). 캐릭터에서 등장 장면으로 바로 이어진다. 메모는 제외한다.
- `getNeighborhood`: 양방향 BFS, visited set으로 순환 안전, 단계(1~3), 보관 제외 기본, 노드 한도와 생략 개수. 2,000노드 순환 그래프에서 500ms 안에 끝나는지 테스트한다.
- `/works/:workId/relations?focus=type:id&depth=&view=graph&archived=1`: 기본은 **접근 가능한 목록 보기**(단계별 항목, "어디서 · 나가는/들어오는/상호 · 관계 이름", 장면 정보 badge, "이 항목 기준으로 보기"로 재초점하며 history에 쌓임). **그래프 보기**는 보조 화면으로 SVG 방사형 배치, 노드는 Tab으로 이동해 Enter로 여는 link이며 36개까지만 그리고 나머지는 목록 보기로 안내한다.

##### 내비게이션

- 데스크톱에는 하단 내비게이션이 없어 검색·최근 화면에 갈 수 없던 문제를 고쳤다. sidebar 상단에 "작품 탐색"(검색·최근 항목·관계 탐색)을 추가하고, 모바일 메뉴 시트에도 "관계 탐색"을 추가했다. Header 제목에 "관계 탐색"을 추가했다.
- `TaskPlaceholderPage`는 더 이상 route에서 쓰지 않는다.

##### 검증

- `exploration.test.js` 15개, `fixtureExplorationRepository.test.js` 8개, `ExplorationPages.test.jsx` 7개, `WorkNavigation` sidebar 테스트를 추가했다.
- Task 13 E2E(기존 placeholder E2E 대체): 하단 탐색 → 초성 "ㅇㅎ" 검색 → 본문 검색 + 유형 필터 → "연화 관계 탐색" → 세계관·장면·설정 연결 경로 확인 → 장면 상세 이동·뒤로 → 재초점 → 그래프 보기에서 키보드로 설정 노드 열기 → 최근 본 항목 확인. 1200px에서 sidebar link 36개(탐색 3 + 메뉴 31 + 관리 2)를 확인한다.

#### [x] Route code splitting (Task 15 권장 사항 선행 적용)

- 모든 feature page를 React Router `lazy` route로 바꿨다(`src/app/routeModules.js`의 `lazyPage`). 작품 선택 화면, `RootLayout`, 메뉴 layout, loader는 정적으로 유지해 데이터 규칙과 오류 화면은 그대로 동작한다.
- 첫 chunk를 받는 동안 root `HydrateFallback`(`RouteLoadingPage`)을 표시한다.
- `main.jsx`가 첫 화면 이후 idle 시간에 모든 route chunk를 미리 받고, 완료되면 `html[data-routes-preloaded="true"]`를 설정한다.
- 결과: main JS `1,037kB → 484kB`, Tiptap은 `editor` chunk(422kB)로 분리되어 목록 화면에서는 받지 않는다.
- `routeModules.test.js`가 모든 lazy module 해석, 정적 loader 유지, preload를 검증한다.

#### [x] Task 12: Idea와 Memo 전문 화면

##### Idea

- `IdeaSchema`: `categoryId`(= idea 메뉴, 캐릭터/대사/장소/아이템/기타는 label일 뿐), `title`, `summary`, `source`(출처), `priority`(`high`/`medium`/`low` = 높음/보통/낮음), `status`, `convertedTo`, `convertedAt`, Tiptap `body`, `tags`.
- 상태 전이(`IDEA_STATUS_TRANSITIONS`): 씨앗 → 발전 중/보류, 발전 중 → 씨앗/검토 완료/보류, 검토 완료 → 발전 중/보류, 보류 → 씨앗. **채택(`adopted`)은 변환으로만** 도달하고 이후 상태를 바꿀 수 없다. schema가 채택 상태와 변환 대상의 일치, 대상 존재·같은 작품 여부를 검증한다.
- 변환(`ideaConverter`): 아이디어를 플롯 장면·설정 자료·세계관으로 변환한다. 제목·요약·본문·태그를 옮기고, 새 항목 → 아이디어 방향의 `idea-origin`("원본 아이디어") relation을 만들고, 아이디어를 채택 상태로 바꾼다. 중간 단계가 실패하면 만든 항목과 relation을 보관해 활성 고아 데이터를 남기지 않는다.
- 기존 `idea-dialogue-mist`(대사)를 generic `contents`에서 `ideas`로 이전했다. ID와 relation endpoint는 유지했다.
- 화면: 목록 상단 빠른 추가(현재 유형에 바로 씨앗 상태로 저장, 전체 보기에서는 유형 선택), 검색·우선순위·상태·보관 필터(URL 보존), 우선순위 → 최근 수정 순 정렬. 상세의 "발전 단계" 버튼, "다른 항목으로 변환"(대상·분류 선택 후 변환하면 새 항목 상세로 이동), "채택 결과" link. 편집기의 상태 선택은 현재 상태와 허용된 다음 상태만 보여 준다. 관련 설정은 RelationPicker로 연결한다.

##### Memo

- `MemoSchema`: memo 메뉴(전체 보기 포함), `title`, 일반 텍스트 `text`, `color`(기본/노랑/초록/파랑/분홍/보라), `pinned`+`pinnedAt`, `checklist[{ id, text, done }]`, `tags`. 빠른 기록용이라 Tiptap을 쓰지 않는다.
- 정렬: 고정 메모(최근 고정 순) → 최근 수정 순. `memo00`(전체)은 모든 메모 메뉴의 메모를 보여 준다.
- 화면: 빠른 추가, 카드에서 바로 고정/해제(`aria-pressed`)와 체크리스트 체크(진행률 표시), 검색·색상·보관 필터. 편집기는 색상 radio, 고정, 체크리스트 항목 추가·완료·삭제, 태그를 제공한다.

##### Generic ContentEntry

- 기본 섹션이 모두 전문 화면을 가지므로 기본 fixture의 generic `contents`는 비었다. generic 단위 테스트는 사용자 정의 섹션을 추가하는 `src/test/genericContentFixture.js`를 쓰고, Task 7 E2E는 메뉴 관리에서 "자료실 · 참고 자료"를 만들어 검증한다.

##### 검증

- `fixtureIdeaMemoRepository.test.js` 11개(빠른 추가, 우선순위 정렬, 상태 전이, plot/setting/world 변환, 실패 보상, 메모 고정 정렬·체크리스트·분류), `IdeaPages.test.jsx` 6개, `MemoPages.test.jsx` 4개, schema·path·router 테스트를 추가했다.

#### [x] Task 11: Setting 자료 전문 화면

##### 선행 정리: 메뉴와 콘텐츠 state 통합

- `fixtureMenuRepository`가 shared fixture state를 받으면 `state.replaceMenu()`로 같은 세션 state에 쓴다. 메뉴 관리에서 새로 만든 분류·지역·챕터에 바로 콘텐츠를 저장할 수 있다. 일반 `{ menuSections, menuItems }` 객체를 넘기면 기존처럼 독립 local store를 쓴다(단위 테스트용).
- 새 메뉴는 섹션의 resource type을 상속하고, 다른 type을 지정하면 거부한다. 새 메뉴의 기본 `filterConfig.scope`는 `category`이고, 메뉴 편집에서는 `scope`를 바꿀 수 없다.
- 메뉴 보관이 콘텐츠를 무효화하지 않도록 "보관된 World 메뉴" schema 규칙을 제거했다. 생성·복원은 repository가 계속 active 메뉴를 요구한다.
- 메뉴 관리 화면은 기존 섹션에서 "메뉴 유형: … (섹션 기본)"을 표시하고, 비어 있는 새 섹션에서만 유형을 고르게 한다.

##### 모델

- `SettingSchema`: `categoryId`(= `menuItemId`), `categoryName`, `title`, `summary`, `grade`, `effect`, `condition`, `limitation`, 자유 `attributes[{ id, label, value }]`, Tiptap `body`, `tags`, `status`, `order`, lifecycle metadata.
- 분류별 필드 구성은 label이 아니라 설정 메뉴의 `filterConfig.fields`(`grade`/`effect`/`condition`/`limitation`/`owners` 부분집합)로 정한다. 값이 없으면 전체 필드를 쓴다. schema가 알 수 없는 key와 중복을 거부한다.
- 숨긴 필드의 기존 값은 지우지 않고 보존한다.
- 사용자(owner)는 `relationType: "owner"`, `label: "사용자"`인 setting → character relation이다. schema가 owner relation의 방향과 type을 검증한다. 캐릭터 상세의 들어오는 관계에 자동으로 표시된다.
- seed: `setting01`의 `setting-cheongun-sword`(청운검법, 사용자 연화, 속성 창시자).

##### Repository·UI

- `fixtureSettingRepository`: `list({ workId, categoryId, q, grade, ownerCharacterId, archiveStatus })`, `get`, `create`, `update`(분류 변경 시 대상 분류 끝으로 이동), `archive`, `restore`, `listOwners(workId)`.
- 검색은 이름·요약·등급·효과·조건·제한·태그·속성 이름/값을 포함한다. 등급·사용자·보관 필터와 AND로 결합한다.
- route: `/works/:workId/setting/:menuItemId`, `/new`, `/:settingId`, `/:settingId/edit` (`setting-menu`).
- 목록: 분류 label은 메뉴에서 실시간으로 읽는다. 카드에는 분류에서 켠 등급·효과·사용자만 보인다. 검색·등급(300ms debounce)·사용자·보관 필터를 URL에 보존한다.
- 편집: 분류를 바꾸면 그 분류의 필드 구성으로 즉시 바뀐다. 사용자 checkbox는 owner relation으로 저장되고 보관된 기존 사용자는 `(보관됨)`으로 유지된다. 추가 속성과 일반 관계(RelationPicker)도 편집할 수 있다.
- 메뉴 관리: 설정 메뉴 추가·수정 시 "새 메뉴에 표시할 필드"/"이 메뉴에 표시할 필드" checkbox로 필드 구성을 정한다.

##### 검증

- `fixtureSettingRepository.test.js` 6개, `SettingPages.test.jsx` 7개, 메뉴 공유 state·type 상속·scope 보존 테스트, 메뉴 관리 필드 구성 테스트, schema·path·router 테스트를 추가했다.
- Task 11 E2E: 서버 → 무기(발동 조건 숨김), 서버 통합 → 능력, 사용자 필드 없는 "공통 무공" 추가 → 무기 편집기에는 발동 조건이 없고 능력으로 바꾸면 나타남 → 사용자 무영과 속성을 넣어 저장 → 무영 상세의 들어오는 관계 확인 → 새 분류에 저장. 390px에서 overflow, 16px 입력, 44px 저장 버튼을 확인한다.

#### [x] Task 10: Plot 전문 화면

##### 모델과 계층

- chapter는 기존 plot 메뉴(`plot01`~`plot05`)이고 scene은 새 `plotScenes` 컬렉션이다. 기존 chapter URL은 그대로 유지한다.
- `PlotSceneSchema`: `chapterId`(= `menuItemId`), `chapterName`, `title`, `summary`, `status`(`planned`/`draft`/`revised`/`final` = 구상/초고/퇴고/완료), `povCharacterId`, `storyTime`, `locationWorldId`, `locationDetail`, `characterIds`, `event`, `clues`, Tiptap `body`, `tags`, chapter 내 `order`, lifecycle metadata.
- 복선(`clues[]`)은 `{ id, clue, payoffSceneId, notes }`다. 회수 장면이 active일 때만 회수됨으로 보고, 회수 장면이 없거나 보관되면 미회수로 본다.
- `AppFixtureSchema`가 concrete plot chapter, `chapterId === menuItemId`, POV·등장 인물·장소·회수 장면의 존재와 같은 작품 여부, 인물 중복, 복선 ID 중복, 자기 자신 회수를 검증한다.
- 기존 `plot-chapter-one-opening`을 generic `contents`에서 `plotScenes`로 이전했다. ID와 `{ type: "plot", id }` relation endpoint는 유지했고 POV 연화, 장소 동부평야지대, 미회수 복선 1개를 seed로 추가했다.
- generic ContentEntry 회귀용 seed는 `idea02`(대사)의 `idea-dialogue-mist`로 옮겼다. generic 단위 테스트와 Task 7 E2E도 Idea 메뉴로 이전했다.

##### Repository

- `fixturePlotRepository`: `list({ workId, chapterId, q, status, unresolved, archiveStatus })`, `get`, `create`, `update`, `move(workId, sceneId, { chapterId, index })`, `archive`, `restore`.
- `plot00`은 저장 chapter가 아닌 전체 보기다. 생성은 대상 chapter의 active 장면 끝에 붙고, 보관된 장면은 그 뒤에 순서를 유지한다.
- `move`는 chapter 안 순서 변경과 다른 chapter 이동을 모두 처리하고 양쪽 chapter의 순서를 연속 번호로 다시 매긴다. 편집 화면에서 chapter를 바꿔도 대상 chapter 끝으로 이동한다. 보관된 장면은 이동할 수 없다.
- 새로 연결하는 POV·인물·장소·회수 장면은 active여야 한다. 이미 연결된 대상이 나중에 보관된 경우에는 저장해도 유지된다.
- 검색은 제목·요약·사건·시간·장소 상세·태그·복선 내용을 포함하며 상태·미회수·보관 필터와 AND로 결합한다.
- relation repository가 Plot scene을 typed candidate(`entityType: "plot"`)로 포함한다. `plotQueryKeys`와 session singleton `plotRepository`를 추가했다.
- World/Plot이 공유하는 relation draft helper를 `src/shared/relations/relationDrafts.js`로 옮겼다. `relationCandidatePath`가 plot 경로를 명시적으로 처리한다.

##### UI·라우팅

- route: `/works/:workId/plot/:menuItemId`, `/new`, `/:sceneId`, `/:sceneId/edit` (`plot-menu`, generic route보다 먼저 매칭).
- 목록: chapter 장면을 번호 순 `ol`로 표시하고, POV·시간·장소·인물 수·상태·미회수 복선 수를 보여 준다. `plot00`은 live 메뉴 순서를 따라 chapter별로 묶으므로 메뉴 관리에서 chapter 순서를 바꾸면 전체 보기도 바뀐다.
- 필터: 300ms debounce 검색(`q`), 상태(`status`), 미회수 복선만(`clues=unresolved`), 보관 상태(`archive`)를 URL에 보존한다. 필터가 켜져 있으면 순서 이동 버튼을 숨긴다.
- 순서 이동: 장면마다 44px `위로`/`아래로` 버튼이 있고 양 끝에서는 비활성화된다.
- 편집: chapter, 상태, 제목, 요약, POV, 시간, 장소(World), 장소 상세, 등장 인물 checkbox, 사건, 복선 목록(내용·회수 장면·메모·삭제), 태그, rich text 본문, RelationPicker, 들어오는 관계 보존. 제목·chapter·빈 복선 검증 시 focus와 설명을 제공한다.
- 보관된 대상은 이미 선택된 경우에만 `(보관됨)` label로 보이고 새 선택지로는 나오지 않는다.
- 상세: 모든 필드, POV·인물·장소·회수 장면 deep link와 보관 badge, 복선 회수 상태, `이 장면에서 회수되는 복선`, 다른 chapter로 이동, 나가는/들어오는 관계, 보관·복원 banner.

##### 검증

- `fixturePlotRepository.test.js` 8개, `PlotPages.test.jsx` 9개, schema·path·loader·router 테스트를 추가했다.
- Task 10 E2E: 390px에서 전체 필드 장면 생성 → chapter 안 순서 변경 → seed 복선을 새 장면에서 회수 → 역방향 회수 표시 → Chapter2로 이동 → `plot00` 미회수 필터 → 회수 장면 보관 시 미회수 전환 → 복원 → 작품 격리. overflow, 16px 입력·select, 44px checkbox·저장 버튼, sticky 저장 영역을 확인한다.
- 미회수 checkbox는 router 검색 파라미터 갱신이 비동기라 controlled input이 잠깐 되돌아가는 문제가 있어 optimistic local state로 처리했다.

#### [x] Task 9: World 전문 화면

##### 데이터 계층

- `WorldCategorySchema`와 전문 `WorldSchema`를 추가했다.
- World 전문 필드는 `category`, `regionId`, `regionName`, `title`, `summary`, `era`, `rules`, `history`, `culture`, `factions`, `places`, canonical Tiptap JSON `body`, `tags`, `status`, lifecycle metadata로 구성한다.
- `AppFixtureSchema`에 `worlds` 컬렉션을 추가하고 작품·메뉴 참조, concrete World category, `regionId === menuItemId`, typed endpoint 중복, relation endpoint 무결성을 검증한다.
- 기존 `world-east-plains`를 generic `contents`에서 전문 `worlds` 컬렉션으로 이전했다. ID와 `{ type: "world", id: "world-east-plains" }` relation endpoint는 유지했다.
- Task 7 generic 흐름의 독립적인 회귀 검증을 위해 `plot01`에 `plot-chapter-one-opening` ContentEntry seed를 추가했다. (Task 10에서 이 seed는 `plotScenes`로, generic seed는 `idea02`로 이전됐다.)
- shared fixture state에 `replaceWorlds()`를 추가해 Character·ContentEntry·World·Relation이 한 세션 상태를 공유한다.
- `fixtureWorldRepository`에 작품 격리 목록·상세·생성·수정·보관·복구를 구현했다.
- `world00`은 저장 category가 아닌 all view로 취급하고, 저장에는 concrete World menu를 요구한다.
- 검색어·분류·시대·보관 상태를 AND 조건으로 필터링하며, 검색은 제목·요약·시대·규칙·역사·문화·세력·장소·태그를 포함한다.
- World 생성·수정 시 route의 `workId`, stable menu ID, `resourceType`, lifecycle metadata를 신뢰 경계에서 고정한다.
- relation repository가 World를 typed candidate로 포함하며, 기본 candidate 조회에서는 보관된 World를 제외하고 상세 label 해석용 `{ includeArchived: true }` 조회를 지원한다.
- `worldQueryKeys`와 session singleton `worldRepository`를 추가했다.
- 주요 파일:
  - `src/domain/schemas.js`
  - `src/data/fixtures/appFixture.js`
  - `src/data/repositories/worldRepository.js`
  - `src/data/repositories/fixtureWorldRepository.js`
  - `src/data/repositories/fixtureContentRelationState.js`
  - `src/data/repositories/fixtureRelationRepository.js`
  - `src/data/repositories/appRepositories.js`

##### UI·라우팅

- 기존 stable URL을 유지하는 World path wrapper를 추가했다.
  - `worldListPath(workId, regionId)`
  - `worldCreatePath(workId, regionId)`
  - `worldDetailPath(workId, regionId, worldId)`
  - `worldEditPath(workId, regionId, worldId)`
- `requireActiveWorldMenuItem` loader와 `WorldMenuLayout`을 추가했다.
- generic content route보다 먼저 매칭되는 World 전문 route branch를 추가했다.
  - `/works/:workId/world/:menuItemId`
  - `/works/:workId/world/:menuItemId/new`
  - `/works/:workId/world/:menuItemId/:worldId`
  - `/works/:workId/world/:menuItemId/:worldId/edit`
- `WorldListPage`를 구현했다.
  - 동적 menu label과 World summary card
  - 지역·분류·시대·상태·세력·장소·요약 표시
  - 300ms 검색 debounce
  - URL-backed `q`, `category`, `era`, `archive` 필터
  - 등록 데이터 없음·필터 결과 없음·보관 데이터 없음의 구분된 empty state
  - 보관된 카드의 복원 action을 detail link 밖에 배치
- `WorldEditorPage`를 생성/수정 공용으로 구현했다.
  - concrete 지역, 분류, 제목, 요약, 시대, 규칙, 역사, 문화, 세력, 장소, 태그, 상태, rich text 본문
  - Task 7 `RichTextEditor`, `RelationPicker`, `UnsavedChangesGuard` 재사용
  - outgoing relation 편집과 incoming relation 보존
  - create 후 relation 저장 실패 재시도 시 생성 ID 재사용
  - required validation, dirty navigation, work-scoped query invalidation
- `WorldDetailPage`를 구현했다.
  - 모든 World 전문 필드와 sanitized rich text 표시
  - character·plot·world relation의 나가는/들어오는 역관계 구분
  - 가능한 relation target deep link와 보관 대상 label/badge
  - 보관·복구 banner/action 및 relation 보존
  - `world00` all detail 허용, concrete region mismatch 차단
- 반응형 CSS에서 모바일 16px 입력, 44px action, safe-area 저장 영역, focus-visible, reduced-motion, 1/2/3열 summary card를 적용했다.
- 주요 파일:
  - `src/features/worlds/WorldMenuLayout.jsx`
  - `src/features/worlds/worlds.js`
  - `src/features/worlds/hooks/useUrlBackedTextValue.js`
  - `src/features/worlds/pages/WorldListPage.jsx`
  - `src/features/worlds/pages/WorldEditorPage.jsx`
  - `src/features/worlds/pages/WorldDetailPage.jsx`
  - 각 page의 `.module.css`
  - `src/app/paths.js`
  - `src/features/menu-management/menuLoader.js`
  - `src/app/router.jsx`

##### 검증 중 수정한 사항

- `WorldListPage`: 외부 navigation(링크·뒤로가기)으로 URL의 `q`/`era`가 바뀌면 지연된 debounce 값이 URL을 이전 값으로 되돌리던 문제를 수정했다. 이제 debounce 값이 입력값과 일치하는 사용자 편집만 URL에 반영한다. (`CharacterListPage`의 같은 패턴은 Task 15에서 고쳤다.)
- `RelationPicker`: 보관된 candidate는 기존 relation label 해석에만 쓰고 새 relation 대상 option으로는 노출하지 않는다.
- `fixtureRelationRepository.replaceOutgoing`: 대상이 나중에 보관된 기존 relation은 저장 시 유지된다. 새 relation이나 대상이 바뀐 relation은 여전히 active 대상을 요구한다.
- 테스트: rich text toolbar의 `제목` 버튼과 제목 입력을 구분하도록 query를 정리하고, 보관 대상 relation 유지·외부 URL filter 변경·picker 보관 candidate 제외 테스트를 추가했다.

##### E2E

- Task 7 generic ContentEntry E2E를 `/works/work-monp/plot/plot02`(Chapter2)로 이전했다.
- Task 9 E2E: `world00 → world01 지역 설정 생성 → 연화·첫 장의 시작 연결 → 수정 → 연화 상세에서 들어오는 관계 확인 → 보관(관계 유지) → 보관 필터에서 복원 → 동일 URL·관계 확인 → 월하의 잔향 격리 확인`.
- 390px에서 horizontal overflow 없음, 검색·제목·select 16px 이상, 저장 버튼 44px 이상, sticky 저장 영역이 viewport 안에 있는지 확인한다.
- Task 8 character journey에서 목록 전환 중 text query가 상세 화면과 겹치던 flake를 URL 대기 + href locator로 안정화했다.

#### [x] Task 1: 프론트 테스트 기반

- Vitest, React Testing Library, MSW, Playwright를 구성했다.
- `test`, `lint`, `build`, `test:e2e` 스크립트와 공통 test setup을 연결했다.
- 기존 6개 메뉴 섹션·31개 링크, 캐릭터 13개 지역, route, API error, 인간/마물 규칙을 characterization test로 보호했다.
- 주요 파일: `vite.config.js`, `playwright.config.js`, `src/test/`, `e2e/current-app.spec.js`.

#### [x] Task 2: Fixture와 Repository 계층

- Zod 기반 Work, MenuSection, MenuItem, ContentEntry, Character, Relation schema와 검증된 `appFixture`를 도입했다.
- 화면의 외부 API 직접 의존을 제거하고 fixture repository를 통해 작품·메뉴·캐릭터를 조회·변경하도록 전환했다.
- fixture mutation은 현재 SPA 세션 메모리에서 유지되며 새로고침 시 seed로 초기화된다.
- 모든 콘텐츠 조회·변경은 `workId`로 격리되고 TanStack Query key에도 `workId`가 포함된다.
- 주요 파일: `src/domain/schemas.js`, `src/data/fixtures/appFixture.js`, `src/data/repositories/`.

#### [x] Task 3: 디자인 시스템과 adaptive shell

- Apple-inspired 자체 token과 Button, Input, Card, Sheet, Dialog, EmptyState, Skeleton 공통 UI를 구축했다.
- 430px 고정 프레임을 제거하고 iPhone부터 desktop까지 반응형 shell을 적용했다.
- safe area, 44px 최소 touch target, 모바일 16px 입력, focus-visible, reduced-motion, modal focus trap과 inert 처리를 반영했다.
- 주요 파일: `src/styles/`, `src/shared/ui/`, `src/layouts/RootLayout.jsx`.

#### [x] Task 4: 작품 선택·관리

- `/`를 작품 선택 전용 화면으로 구성하고 `/works/manage`에 작품 생성·수정·보관·복구를 구현했다.
- 중복 slug, 보관된 작품 필터링, 빈 상태와 작품별 accent를 지원한다.
- 현재 fixture에는 `MONP`, `월하의 잔향` 두 작품이 포함된다.
- 주요 파일: `src/features/works/`, `src/data/repositories/fixtureWorkRepository.js`.

#### [x] Task 5: 작품 scoped routing과 adaptive navigation

- `/works/:workId/...` 구조로 작품별 route와 데이터를 격리했다.
- 모바일 하단 탐색·메뉴 Sheet, desktop persistent sidebar, 작품·메뉴 기반 동적 제목을 연결했다.
- `/characters01` 같은 legacy URL을 기본 작품의 신규 URL로 redirect한다.
- deep link, reload, 작품 전환, unknown work/menu, archived menu direct URL을 처리한다.
- 주요 파일: `src/app/router.jsx`, `src/app/paths.js`, `src/components/layout/WorkNavigation.jsx`, `src/layouts/RootLayout.jsx`.

#### [x] Task 6: 전역 메뉴 관리

- 기존 6개 섹션·31개 메뉴를 stable `id`, `slug`, `resourceType`, `filterConfig`를 가진 seed로 전환했다.
- `/menu/manage`에서 섹션·메뉴 생성·수정·정렬·보관·복구를 지원한다.
- 위/아래 이동과 native drag 정렬을 제공하며 메뉴 구조는 모든 작품에 전역 적용된다.
- label을 변경해도 ID 기반 URL은 유지되고 보관된 메뉴의 direct URL은 차단된다.
- 메뉴를 보관해도 연결된 캐릭터·콘텐츠·관계 데이터는 삭제하지 않는다.
- Header, 작품 홈, Sheet, sidebar가 동일한 동적 menu query를 사용한다.
- 주요 파일: `src/data/repositories/fixtureMenuRepository.js`, `src/features/menu-management/`, `src/components/layout/WorkNavigation.jsx`.

#### [x] Task 7: 공통 ContentEntry CRUD·rich text·relations

- generic 메뉴에 공통 목록→상세→생성/수정 흐름을 구현했다.
- route:
  - `/works/:workId/:sectionId/:menuItemId`
  - `/works/:workId/:sectionId/:menuItemId/new`
  - `/works/:workId/:sectionId/:menuItemId/:entryId`
  - `/works/:workId/:sectionId/:menuItemId/:entryId/edit`
- ContentEntry/Relation fixture repository가 작품·메뉴·resource type을 신뢰 경계에서 고정하고 all/category scope를 지원한다.
- Tiptap JSON을 canonical body로 저장하며 renderer는 같은 extension set으로 HTML을 생성한 뒤 DOMPurify로 sanitize한다.
- 제목·요약·태그·상태, rich text 서식, undo/redo, same-work typed relation picker를 제공한다.
- self·duplicate·cross-work relation을 차단하고 outgoing relation 수정 시 incoming relation을 보존한다.
- dirty form은 React Router navigation과 `beforeunload`를 차단하고 확인 Dialog를 표시한다.
- exact dependency:
  - `@tiptap/react`, `@tiptap/core`, `@tiptap/starter-kit`: `3.31.3`
  - `dompurify`: `3.4.16`
- 주요 파일: `src/features/content/`, `src/shared/editor/`, `src/shared/relations/`, `src/shared/hooks/useUnsavedChanges.js`, `src/data/repositories/fixtureContentRepository.js`, `src/data/repositories/fixtureRelationRepository.js`.

#### [x] Task 8: Character 전문 기능

- 캐릭터·ContentEntry·Relation repository가 같은 session fixture state를 공유하도록 통합했다.
- 캐릭터 전용 목록→상세→생성/수정 흐름과 명시적인 edit route를 구현했다.
- route: `/works/:workId/characters/:menuItemId/:characterId/edit`.
- 지역, 이름, 한자/영문 이름, 이미지, 종족, 출생지, 성별/마물 구분, 생년월일, 나이, 신체, 직업, 성향, 소속, 파벌, 선호/비호, 무공, 성격, 외형, 테마곡, 요약, 특이사항, profile theme 등 기존 사용자 필드 전체를 편집할 수 있다.
- `characters00`은 저장 지역이 아닌 순수 all filter이며 캐릭터 저장 시 concrete region을 요구한다.
- 검색은 300ms debounce를 사용하고 종족·소속·보관 상태 필터를 AND 조건으로 적용하며 URL query에 보존한다.
- 이미지 file preview, object URL 정리, MIME 검증, 5MiB 제한, file-over-URL 우선순위와 broken-image fallback을 지원한다.
- 새 캐릭터도 즉시 relation 후보가 되며 이름 변경·보관·복구가 후보 목록에 동기화된다.
- relation incoming/outgoing 표시와 편집, dirty-navigation 경고, 캐릭터 보관·복구 및 관계 보존을 지원한다.
- 주요 파일: `src/features/characters/CharacterMenuLayout.jsx`, `src/features/characters/pages/CharacterEditorPage.jsx`, `src/features/characters/pages/CharacterDetailPage.jsx`, `src/features/characters/pages/CharacterListPage.jsx`, `src/features/characters/components/`, `src/data/repositories/fixtureCharacterRepository.js`.

### 현재 route와 데이터 규칙

- `/`: 작품 선택 전용.
- `/works/manage`: 작품 관리.
- `/menu/manage`: 모든 작품 공통 메뉴 관리.
- `/works/:workId`: 선택 작품 홈.
- `/works/:workId/characters/:menuItemId/...`: Character 전문 화면.
- `/works/:workId/world/:menuItemId/...`: World 전문 화면.
- `/works/:workId/plot/:menuItemId/...`: Plot scene 전문 화면 (chapter = plot 메뉴).
- `/works/:workId/setting/:menuItemId/...`: Setting 자료 전문 화면 (분류 = setting 메뉴).
- `/works/:workId/idea/:menuItemId/...`: Idea 전문 화면 (유형 = idea 메뉴).
- `/works/:workId/memo/:menuItemId/...`: Memo 전문 화면.
- `/works/:workId/:sectionId/:menuItemId/...`: generic ContentEntry 화면 (메뉴 관리에서 만든 사용자 정의 섹션).
- 기본 6개 섹션은 모두 전문 화면을 쓴다. 기본 fixture의 generic `contents`는 비어 있다.
- `/works/:workId/search`, `/recent`, `/relations`, `/archive`, `/backup`: 통합 검색, 최근 항목, 관계 탐색, 보관함, 백업.
- 모든 page component는 route 단위로 code-split된다(`src/app/routeModules.js`). loader는 정적 route tree에 남아 있고, 첫 화면 이후 idle 시간에 모든 route chunk를 미리 받는다.
- 메뉴와 콘텐츠는 한 세션 fixture state를 공유한다.
- 메뉴 정의는 모든 작품에 공통이고, 콘텐츠·캐릭터·관계는 `workId`로 격리한다.
- menu label과 URL identity를 분리하며 stable ID를 route와 business rule에 사용한다.
- 삭제 동작은 영구 삭제가 아니라 archive이고 relation을 보존한다.
- fixture repository가 현재 기본 adapter이며 HTTP/persistent cache adapter는 아직 구현하지 않았다.

### 최신 전체 검증 기준

백엔드(`back/`, 2026-10-01 Task 16): `./gradlew clean build --warning-mode all` — 23/23 통과, deprecation 경고 0건. 통합 테스트는 `MONP_TEST_DB_URL`로 지정한 MariaDB 10.11.14에서 실행했고, Testcontainers 모드는 Docker가 없어 아직 실행하지 못했다.

프론트(`front/`): 2026-10-01 Task 15 완료 시 다음 명령을 모두 실행했다.

```bash
npm test
npm run lint
npm run build
npm run test:e2e
npm audit --audit-level=high
git diff --check
```

결과:

- Vitest: **44 files, 308 tests 통과** (전체 실행 반복 시에도 안정적으로 통과)
- ESLint: **통과**
- Production build: **통과**
- Playwright: **77/77 tests 통과** (기존 journey 21개 + web-milestone 56개)
- npm audit: **0 vulnerabilities**
- `git diff --check`: **통과**
- Task 6 E2E: menu rename의 전역 반영, stable URL, drag 정렬, 보관·복구 검증.
- Task 7 E2E: 메뉴 관리에서 만든 "자료실 · 참고 자료"(generic)에서 서식 있는 ContentEntry 생성, relation 연결, dirty navigation, 작품 격리 검증.
- Task 8 E2E: `create → relation → edit → archive → restore`, broken image fallback, relation 보존, 작품 격리 검증.
- Task 9 E2E: World `create → character/plot relation → edit → reverse relation → archive → restore`, stable URL, 작품 격리, 모바일 metric 검증.
- Task 10 E2E: Plot scene `create → reorder → payoff → chapter move → unresolved filter → archive → restore`, 작품 격리, 모바일 metric 검증.
- Task 11 E2E: 설정 분류 rename·필드 구성·분류 추가 → 분류별 필드 차이 → 사용자 relation과 캐릭터 역관계 → 새 분류 저장, 모바일 metric 검증.
- Task 12 E2E: 아이디어 빠른 추가 → 상태 전이 → 대사 아이디어를 Chapter2 장면으로 변환 → 원본 아이디어 관계와 채택 결과 확인 → 메모 빠른 추가·체크리스트·고정 정렬 → 작품 격리, 모바일 metric 검증.
- Task 13 E2E: 초성·본문 검색과 유형 필터 → 관계 목록·재초점 → 그래프 노드 키보드 열기 → 최근 본 항목, 1200px sidebar 탐색 link 검증.
- Task 14 E2E: 설정 자료·사용자 관계 생성 → 내보내기 → 깨끗한 세션에 교체 가져오기 → 관계 복구 → 보관 → 보관함에서 복원.
- Task 15 E2E(`e2e/web-milestone.spec.js`): 대표 화면 27개 × 390px·1200px axe WCAG 2.1 A/AA 검사, 기본 31개 메뉴 390px smoke, 깊은 잘못된 URL의 404 복귀.
- 오프라인 E2E는 route chunk preload 완료(`html[data-routes-preloaded="true"]`)를 기다린 뒤 네트워크를 끊는다.
- (Task 15에서 해결) 예전에는 `npm run test:e2e`가 실패하면 HTML report server가 떠서 명령이 끝나지 않았다. 지금은 reporter가 `open: "never"`라 그대로 실행하면 된다. 보고서는 `npx playwright show-report`로 연다.

### 현재 제한·주의사항

- fixture 변경은 SPA 세션 동안만 유지되고 새로고침하면 초기 seed로 돌아갈 수 있다.
- MiniPC production 배포와 Caddy/firewall/DNS 검증은 아직 하지 않았다. 공개 사용자 없는 쓰기 API이므로 먼저 Tailscale 접근 제어를 확인해야 한다.
- **`back/`은 git 저장소 밖에 있다.** git 저장소는 `front/`(`origin` = `HyperQuanx/monpdb`)뿐이고 `monp_db_re/` 루트는 저장소가 아니다. 계획의 "저장소 루트 `back/`"와 맞지 않으므로 `back/`을 별도 저장소로 둘지, 루트 monorepo로 합칠지 사용자 결정이 필요하다(아직 아무것도 바꾸지 않음).
- 이 개발 PC에는 Docker가 없어 Testcontainers 모드를 실행하지 못했다. Docker 설치(sudo 필요) 후 `back/`에서 `./gradlew test`를 한 번 돌려 확인한다. JDK 17은 `~/.jdks/jdk-17.0.20.1+1`에 있다.
- fixture 이미지 파일은 세션 데이터다. HTTP 모드의 이미지 파일은 서버 upload directory에 저장하며 IndexedDB text cache에서 제외한다.
- Task 15 당시 fixture build는 entry `index`(240.92kB) + `appRepositories`(258.66kB, Zod·fixture·repository) 두 chunk로 약 500kB(gzip 약 153kB)였다. 2026-10-07 재측정에서 fixture build는 `index` 211.02kB/66.92kB gzip, `appRepositories` 287.33kB/87.27kB gzip이며 HTTP build는 각각 214.34kB/68.00kB gzip, 293.61kB/89.24kB gzip이다. HTTP adapter가 fixture read adapter를 재사용하므로 fixture 코드가 bundle에 남는다. Tiptap은 편집·상세 화면에서만 받는 `editor` chunk(422.01kB/135.20kB gzip)다.
- iOS Xcode compile/signing/device behavior는 Mac mini M4에서 확인해야 한다. 노트북은 backend와 browser smoke를 위한 분리 로컬 MariaDB로 사용했다.
- Vercel preview 배포·시연은 사용자 확인 뒤에 진행한다. 흐름 자체는 production build E2E로 검증했다.
- 웹 오프라인 동작은 route chunk가 받아진 뒤에 보장된다(첫 화면 이후 idle preload). HTTP 브라우저 E2E에서 새로고침 뒤 IndexedDB text fallback을 확인했다.
- 메뉴 state 통합은 Task 11에서 완료했다. 단, 새로 만든 메뉴의 `scope`는 항상 `category`라서 메뉴 관리에서 "전체" 보기 메뉴를 새로 만들 수는 없다(기존 `*00` 메뉴 사용).
- 현재 작업은 commit/push하지 않은 working tree 상태다.
- Task 20 참고: `/healthz`는 HTTP 200만 보면 된다(`UP` 200, `DOWN` 503). 새 슬롯은 `MONP_SERVER_PORT=8182`로 띄운다. 운영 환경 파일에는 `SPRING_PROFILES_ACTIVE=prod`와 `MONP_DB_*`를 둔다.
- 메모는 relation 후보와 관계 그래프에 포함하지 않지만 통합 검색에는 포함한다.
- 최근 본 항목은 세션 메모리에만 있어 새로고침하면 사라진다(fixture와 같은 수명). 영구 저장은 HTTP/cache 단계에서 정한다.
- 백업 가져오기는 대상 작품이 현재 세션에 있어야 한다(작품 자체를 새로 만들지는 않음). 작품 관리 repository는 아직 공유 state와 분리되어 있다.

## 2. 확정 요구사항

- Frontend URL: `https://monpdb.vercel.app/`
- 현재 Vercel 환경 변수: `VITE_API_BASE_URL=https://qbix-portfolio.shop/api`
- `VITE_` 값에는 secret을 저장하지 않는다.
- 백엔드 코드는 저장소 루트 `back/`에 작성한다.
- 먼저 정적 샘플 데이터로 프론트를 완성한다.
- 초기 fixture 단계 변경은 세션 안에서 시연 가능하되 새로고침하면 초기화될 수 있다.
- `/`는 작품 선택 전용이다.
- 작품 추가·수정·삭제는 별도 작품 관리 화면에서 제공한다.
- 작품 선택 후 기존 섹션→하위 메뉴 구조로 들어간다.
- `front/src/app/menuSections.js`의 기존 6개 섹션과 31개 링크를 초기 템플릿으로 유지한다.
- 메뉴 섹션과 하위 메뉴는 추가·수정·정렬·삭제할 수 있다.
- 메뉴 구성은 모든 작품에 공통 적용한다.
- 삭제는 영구 삭제 대신 보관 처리하고 복구할 수 있게 한다.
- 캐릭터·세계관·플롯·설정 자료·아이디어·메모를 전문 화면으로 구현한다.
- 현재 의미 없는 `설정/서버/서버 통합` 이름에 비즈니스 로직을 결합하지 않는다. 사용자가 무기·능력·공통 무공 등으로 변경할 수 있어야 한다.
- 리치 텍스트와 캐릭터·지역·무기·능력·플롯 등 항목 간 관계를 지원한다.
- 전체 검색·필터·최근 항목·관계 시각화를 지원한다.
- 사용자 JSON 내보내기/가져오기와 서버 백업/복구를 지원한다.
- 로그인 없는 개인 전용이다. public 무인증 CUD 노출은 위험하므로 네트워크 계층 보호를 배포 단계에서 적용하거나 명확히 경고한다.
- Apple 사이트처럼 깔끔하고 절제된 현대적 디자인을 적용한다. 현재 정보 구조는 유지하되 CSS·반응형 레이아웃은 변경할 수 있다.
- iPhone 앱은 Capacitor 기반이고 Mac mini M4/Xcode에서 개인 iPhone에 직접 설치한다.
- iPhone 오프라인에서는 캐시된 텍스트만 읽을 수 있다. 이미지는 오프라인 캐시하지 않고 placeholder를 표시한다.
- 생성·수정·삭제는 온라인에서만 가능하며 오프라인 mutation queue/sync는 구현하지 않는다.
- 초기 범위에서 다중 사용자, 실시간 협업, Android, App Store 배포는 제외한다.

## 3. 현재 코드 분석 요약

- `menuSections.js`: 6개 섹션, 31개 링크가 정적으로 정의되어 있다.
- `router.jsx`: 캐릭터 13개 지역의 목록·생성·상세 라우트만 생성한다.
- `features/characters`: 현재 유일한 실제 기능이며 외부 API에 직접 결합되어 있다.
- 캐릭터 삭제, 일부 필드 수정, 검색 debounce, 테스트가 없다.
- HomePage/ErrorPage는 placeholder다.
- 현재 layout은 최대 430~480px의 휴대폰 프레임 형태다.
- Capacitor/PWA/iOS safe area/오프라인 저장 설정이 없다.
- `front/ai_read/SERVER_INFO.md`는 Ubuntu 24.04, Caddy, Java 17, Spring Boot, MariaDB, systemd blue/green 환경을 설명하지만 기존 다른 서비스와 포트가 있으므로 실제 설정을 검증해야 한다.

## 4. 제안 아키텍처

프론트 화면은 API를 직접 호출하지 않고 Repository 인터페이스만 사용한다.

```text
front/src/
├── app/                  # Router, Provider, Query 설정
├── domain/               # Work, Menu, Entry, Relation schema
├── data/
│   ├── fixtures/         # 정적 sample
│   └── repositories/     # fixture/http/cache 구현
├── features/
│   ├── works/
│   ├── menu-management/
│   ├── characters/
│   ├── worlds/
│   ├── plots/
│   ├── settings/
│   ├── ideas/
│   ├── memos/
│   ├── search/
│   └── archive/
└── shared/
    ├── ui/
    ├── editor/
    ├── relations/
    └── styles/
```

Repository 구현은 `fixture → HTTP → persistent read cache` 순으로 추가한다. TanStack Query query key에는 항상 work ID를 포함한다.

### URL

- `/`: 작품 선택 전용
- `/works/manage`: 작품 관리
- `/works/:workId`: 작품 홈
- `/works/:workId/:sectionId/:menuItemId`: 메뉴 목록
- `/works/:workId/.../new`: 생성
- `/works/:workId/.../:entryId`: 상세
- `/works/:workId/search`: 전체 검색
- `/works/:workId/recent`: 최근 항목
- `/works/:workId/relations`: 관계 그래프
- `/works/:workId/archive`: 보관함
- `/menu/manage`: 전체 작품 공통 메뉴 관리

기존 `/characters01` 같은 URL은 작품 선택 또는 지정한 기본 작품의 신규 경로로 안내한다.

### 핵심 데이터

- Work: id, title, subtitle, cover, summary, genre, status, accentColor, timestamps
- MenuSection: stable id, label, icon, order, archivedAt
- MenuItem: stable id, sectionId, label, slug, resourceType, filterConfig, order, archivedAt
- ContentEntry: id, workId, menuItemId, type, title, summary, Tiptap JSON body, tags, status, order, version, archivedAt
- Relation: source, target, relationType, label, bidirectional, notes
- 모든 콘텐츠는 workId로 격리한다.
- 메뉴는 모든 작품에 공유되는 template이다.
- label 변경과 URL 안정성을 분리한다.

### 전문 모델

- 캐릭터: 기존 필드 전체, 지역, 종족, 소속, 성향, 직업, 신체, 외형, 성격, 무공, 테마, 관계
- 세계관: 분류, 지역, 시대, 규칙, 역사, 문화, 세력, 장소, 캐릭터·플롯 관계
- 플롯: chapter/scene hierarchy, order, status, POV, time, location, characters, event, foreshadowing/payoff
- 설정 자료: 무기·능력·공통 무공 등 동적 분류, 조건, 사용자, 효과, 제한, 등급, 관계
- 아이디어: 유형, 우선순위, 발전 상태, 출처, 채택 여부, 관련 설정
- 메모: title, body, pinned, color, checklist, tags, updatedAt

### UI/UX

- Apple 스타일에서 영감을 받은 큰 제목, 선명한 typography hierarchy, 넓은 여백, 중립색, 작품별 accent color
- Apple 자산을 복제하지 않고 자체 token 사용
- iPhone 44x44pt touch target, input 16px+, safe-area inset
- iPhone 하단 탐색: 작품 홈·검색·최근·메뉴
- 메뉴 탭은 기존 6개 section→item hierarchy를 sheet로 제공
- desktop은 persistent sidebar
- 편집 화면은 keyboard에 가리지 않는 저장 영역
- URL history와 iOS back gesture를 일치
- focus, reduced-motion, WCAG AA contrast
- iPhone SE/일반/Pro Max/landscape/iPad/desktop 검증

### 서버 권장 구조

기존 public 80/443은 Caddy가 유지하고, MONP Spring Boot는 privileged port 81 대신 loopback의 8181 또는 blue/green 8181/8182를 권장한다.

- 우선안: `monp-api.qbix-portfolio.shop` 같은 별도 host를 Caddy 443에서 `127.0.0.1:8181`로 proxy
- 대안: 기존 host의 `/monp-api/*`
- 현재 `/api`가 기존 portfolio API와 충돌하지 않을 때만 `VITE_API_BASE_URL=https://qbix-portfolio.shop/api`를 최종 유지
- 외부 `:81` forwarding은 마지막 대안으로만 문서화
- no-login 개인 서버는 Tailscale 등 network restriction을 권장

## 5. Task Breakdown

### Phase A — 웹 프론트

#### Task 1: 현재 동작을 보호하는 프론트 테스트 기반 구축
- **Objective:** 변경 전 regression safety net을 만든다.
- **Guidance:** pinned Vitest, React Testing Library, MSW, Playwright를 설정하고 기존 route/menu/character transformation characterization tests를 작성한다. lint/build/test scripts를 통합한다.
- **Tests:** 31 menu definitions, 13 character regions, list/create/detail routes, API error handling, human/monster rules.
- **Demo:** 기존 UI 실행 및 전체 test report 통과.

#### Task 2: Fixture와 Repository 계층으로 캐릭터 API 의존 제거
- **Objective:** backend 없이 현재 character pages가 작동하게 한다.
- **Guidance:** Work/Menu/Content/Relation schema와 repository interfaces를 정의하고 Zod로 fixtures를 검증한다. 기존 character UI를 fixture repository에 연결한다. mutations는 session memory만 변경한다.
- **Tests:** all-region filter, search, single item, in-session create/update/archive, invalid fixture rejection.
- **Demo:** network를 차단해도 character list/detail/form 표시.

#### Task 3: 현대적 design system과 adaptive shell 적용
- **Objective:** 기존 depth를 유지하며 Apple-like visual foundation을 만든다.
- **Guidance:** tokens와 Button/Input/Card/Sheet/Dialog/EmptyState/Skeleton을 만들고 430px fixed width를 제거한다. safe area와 accessibility를 반영한다.
- **Tests:** focus-visible, reduced motion, common component accessibility, 375/390/430/768/1200 viewports.
- **Demo:** character UI가 iPhone과 desktop에서 새 layout으로 적응.

#### Task 4: 작품 선택 메인과 별도 작품 관리 구현
- **Objective:** 여러 작품 선택과 management를 지원한다.
- **Guidance:** `/`에는 selection cards만, `/works/manage`에는 work create/update/archive/restore를 둔다. 최초 empty state만 create 안내를 제공한다.
- **Tests:** selection, invalid work, empty state, duplicate slug, archived filtering, CRUD.
- **Demo:** 여러 sample works 중 선택하고 새 work를 관리 화면에서 추가.

#### Task 5: 작품 scoped routing과 adaptive navigation 완성
- **Objective:** content를 work 단위로 격리하고 current hierarchy를 유지한다.
- **Guidance:** `/works/:workId/...`, iPhone bottom navigation/menu sheet, desktop sidebar, dynamic title를 연결한다.
- **Tests:** deep link, refresh, switching work, back navigation, legacy URL handling.
- **Demo:** 같은 menu에서 서로 다른 work data 표시.

#### Task 6: 모든 작품 공통 menu management와 archive 구현
- **Objective:** section/item add/edit/reorder/archive/restore를 지원한다.
- **Guidance:** menuSections.js를 default seed로 전환하고 stable id, slug, resourceType을 추가한다. drag-and-drop과 keyboard reorder를 지원한다. deletion은 archive한다.
- **Tests:** rename without URL break, slug collision, reorder, global propagation, archive/restore, relation preservation.
- **Demo:** 설정/서버를 설정/무기로 변경하면 모든 작품에 반영.

#### Task 7: 공통 content CRUD·rich text·relations 기반 구현
- **Objective:** 모든 전문 feature가 공유할 list/detail/editor flow를 만든다.
- **Guidance:** common ContentEntry shell, pinned Tiptap editor, tags/status/relation picker/unsaved-change dialog를 구축한다. JSON을 canonical body로 저장하고 render output을 sanitize한다.
- **Tests:** title validation, long body, undo/redo, unsafe markup, duplicate/self relations, navigation with dirty form.
- **Demo:** formatted entry 작성 및 관계 연결.

#### Task 8: Character 전문 기능 완성
- **Objective:** 기존 character feature를 새 구조로 이전하고 full CRUD/archive를 지원한다.
- **Guidance:** 모든 기존 필드를 editable하게 하고 filters, debounce, image preview, profile theme, relations, archive를 추가한다. characters00은 all filter로 처리한다.
- **Tests:** all fields, species branch, region all, debounce, image failure, archive/restore.
- **Demo:** create→relation→edit→archive→restore.

#### Task 9: World 전문 화면 구현
- **Objective:** region/history/culture/faction/rule data를 관리한다.
- **Guidance:** category list, region views, era/rule fields, character/plot relations and summary cards를 제공한다.
- **Tests:** filters, reverse relations, empty state, archive.
- **Demo:** region 설정과 관련 character/plot 연결.

#### Task 10: Plot 전문 화면 구현
- **Objective:** chapter/scene hierarchy와 foreshadowing을 관리한다.
- **Guidance:** existing chapter links를 유지하며 scene order, status, POV, time, location, characters, foreshadow/payoff를 제공한다.
- **Tests:** scene move/reorder, chapter move, unresolved clue filter, archived targets.
- **Demo:** chapter scene 작성·이동·관계 연결.

#### Task 11: Setting 자료 전문 화면 구현
- **Objective:** weapon/ability/common martial art 등 확장 가능한 설정을 관리한다.
- **Guidance:** labels에 logic을 묶지 않고 resource type/configurable fields를 사용한다. effect, grade, condition, limitation, owner relations를 제공한다.
- **Tests:** menu rename, category add, different field sets, character relation.
- **Demo:** server labels를 weapon/ability category로 재구성.

#### Task 12: Idea와 Memo 전문 화면 구현
- **Objective:** quick capture와 idea development를 지원한다.
- **Guidance:** idea type/priority/status/adoption, memo pin/color/checklist/quick entry를 제공한다. idea를 target resource로 변환하면서 origin relation을 유지한다.
- **Tests:** quick add, pinned sort, checklist, state transition, conversion.
- **Demo:** dialogue idea를 plot scene으로 변환.

#### Task 13: Unified search/filter/recent/relation graph 구현
- **Objective:** content가 많아져도 탐색 가능하게 한다.
- **Guidance:** title/summary/body/tag search, type/menu/status filters, recent list를 제공한다. accessible relation list가 기본이고 graph view를 추가한다.
- **Tests:** Korean search, compound filters, result deep link, cycles, large graph, keyboard fallback.
- **Demo:** character를 검색해 connected world/plot/settings 탐색.

#### Task 14: Archive 및 JSON export/import 구현
- **Objective:** recovery와 portable user backup을 지원한다.
- **Guidance:** combined archive, selective restore, versioned JSON export/import, import preview/conflict handling을 제공한다. image binaries는 제외하고 manifest/URL만 포함한다.
- **Tests:** schema versions, corrupt files, duplicate IDs, merge/replace, relation integrity, round trip.
- **Demo:** export 후 clean session에 import 및 관계 복구.

#### Task 15: 전체 Web milestone 검증 및 Vercel 정리
- **Objective:** 기존 31 links와 모든 새 기능을 web version으로 완성한다.
- **Guidance:** errors/loading/empty states/favicon/meta/SPA rewrite/performance/accessibility/README/env docs를 정리한다. default mode는 fixture다.
- **Tests:** full Playwright journeys, accessibility, build, lint, unit/integration tests, mobile smoke.
- **Demo:** Vercel preview에서 selection부터 all menus/search/export까지 시연.

### Phase B — Backend와 MiniPC

#### Task 16: `back/` Spring Boot·MariaDB foundation 구축
- **Objective:** test-first executable backend와 migrations를 만든다.
- **Guidance:** Java 17-compatible maintained Spring Boot, Gradle Wrapper, Web, Validation, Data JPA, Flyway, MariaDB, Actuator를 exact versions로 pin한다. `/healthz`, Problem Details, environment config를 제공한다.
- **Tests:** JUnit, MockMvc, Testcontainers MariaDB context/migration/health.
- **Demo:** local DB container에서 health와 OpenAPI 확인.

#### Task 17: Work/Menu/Archive API 구현
- **Objective:** core front models를 DB에 persist한다.
- **Guidance:** `/api/v1/works`, menu-sections/items, reorder, archive, restore APIs와 optimistic locking을 구현한다.
- **Tests:** CRUD, reorder transaction, slug conflict, archive cascade, restore, concurrent update 409.
- **Demo:** API 변경이 DB restart 뒤 유지.

#### [x] Task 18: Specialized content/relation/search/image/export API 구현
- **Objective:** 모든 front feature backend support를 완성한다.
- **Guidance:** character/world/plot/setting/idea/memo, relation, search, image metadata/storage, export/import endpoints를 구현한다. body JSON과 file MIME/size를 validate한다.
- **Tests:** module CRUD, work isolation, relation integrity, search, malicious files, export/import, N+1 detection.
- **Demo:** linked data 저장·검색·export.

#### [x] Task 19: Front HTTP 연결과 text offline read cache 구현
- **Objective:** UI rewrite 없이 fixture에서 HTTP repository로 전환한다.
- **Guidance:** environment repository switch, versioned API client, timeout/cancel, exact CORS origins, TanStack persistent query cache+IndexedDB를 구성한다. images는 persist하지 않고 offline mutation을 막는다. gcTime/maxAge/buster를 일치시킨다.
- **Tests:** contract, online→offline, cache buster/expiry, work isolation, mutation blocking.
- **Demo:** online 조회 후 network off 상태에서 text 재조회와 disabled editor.

#### Task 20: MiniPC deployment와 server guide 완성
- **Objective:** portfolio 서비스와 충돌 없이 backend를 운영한다.
- **Guidance:** Spring을 loopback 8181 또는 blue/green 8181/8182에 systemd로 배포하고 Caddy host/path route, health, TLS, logs, firewall, rollback을 설정한다. MariaDB dump와 uploads backup을 구성한다. public unauthenticated writes를 피하도록 Tailscale 등 network restriction을 우선 제안한다.
- **Tests:** Caddy validation, health, restart, rollback, CORS, backup restore, exposure check.
- **Demo:** 기존 portfolio와 MONP API가 같은 443에서 다른 host/path로 동작.
- **Deliverable:** `front/ai_read/MINIPC_MONP_SERVER_GUIDE.md`에 systemd/Caddy/env/DNS/TLS/UFW/router external 81 alternative/logs/health/backup/restore/security를 민감값 없이 기록.

### Phase C — iPhone

#### Task 21: Capacitor iOS project와 iPhone UX 구축
- **Objective:** 완성된 web code를 실제 iPhone app으로 실행한다.
- **Guidance:** Capacitor core/CLI/iOS exact compatible versions, `webDir=dist`, app ID, icons, launch screen, safe area, status bar, network state를 설정한다. build→cap sync→Xcode workflow를 문서화한다.
- **Tests:** simulator+device deep links, keyboard, back gesture, rotation, background, online/offline transitions.
- **Demo:** Mac mini M4 Xcode로 iPhone에 설치하고 online CRUD/offline text read 시연.

#### Task 22: Web·Backend·MiniPC·iPhone 최종 통합
- **Objective:** 전체 구성요소를 운영 flow로 연결하고 recovery까지 검증한다.
- **Guidance:** Vercel env와 final API endpoint를 연결하고 OpenAPI contracts, README, runbook, schema versions, release checklist를 확정한다.
- **Tests:** work selection→all menu CRUD→search→relations→archive→export→server backup/restore→iPhone offline read full E2E.
- **Demo:** web/iPhone shared data, server outage cached read, recovery 후 edit.

## 6. 필수 산출물

- `front/ai_read/MONP_DB_IMPLEMENTATION_PLAN.md`
- `front/ai_read/MINIPC_MONP_SERVER_GUIDE.md`
- `front/README.md`
- `back/README.md`
- OpenAPI spec
- export schema documentation
- deployment/backup/restore checklist
- iPhone Xcode build/install guide

## 7. 실행 지침

- Task 1부터 순차 실행한다.
- 각 Task에서 기존 코드를 먼저 읽고 설계를 확인한 뒤 수정한다.
- dependency 추가 시 최신 호환성을 확인하고 exact version으로 pin한다.
- 각 Task 종료 전 관련 unit/integration/E2E, lint, build를 실행한다.
- validation failure는 다음 Task로 넘어가기 전에 해결한다.
- 기존 portfolio 서비스, production Caddy, firewall, router, server data 등 high-risk 변경은 실제 적용 전에 사용자 확인을 받는다.
- commit/push는 사용자가 명시적으로 요청할 때만 한다.
