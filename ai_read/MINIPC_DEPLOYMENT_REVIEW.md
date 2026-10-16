# MiniPC MONP 배포 검토 결과

> **후속 운영 확인(2026-10-16):** 사용자가 공개 비밀번호 서버/Vercel 배포 완료. 새 Chromium context에서 별도 로컬 네트워크 권한 없이 공개 웹 200 → 비밀번호 확인 200 → versions/works 200 → refresh 유지 → logout 204 → 폐기 token 401, 페이지 오류 0 확인. 비인증 works 401, MONP/portfolio health 정상, API/backup timer/Caddy/portfolio-blue active. 운영 데이터 변경 없음. rollback `/var/backups/monp-password-release/20261015T055422Z`. 현재 API base `https://qbix-portfolio.shop/monp-api/api`; [PASSWORD_PUBLIC_ACCESS.md](PASSWORD_PUBLIC_ACCESS.md)를 따른다. 아래 Tailscale-only 및 설치 대기는 과거 이력이다. 다른 물리 장치·외부 회선/운영 복구/off-host 복제는 미검증이다.

> 확인일: 2026-10-12 · 호스트: `coke-NucBox-G3` · 2026-10-14 전용 DB·서비스·백업 타이머 로컬 설치 완료

## 2026-10-14 로컬 설치 완료 확인

**Vercel 운영 조회 검증 완료:** Production HTTP env/redeploy 후 공개 bundle에서 HTTP/API base 확인, MiniPC DNS enabled·일반 FQDN health UP 확인. 390×844 Chromium의 해당 site에 local-network-access를 허용하여 실제 공개 웹의 `/api/v1/versions`·`/api/v1/works` 200, 페이지 오류 0/실패 API 요청 0, 작품 0개를 확인했다. 검증은 read-only, 운영 데이터 생성/수정 없음. 권한 미허용 fresh context는 local address space permission error로 초기 요청이 막히므로 브라우저 권한 허용이 필요하다. 다른 기기/공개 인터넷/운영 복원 검증은 아직 완료하지 않았다.

**네트워크 후속 완료:** Tailscale 1.104.1 설치·로그인·HTTPS 활성화 및 Caddy MONP host 적용 완료. config backup `/var/backups/monp-caddy/20261014T093633Z`. 실제 node IP에 연결해 인증서 검증을 유지한 HTTPS health UP/works 200, Vercel origin CORS 200, 비허용 origin·loopback source 403, 기존 portfolio HTTPS 정상. MiniPC는 초기 `accept-dns=false`로 일반 FQDN 조회가 안 되어 DNS 사용 활성화가 필요하다. Vercel env/redeploy와 다른 PC/iPhone 등록·실접속은 아직 미완료다. 자세한 연결 절차는 `TAILSCALE_CONNECTION_GUIDE.md`를 따른다. 아래 Tailscale/Caddy 미설치 설명은 이전 이력이다.

사용자가 `finish-local-install.sh`를 실행하여 정상 종료 설정과 최초 백업·timer 활성화를 완료했다. 직접 확인 결과 `monp-api.service`와 `monp-backup.timer`는 enabled/active, backup의 `Result=success`, `ExecMainStatus=0`이다. 완성된 백업은 `/var/backups/monp/20261014T083005Z`이며 사용자 실행 출력에서 `monp.sql`과 `uploads.tar.gz`의 SHA256SUMS 검증이 모두 OK였다. 최초 자동 실행 예정은 2026-10-15 04:17:28 KST다.

MONP는 loopback 8181에만 listen하며 `/healthz` status UP, portfolio 8081은 status ok다. portfolio Blue·MariaDB·Caddy도 active다. 로컬 설치 승인 범위는 완료했다. 실제 HTTPS 접근을 위한 Tailscale/Caddy·Vercel HTTP API 연결, 다른 장치 접근 제어와 운영 복구 검증은 남아 있으므로 Task 20 전체 완료로 표시하지 않는다. 아래 실패 기록은 수정 전 이력이다.

## 2026-10-14 최초 설치 실행 후 상태

사용자가 서버 터미널에서 설치를 실행했다. 전용 DB와 Flyway V1~V4, OS user, release/env/uploads, MONP API unit은 설치됐고 API unit은 enabled/active다. release는 `/opt/monp-api/releases/20261014T075551Z`, 운영 Java 로그는 17.0.20.1이다. MONP `/healthz`는 status UP, portfolio는 status ok다. 백업 unit은 설치됐지만 최초 실행에서 실패했고 timer는 disabled/inactive다.

실제 로그에서 Java graceful shutdown 후 exit 143을 systemd가 실패로 판정하여 `ActiveState=failed`가 됐다. 백업 스크립트의 inactive 확인에 걸려 dump 전에 중단됐으며 EXIT trap이 API를 다시 시작했다. `monp-api.service.example`에 `SuccessExitStatus=143`을 추가했다. 임시 **user systemd unit**으로 기본 설정에서는 failed, 해당 설정에서는 inactive를 직접 재현·검증했다. 백업 실패로 운영 데이터를 삭제하거나 DB를 다시 만들지 않는다.

`back/deploy/finish-local-install.sh`는 기존 설치를 유지하고 `/etc/systemd/system/monp-api.service.d/10-java-exit.conf`에 정상 종료 코드를 추가한 뒤 daemon-reload, 최초 백업 재실행, SHA256SUMS 검사, API health, timer enable, portfolio health를 확인한다. 에이전트의 sudo 실행은 비밀번호 필요로 시작 전에 종료됐으므로 사용자가 서버 터미널에서 다음을 실행해야 한다. 설치 승인은 유지되며 재승인은 필요 없다.

```bash
sudo bash back/deploy/finish-local-install.sh
```

초기 `install-local.sh`는 기존 DB/경로가 있으므로 재실행하지 않는다. 실제 백업 성공·timer 활성화 검증은 위 명령 실행 후 남아 있다. Tailscale/Caddy는 아직 미변경이다. 아래 2026-10-12 분리 검증 결과와 설치 전 설명은 이 후속 상태를 기준으로 해석한다.

## 확인한 환경

| 항목 | 실제 확인값 |
| --- | --- |
| 작업공간 | `/home/coke/Desktop/code/monp_db_re` (`front/`만 Git 저장소) |
| OS | Ubuntu 24.04.2 LTS x86_64 |
| Java | Temurin OpenJDK 17.0.18 |
| Node / npm | 22.22.1 / 10.9.4 |
| MariaDB / Caddy | 10.11.14 / 2.6.2 |
| portfolio | Blue active, Green inactive, 8081 health `{"status":"ok"}` |
| Caddy | active, `qbix-portfolio.shop` → `127.0.0.1:8081`; user `caddy` |
| MariaDB bind | `127.0.0.1:3306` |
| MONP 포트 | 점검 시작 시 8181 미사용; 검증 동안만 임시 API가 사용 |
| LAN | `192.168.0.4/24` |
| 디스크 | 약 411 GiB 여유(점검 당시) |
| Tailscale / Docker | 실행 파일 없음; tailscaled inactive |
| 관리자 권한 | `sudo -n true` 실패: 비밀번호 필요 |

UFW rule은 root 권한이 없어 확인하지 못했다. 외부 DNS·현재 공인 IP·공유기 forwarding·외부 scan은 이번에 검증하지 않았다. `SERVER_INFO.md`의 8443 접속 설명은 80/443 forwarding만으로 보장되지 않는다. 실제 외부 접속은 따로 확인한다. portfolio env와 DB 데이터는 읽거나 재사용하지 않았다.

## 검증 결과

- backend `clean build`: **33 tests, failures/errors/skips 0**. Docker 없이 `/tmp/monp-verify.*`에 별도 MariaDB를 만들고 loopback 13316의 `monp_minipc_test`를 사용했다. 운영 3306에 연결하지 않았다.
- frontend: **45 files / 313 tests 통과**, lint·fixture production build 통과. 동시 Gradle build와 2 workers 실행 때 4건 실패(시간 제한·화면 대기)가 있었으나 해당 22개 재검증과 전체 313개를 `--maxWorkers=1`로 통과했다. 제품 코드·test timeout은 변경하지 않았다. MiniPC에서는 build와 frontend tests를 순차 실행한다.
- HTTP production build 및 Playwright **2/2 통과**: 캐릭터 저장/관계/수정/새로고침/JSON 백업 가져오기/오프라인 text, 전문 editor의 DB 쓰기.
- prod runtime: `/healthz` 200 UP, `/v3/api-docs`와 `/actuator/env` 404, 정확한 CORS origin preflight 허용 및 다른 origin 403, 작품·이미지 API 재시작 후 보존.
- 백업: 실제 MariaDB dump와 upload archive, SHA-256 대조, 별도 `monp_restore_test` DB와 별도 upload 경로에 복원 후 작품/이미지 HTTP 조회 통과. 해당 MariaDB는 `/tmp/monp-runtime.*`, loopback 13317이다.
- 백업 lifecycle: **mock systemctl**에서 MONP stop/start 호출과 dump 실패 시 start·임시 백업 정리를 확인했다. 운영 systemd start/stop 및 timer는 아직 미검증이다.
- Caddy: 운영 Caddyfile을 읽어 `.ts.net` 초안을 합친 임시 파일로 adapt/validate 통과. 기존 upstream 포함이며 실제 reload는 하지 않았다.
- systemd: `.example`을 `/tmp`의 정상 `.service`/`.timer` 이름으로 복사해 verify 통과. backup ExecStart는 설치 전이라 실제 bash/script 경로로 대체해 검사했다. 실제 서비스 hardening·권한·resource usage는 설치 후 확인한다.

Testcontainers 모드는 Docker가 없어 미검증이다. 실제 TLS·tailnet ACL·다른 장치 허용/거부·브라우저 로컬 네트워크 권한·외부 노출·운영 rollback·원격 백업 복제·iOS 실기기는 아직 검증하지 않았다. 이전 release가 없어 JAR rollback 시연은 첫 배포 이후 가능하다.

## 검증된 release

- JAR: `back/build/libs/monp-api.jar` (60,751,079 bytes)
- SHA-256: `f0b4e89fee7d52a821815b531100e184ab453bbf28136e57616966a612ac61a5`
- 최초 설치 스크립트는 이 checksum을 고정한다. JAR를 다시 빌드하면 hash를 다시 검증하고 스크립트도 검토해야 한다.

## 승인받을 실제 변경

1. **2026-10-14 사용자 확인 완료:** MONP는 Vercel의 `https://monpdb.vercel.app/`에 배포되어 있다. CORS origin은 마지막 slash를 제외한 `https://monpdb.vercel.app`이다.
2. `back/deploy/install-local.sh`로 전용 MONP DB/user·OS user·release/env/uploads/backup 경로·systemd API·backup timer를 최초 설치한다. 범위와 실패 대응은 [서버 가이드](MINIPC_MONP_SERVER_GUIDE.md)에 있다. 기존 MONP DB/계정/경로가 있으면 거부한다.
3. 소유자 계정으로 MiniPC 및 web/iPhone 장치를 Tailscale에 등록하고 ACL·MagicDNS·HTTPS를 설정한다. 실제 FQDN이 나오면 `monp-api.tailscale.caddy.example`의 placeholder를 바꾼 최종 diff를 검토한다.
4. Caddyfile backup → 최종 combined config validate → 별도 MONP site import 추가 → reload → portfolio와 MONP health → 허용/거부 클라이언트 및 TLS·외부 노출 확인 순으로 적용한다. 현재 Caddyfile은 global site import가 없으므로 MONP를 conf.d에 복사하는 것만으로 활성화되지 않는다.
5. web HTTP env·iOS API 주소는 tailnet HTTPS endpoint를 사용한다. Vercel production env 변경은 별도로 승인한다.

2026-10-14 사용자가 **MONP 전용 DB·서비스·백업 타이머 설치를 승인했다**. frontend origin도 확정됐다. 호스트·JAR hash·portfolio/MariaDB/Caddy active·8181 미사용을 다시 확인하고 `sudo -n bash back/deploy/install-local.sh https://monpdb.vercel.app`를 실행했으나 `sudo: a password is required`로 설치 전에 종료했다. 운영 설치는 아직 시작되지 않았으며 재승인은 필요 없다. 서버 터미널에서 사용자가 sudo 인증을 포함해 같은 설치 스크립트를 실행한 뒤 운영 검증을 이어간다. Tailscale/Caddy/Vercel 변경은 이번 설치 승인 범위에 포함되지 않으며 Tailscale 등록은 소유자 로그인이 필요하다. sudo 비밀번호·Tailscale auth key를 채팅이나 저장소에 넣지 않는다.

## 재현 명령

저장소 루트에서 실행한다. 모든 검증 DB/process는 별도 loopback 포트와 임시 경로를 사용하고 종료 시 process를 정리한다. 임시 검증 파일은 재검토용으로 `/tmp`에 남으며 운영 데이터가 아니다.

```bash
bash back/deploy/verify-minipc.sh
bash back/deploy/verify-runtime.sh --http-e2e
bash back/deploy/validate-drafts.sh
```

프론트 unit test는 `front/`에서 `npm test -- --maxWorkers=1`로 실행한다. HTTP E2E는 Playwright Chromium이 필요하다(현재 `/home/coke/.cache/ms-playwright`에 다운로드 완료). `verify-runtime.sh`는 다른 API가 8181을 사용하면 거부하므로 MONP 운영 설치 뒤에는 운영 API를 중지하지 말고 검증용 포트를 별도로 정해야 한다.
