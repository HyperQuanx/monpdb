# MONP MiniPC 서버 준비 안내

> **2026-10-18 후속:** 공개 웹/API·CORS·서비스/백업 상태와 loopback 바인딩 정상. 분리 DB의 재시작·SQL/uploads 복구 훈련 재실행 통과. 실제 외부 기기 검증, 운영 백업 사본 점검/rollback·복원, 외부 복제 대상 확정은 [TASK20_OPERATIONS_CHECKLIST.md](TASK20_OPERATIONS_CHECKLIST.md)를 따른다. 읽기 전용 `check-recovery-readiness.sh` 및 기본 계획 모드 `replicate-monp.sh`를 준비했으며 실제 운영 복원/원격 복제는 실행하지 않았다.

> **현재 상태(2026-10-16):** 전용 DB·API·백업 timer와 공개 비밀번호 접속 운영 배포 완료. 웹 `https://monpdb.vercel.app/`, API `https://qbix-portfolio.shop/monp-api/api`. 새 브라우저에서 비밀번호 확인/작품 조회/refresh/logout·token 폐기 통과, health와 관련 서비스 정상. 기기별 Tailscale 설치는 필요 없다. [PASSWORD_PUBLIC_ACCESS.md](PASSWORD_PUBLIC_ACCESS.md)가 현재 구성의 기준이며 아래 Tailscale 준비·인증 없음 설명은 전환 전 이력이다. 별도 물리 장치·외부 회선과 운영 복구 검증은 남아 있다.

2026-10-14 전용 MONP DB·API·backup timer 운영 설치와 최초 백업 검증을 완료했다. Tailscale/Caddy HTTPS 연결은 준비 중이며 [TAILSCALE_CONNECTION_GUIDE.md](TAILSCALE_CONNECTION_GUIDE.md)를 따른다. 상세 검증·설치 이력은 [MINIPC_DEPLOYMENT_REVIEW.md](MINIPC_DEPLOYMENT_REVIEW.md)를 참고한다. `SERVER_INFO.md`의 과거 값 중 Java 버전과 소스 경로는 현재와 다르다.

## 배포 구성

- Spring Boot JAR는 `/opt/monp-api/releases/<release-id>/monp-api.jar`에 둔다. `/opt/monp-api/current`는 활성 release를 가리키는 symlink로 관리한다.
- 전용 `monp` OS 사용자와 `/etc/monp/monp-api.env` 환경 파일을 쓴다. 업로드 디렉터리는 `/var/lib/monp-api/uploads`다.
- MariaDB에 전용 `monp` DB와 최소 권한 계정을 만든다. 기존 portfolio DB·계정·환경 파일을 공유하지 않는다.
- API는 loopback `127.0.0.1:8181`에만 bind한다. systemd 예시는 [monp-api.service.example](../../back/deploy/monp-api.service.example)이다.
- portfolio와 RAM을 공유하므로 MONP JVM heap은 `-Xms128m -Xmx512m`로 제한한다. 종전 `MaxRAMPercentage=70` 예시는 교체했다.
- Caddy는 별도의 API host로 전달하도록 제안한다. [monp-api.caddy.example](../../back/deploy/monp-api.caddy.example)은 Tailscale 주소 대역만 허용하는 예시이며, `example.invalid`를 실제 API DNS 이름으로 바꾸고 소유자 장치만 허용하는 Tailscale ACL을 먼저 설정한다.
- CORS origin 목록은 실제 웹 주소와 `capacitor://localhost`, `https://localhost` 중 사용하는 앱 origin으로 제한한다. CORS는 인증이 아니다. 현재 API에는 사용자 로그인 기능이 없으므로 공개 인터넷에서 쓰기 API에 접근할 수 있도록 설정하지 않는다.

### 현재 서버에서 우선 적용할 구성

Tailscale은 현재 설치되지 않았다. 먼저 승인 후 loopback 전용 MONP DB·서비스를 설치하고, Tailscale 등록·소유자 장치 ACL·HTTPS를 설정한 뒤 별도 Caddy site를 추가한다. 공유기의 80/443/2222 포워딩, portfolio의 8081 upstream, UFW 변경은 필요하지 않다. UFW 실제 rule과 외부 포트포워딩은 이번 일반 사용자 점검에서 확인하지 못했다.

권장 API 주소는 `https://<MiniPC의 실제 MagicDNS FQDN>.ts.net/api`다. [monp-api.tailscale.caddy.example](../../back/deploy/monp-api.tailscale.caddy.example)은 IPv4와 IPv6 tailnet source를 허용하고 그 외에는 403을 반환한다. 대역 제한과 함께 ACL을 소유자 장치로 제한해야 한다. `.ts.net` HTTPS를 tailnet에서 활성화하고 `/etc/default/tailscaled`에 `TS_PERMIT_CERT_UID=caddy`를 설정해야 Caddy 사용자로 인증서를 얻을 수 있다. 기존 설정값은 보존하며 변경 후 tailscaled 재시작은 별도로 승인받는다. 인증서 발급 도메인은 공개 인증서 투명성 로그에 기록된다. 세부 절차는 [Tailscale Caddy 공식 문서](https://tailscale.com/docs/integrations/web-servers/caddy/caddy-certificates)와 [HTTPS 공식 문서](https://tailscale.com/docs/how-to/set-up-https-certificates)를 따른다.

브라우저가 직접 사설 API에 접속하므로 웹/iPhone 장치도 tailnet에 연결되어야 한다. Vercel 사이트가 공개여도 API가 인터넷에 공개될 필요는 없다. 브라우저의 로컬 네트워크 접근 권한과 실제 HTTPS CORS는 운영 적용 후 장치에서 확인한다. 현재 HTTP E2E는 localhost 검증이다.

### 승인 후 최초 로컬 설치

**2026-10-14 완료:** 최초 설치와 finish 스크립트 실행 후 API/backup timer enabled·active, 최초 backup Result=success와 SQL/uploads checksum OK를 확인했다. MONP는 loopback 8181·health UP, portfolio 정상이다. 초기 설치·finish 명령을 다시 실행할 필요는 없다. 아래 sudo 대기/실패 설명은 진행 과정의 기록이며 다음 단계는 Tailscale/Caddy HTTPS 연결이다.

2026-10-14 최초 설치는 사용자가 실행하여 DB·API 설치까지 완료됐다. 최초 backup은 Java exit 143이 failed로 표시되는 문제로 중단됐고 timer는 아직 비활성이다. `SuccessExitStatus=143` 수정과 백업 재실행은 `sudo bash back/deploy/finish-local-install.sh`로 처리한다. 이 스크립트는 기존 DB/env/release를 보존하고 systemd drop-in만 추가한다. 초기 설치 명령을 다시 실행하지 않는다. 자세한 상태는 배포 검토 결과의 최초 설치 후속 섹션을 따른다.

2026-10-14 전용 DB·서비스·백업 타이머 설치는 사용자 승인을 받았다. 에이전트의 `sudo -n` 실행은 비밀번호 필요로 설치 전에 종료했다. 재승인은 필요 없으며 아래 명령을 저장소 루트의 서버 터미널에서 실행해 sudo 비밀번호를 직접 입력한다. 실행 후 health·unit·backup·timer·portfolio 유지 여부를 확인한다. 비밀번호는 채팅에 보내지 않는다.

[install-local.sh](../../back/deploy/install-local.sh)는 현재 검증된 JAR checksum, 호스트, 8181 충돌, 기존 MONP DB/user/경로를 검사하고 기존 MONP 설치가 있으면 덮어쓰기 전에 멈춘다. 실제 웹 origin이 확정되고 운영 설치를 승인받은 후 실행한다.

```bash
sudo bash back/deploy/install-local.sh https://monpdb.vercel.app
```

설치 범위는 `monp` OS user/group, MariaDB `monp` DB와 `monp_app@127.0.0.1`, `/etc/monp`, `/opt/monp-api`, `/var/lib/monp-api`, `/var/backups/monp`, `monp-api.service`, `monp-backup.service/timer`, `/usr/local/sbin/backup-monp`이다. Caddy·Tailscale·DNS·공유기·방화벽을 수정하지 않는다. 무작위 DB 비밀번호는 stdin과 root 0600 env 파일로만 전달한다. Flyway가 앱 시작 때 migration을 실행하므로 app account의 DDL 권한도 전용 `monp.*` 범위에서 필요하다.

최초 설치는 실패 시 전체 자동 삭제하지 않는다. health 실패 시 MONP service를 disable/stop하고 전용 파일·DB를 진단용으로 남긴다. 다른 서비스나 운영 DB를 자동으로 되돌리거나 삭제하지 않는다. 재실행 전 실패 지점을 확인해야 한다. 활성화 후 `systemctl stop monp-backup.timer monp-api.service`로 MONP만 중지할 수 있다.

## 서버 환경 변수

`/etc/monp/monp-api.env`는 root 소유, mode `0600`으로 만든다. 실제 값은 서버에서 정하고 이 저장소에 넣지 않는다.

```ini
SPRING_PROFILES_ACTIVE=prod
MONP_SERVER_ADDRESS=127.0.0.1
MONP_SERVER_PORT=8181
MONP_DB_URL=jdbc:mariadb://127.0.0.1:3306/monp
MONP_DB_USERNAME=monp_app
MONP_DB_PASSWORD=<server-only-secret>
MONP_UPLOAD_DIRECTORY=/var/lib/monp-api/uploads
MONP_CORS_ORIGINS=https://monpdb.vercel.app,capacitor://localhost
MONP_API_DOCS_ENABLED=false
MONP_SWAGGER_UI_ENABLED=false
```

백업 DB 연결 설정은 별도 `/etc/monp/backup.cnf`에 둔다(`0600`, root 소유). 최초 설치 스크립트는 root-run backup에 MariaDB root의 로컬 Unix socket 인증을 사용한다(`user=root`, `host=localhost`, `protocol=socket`, `socket=/run/mysqld/mysqld.sock`). portfolio env를 읽거나 재사용하지 않으며 dump 대상은 `monp`만 지정한다. 별도 백업 DB account를 사용한다면 dump의 `--routines --triggers`까지 필요한 읽기 권한을 DBA가 확인한다.

## 설치 및 점검 순서

1. 운영체제, Java 17, MariaDB 10.11, Caddy, systemd, 기존 포트폴리오 unit/포트와 Caddyfile을 확인한다. `SERVER_INFO.md` 내용과 다르면 현재 서버 값을 기준으로 계획을 수정한다.
2. 소유자 전용 Tailscale 접근과 ACL, DNS 이름, HTTPS 인증서를 정하고 로컬 네트워크 및 외부에서 허용/차단을 확인한다. 공유기 포트포워딩이나 UFW를 바꾸지 않는다.
3. 전용 DB·계정·환경 파일·업로드/백업 폴더를 만들고 권한을 확인한다. 기존 DB를 대상으로 migration을 실행하지 않는다.
4. 백엔드 테스트를 통과한 JAR를 새 release 경로에 복사하고 checksum을 확인한다. systemd 예시를 `/etc/systemd/system/monp-api.service`로 설치한 뒤 `systemctl daemon-reload`, `enable --now monp-api`로 시작한다.
5. 서버 안에서 `curl -fsS http://127.0.0.1:8181/healthz`를 확인한다. health는 MariaDB 연결을 포함한다. `journalctl -u monp-api -n 100 --no-pager`로 로그를 확인한다.
6. Caddy 설정을 적용하기 전에 `caddy validate --config /etc/caddy/Caddyfile`을 실행한다. 다른 사이트의 설정 변경이 없는지 diff를 살핀 뒤 reload하고, 허용된 tailnet 장치에서만 `https://<api-host>/healthz`가 응답하는지 확인한다.
7. 프론트 HTTP 빌드는 `VITE_DATA_MODE=http`과 확인된 API base URL을 사용한다. 브라우저/앱에서 preflight와 실제 CORS origin, 데이터 CRUD를 확인한다. Vercel의 공유 production 환경은 이 저장소에서 변경하지 않는다.

## 백업과 복구

[backup-monp.sh.example](../../back/deploy/backup-monp.sh.example)을 root 소유 executable로 설치한다. [monp-backup.timer.example](../../back/deploy/monp-backup.timer.example)은 서버 로컬 시간 매일 04:15부터 최대 10분 지연 후 실행한다. 스크립트는 flock으로 중복 실행을 차단하고 **MONP API만 잠시 중지**해 SQL과 uploads의 일관성을 보장한다. 이 동안 MONP 조회·쓰기는 일시 중단된다. 덤프/압축 실패 시에도 원래 active였던 MONP는 EXIT trap에서 재시작하며 실패한 백업은 공개하지 않는다. SHA256SUMS를 생성하고 완성된 백업 폴더만 atomic rename한다. 14일을 넘긴 백업은 정리한다. 이 설정은 아직 운영에 설치되지 않았다. 별도 장치나 암호화된 원격 저장소에 사본을 복제해야 MiniPC 디스크 고장에도 복구할 수 있다.

복원 전에 백업 폴더에서 `sha256sum -c SHA256SUMS`를 실행한다. 다른 배포/유지보수 작업은 백업과 겹치지 않게 계획한다. MONP 이외의 DB writer가 추가되면 이 중지 방식만으로 일관성을 보장할 수 없으므로 함께 중지해야 한다.

복구 훈련은 별도의 빈 restore DB와 임시 업로드 경로에서 진행한다. SQL 복원 후 같은 시점의 `uploads.tar.gz`를 풀고, 임시 포트에서 API를 띄워 health·작품 수·이미지 조회를 확인한다. 검증된 백업의 날짜와 checksum을 기록한다. 운영 DB에 덮어쓰는 복구는 복구 대상과 백업 시점을 정하고 확인한 뒤 실행한다.

## 롤백·로그·네트워크

- 새 release가 health 또는 smoke test에 실패하면 Caddy를 바꾸지 않고 서비스를 중지한다. `current` symlink를 직전 release로 되돌린 뒤 재시작·health 확인을 한다.
- 이전 JAR 롤백은 DB migration을 되돌리지 않는다. 하위 호환 migration이 확인되지 않으면 백업 복원 절차가 필요하다.
- 로그는 journald에서 확인한다. 비밀번호·백업 파일·사용자 작성 본문을 로그에 남기지 않는다.
- DB `3306`과 Spring `8181`은 외부 interface에 bind하거나 공유기에서 포워딩하지 않는다. 외부 접속은 HTTPS Caddy와 Tailscale 접근 제어만 거친다.
- MiniPC의 다른 서비스, Caddy 전역 설정, firewall, 공유기, DNS, 운영 데이터 변경은 별도 적용 전에 현재 설정을 백업하고 구체적인 변경 내역을 검토한다.

## 필요한 실제 서버 확인

현재 MiniPC에서 직접 작업하므로 MONP 배포를 위한 SSH alias는 필요하지 않다. 2026-10-14 사용자가 Vercel 배포 주소 `https://monpdb.vercel.app/`를 확인했다(CORS origin은 `https://monpdb.vercel.app`). 남은 정보는 Tailscale 계정·장치 등록·ACL·MagicDNS FQDN이다. 운영 설치 승인은 아직 대기 중이며 systemd/Caddy 실적용, TLS·tailnet 허용/거부 클라이언트, 외부 노출, 운영 restart/rollback, off-host 복제는 승인 후 검증한다. 임시 DB 복원 훈련은 운영 DB 복구를 대신하지 않는다.
