# MiniPC MONP 배포 검토 결과

> 확인일: 2026-10-12 · 호스트: `coke-NucBox-G3` · Task 20 운영 적용 승인 대기

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

1. 실제 MONP frontend HTTPS origin을 확정한다. 기존 portfolio frontend origin을 MONP origin으로 가정하지 않는다.
2. `back/deploy/install-local.sh`로 전용 MONP DB/user·OS user·release/env/uploads/backup 경로·systemd API·backup timer를 최초 설치한다. 범위와 실패 대응은 [서버 가이드](MINIPC_MONP_SERVER_GUIDE.md)에 있다. 기존 MONP DB/계정/경로가 있으면 거부한다.
3. 소유자 계정으로 MiniPC 및 web/iPhone 장치를 Tailscale에 등록하고 ACL·MagicDNS·HTTPS를 설정한다. 실제 FQDN이 나오면 `monp-api.tailscale.caddy.example`의 placeholder를 바꾼 최종 diff를 검토한다.
4. Caddyfile backup → 최종 combined config validate → 별도 MONP site import 추가 → reload → portfolio와 MONP health → 허용/거부 클라이언트 및 TLS·외부 노출 확인 순으로 적용한다. 현재 Caddyfile은 global site import가 없으므로 MONP를 conf.d에 복사하는 것만으로 활성화되지 않는다.
5. web HTTP env·iOS API 주소는 tailnet HTTPS endpoint를 사용한다. Vercel production env 변경은 별도로 승인한다.

현재는 2~5단계를 실행하지 않았다. 운영 설치 승인과 실제 frontend origin이 필요하며, Tailscale 등록은 소유자 로그인이 필요하다. sudo 비밀번호·Tailscale auth key를 채팅이나 저장소에 넣지 않는다.

## 재현 명령

저장소 루트에서 실행한다. 모든 검증 DB/process는 별도 loopback 포트와 임시 경로를 사용하고 종료 시 process를 정리한다. 임시 검증 파일은 재검토용으로 `/tmp`에 남으며 운영 데이터가 아니다.

```bash
bash back/deploy/verify-minipc.sh
bash back/deploy/verify-runtime.sh --http-e2e
bash back/deploy/validate-drafts.sh
```

프론트 unit test는 `front/`에서 `npm test -- --maxWorkers=1`로 실행한다. HTTP E2E는 Playwright Chromium이 필요하다(현재 `/home/coke/.cache/ms-playwright`에 다운로드 완료). `verify-runtime.sh`는 다른 API가 8181을 사용하면 거부하므로 MONP 운영 설치 뒤에는 운영 API를 중지하지 말고 검증용 포트를 별도로 정해야 한다.
