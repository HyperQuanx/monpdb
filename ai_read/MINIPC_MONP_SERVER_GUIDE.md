# MONP MiniPC 서버 준비 안내

이 문서는 MONP 배포를 위한 **검토 가능한 초안**이다. `SERVER_INFO.md`는 포트폴리오 서버 구성을 설명하지만, 호스트 상태·DNS·SSH 계정·현재 Caddy 설정을 검증한 값은 아니다. 예시를 운영 서버에 복사하기 전에 MiniPC에서 현재 설정을 확인한다. 이 프로젝트는 포트폴리오 서비스 파일이나 DB를 수정하지 않는다.

## 배포 구성

- Spring Boot JAR는 `/opt/monp-api/releases/<release-id>/monp-api.jar`에 둔다. `/opt/monp-api/current`는 활성 release를 가리키는 symlink로 관리한다.
- 전용 `monp` OS 사용자와 `/etc/monp/monp-api.env` 환경 파일을 쓴다. 업로드 디렉터리는 `/var/lib/monp-api/uploads`다.
- MariaDB에 전용 `monp` DB와 최소 권한 계정을 만든다. 기존 portfolio DB·계정·환경 파일을 공유하지 않는다.
- API는 loopback `127.0.0.1:8181`에만 bind한다. systemd 예시는 [monp-api.service.example](../../back/deploy/monp-api.service.example)이다.
- Caddy는 별도의 API host로 전달하도록 제안한다. [monp-api.caddy.example](../../back/deploy/monp-api.caddy.example)은 Tailscale 주소 대역만 허용하는 예시이며, `example.invalid`를 실제 API DNS 이름으로 바꾸고 소유자 장치만 허용하는 Tailscale ACL을 먼저 설정한다.
- CORS origin 목록은 실제 웹 주소와 `capacitor://localhost`, `https://localhost` 중 사용하는 앱 origin으로 제한한다. CORS는 인증이 아니다. 현재 API에는 사용자 로그인 기능이 없으므로 공개 인터넷에서 쓰기 API에 접근할 수 있도록 설정하지 않는다.

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
MONP_CORS_ORIGINS=<explicit-frontend-origins>
MONP_API_DOCS_ENABLED=false
MONP_SWAGGER_UI_ENABLED=false
```

백업 전용 DB 자격 증명은 별도 `/etc/monp/backup.cnf`에 둔다(`0600`, root 소유, `[client]` 아래 `user`, `password`, `host=127.0.0.1`, `database=monp`). 서비스 DB 계정에는 필요한 DB 범위만 권한을 준다.

## 설치 및 점검 순서

1. 운영체제, Java 17, MariaDB 10.11, Caddy, systemd, 기존 포트폴리오 unit/포트와 Caddyfile을 확인한다. `SERVER_INFO.md` 내용과 다르면 현재 서버 값을 기준으로 계획을 수정한다.
2. 소유자 전용 Tailscale 접근과 ACL, DNS 이름, HTTPS 인증서를 정하고 로컬 네트워크 및 외부에서 허용/차단을 확인한다. 공유기 포트포워딩이나 UFW를 바꾸지 않는다.
3. 전용 DB·계정·환경 파일·업로드/백업 폴더를 만들고 권한을 확인한다. 기존 DB를 대상으로 migration을 실행하지 않는다.
4. 백엔드 테스트를 통과한 JAR를 새 release 경로에 복사하고 checksum을 확인한다. systemd 예시를 `/etc/systemd/system/monp-api.service`로 설치한 뒤 `systemctl daemon-reload`, `enable --now monp-api`로 시작한다.
5. 서버 안에서 `curl -fsS http://127.0.0.1:8181/healthz`를 확인한다. health는 MariaDB 연결을 포함한다. `journalctl -u monp-api -n 100 --no-pager`로 로그를 확인한다.
6. Caddy 설정을 적용하기 전에 `caddy validate --config /etc/caddy/Caddyfile`을 실행한다. 다른 사이트의 설정 변경이 없는지 diff를 살핀 뒤 reload하고, 허용된 tailnet 장치에서만 `https://<api-host>/healthz`가 응답하는지 확인한다.
7. 프론트 HTTP 빌드는 `VITE_DATA_MODE=http`과 확인된 API base URL을 사용한다. 브라우저/앱에서 preflight와 실제 CORS origin, 데이터 CRUD를 확인한다. Vercel의 공유 production 환경은 이 저장소에서 변경하지 않는다.

## 백업과 복구

[backup-monp.sh.example](../../back/deploy/backup-monp.sh.example)을 root 소유 executable로 설치하고 systemd timer 등으로 하루 한 번 실행한다. 출력은 DB dump와 업로드 파일을 같은 시점 폴더에 보관하고 14일 뒤 정리한다. 별도 장치나 암호화된 원격 저장소에 사본을 복제해야 MiniPC 디스크 고장에도 복구할 수 있다.

복구 훈련은 별도의 빈 restore DB와 임시 업로드 경로에서 진행한다. SQL 복원 후 같은 시점의 `uploads.tar.gz`를 풀고, 임시 포트에서 API를 띄워 health·작품 수·이미지 조회를 확인한다. 검증된 백업의 날짜와 checksum을 기록한다. 운영 DB에 덮어쓰는 복구는 복구 대상과 백업 시점을 정하고 확인한 뒤 실행한다.

## 롤백·로그·네트워크

- 새 release가 health 또는 smoke test에 실패하면 Caddy를 바꾸지 않고 서비스를 중지한다. `current` symlink를 직전 release로 되돌린 뒤 재시작·health 확인을 한다.
- 이전 JAR 롤백은 DB migration을 되돌리지 않는다. 하위 호환 migration이 확인되지 않으면 백업 복원 절차가 필요하다.
- 로그는 journald에서 확인한다. 비밀번호·백업 파일·사용자 작성 본문을 로그에 남기지 않는다.
- DB `3306`과 Spring `8181`은 외부 interface에 bind하거나 공유기에서 포워딩하지 않는다. 외부 접속은 HTTPS Caddy와 Tailscale 접근 제어만 거친다.
- MiniPC의 다른 서비스, Caddy 전역 설정, firewall, 공유기, DNS, 운영 데이터 변경은 별도 적용 전에 현재 설정을 백업하고 구체적인 변경 내역을 검토한다.

## 필요한 실제 서버 확인

배포 실행 전 SSH 접속 alias/계정/포트와, Tailscale을 사용할 계정·장치 상태가 필요하다. `SERVER_INFO.md`의 이전 경로와 포트는 참고값으로만 취급한다. 이 문서와 설정 예시는 서버에 적용하지 않았다.
