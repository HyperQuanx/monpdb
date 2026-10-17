# Task 20 외부 기기·복구·외부 백업 검증

2026-10-18 준비. 공개 비밀번호·디자인 배포는 완료 상태다. 아래 미완료 항목을 확인한 뒤 Task 20을 종료한다. Task 21 Mac/Xcode/iPhone 앱, Task 22 최종 통합은 별도다.

**사용자 실기기 진행 보고(2026-10-18):** 외부 기기에서 접속은 문제없이 성공했다고 보고했다. 장치/회선 상세와 조회·생성·수정·저장 유지 결과는 아직 미수신이며 테스트 진행 중이다. 접속 성공만 확인된 것으로 기록한다.

## 1. 다른 PC/모바일 외부 회선 확인

MiniPC에서 실행한 curl/새 브라우저는 외부 실기기 결과로 기록하지 않는다. 아래는 사용자가 실제 장치에서 수행한다. 기존 작품 대신 검증 전용 작품을 사용한다.

1. 휴대폰 Wi-Fi를 끄고 LTE/5G로 `https://monpdb.vercel.app/`를 연다. 다른 PC도 MiniPC와 다른 회선(예: 휴대폰 테더링)에 연결한다. Tailscale 연결은 필요 없다.
2. 각 장치의 새 브라우저 세션에서 비밀번호로 접속하고 작품 목록을 확인한다. 비밀번호·token은 검증 기록에 넣지 않는다.
3. 모바일에서 작품 관리 → `외부검증-날짜-시각` 작품을 생성한다. 제목·요약을 기록한다. 메모 또는 캐릭터 하나를 만들고 본문에 고유한 문구를 저장한다. 이미지도 사용한다면 검증용 이미지만 올린다.
4. 새로고침 후 작품·본문·이미지를 재조회한다. 다른 PC의 독립된 새 브라우저에서 같은 항목이 보이는지 확인한다. 이것으로 해당 모바일의 캐시만 보는 상황을 구분한다.
5. PC에서 제목·본문을 바꿔 저장한 뒤 모바일을 새로고침해 동일한 값인지 확인한다. 같은 항목을 동시에 편집하지 않는다.
6. 양쪽에서 접속 종료 후 다시 비밀번호로 접속해 수정값이 유지되는지 확인한다. 브라우저를 완전히 종료한 뒤에도 재접속한다. 세션 종료 시 재로그인은 정상이다.
7. 다음 일일 백업 이후 다시 접속해 저장값을 확인한다. 백업은 API를 잠시 중지하므로 token이 폐기되어 비밀번호를 다시 입력할 수 있다.
8. 검증 결과를 남긴 뒤 전용 작품을 보관 처리한다. 기존 사용자 작품/전역 메뉴는 변경하지 않는다.

| 장치/OS/브라우저 | 회선(Wi-Fi 끔/테더링 등) | 시각(KST) | 조회 | 생성 | 수정 | 새로고침 | 독립 장치 조회 | 재로그인/다음 백업 후 | 결과/오류 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 외부 PC — 미실행 | | | | | | | | | |
| 모바일 웹 — 미실행 | | | | | | | | | |

오류는 시각·화면 동작·HTTP 상태만 기록한다. HAR 전체나 Authorization 헤더를 공유하지 않는다. iPhone Safari 웹 검증은 Task 21의 설치형 iPhone 앱 검증을 대신하지 않는다.

## 2. 운영 rollback·복구 사전 점검

코드 rollback과 데이터 복원은 서로 다른 작업이다. `/var/backups/monp-password-release/20261015T055422Z`는 이전 JAR/env/Caddy 구성을 가리키는 배포 묶음이며 SQL/uploads 백업이 아니다. 이 묶음은 비밀번호 도입 이전으로 돌아갈 수 있다. 현재 Caddyfile을 통째로 과거 사본으로 덮으면 그 이후 portfolio 변경도 사라질 수 있다.

현재 에이전트는 sudo 비밀번호 없이 root 백업 파일을 읽을 수 없다. MiniPC 터미널에서 백업 후보 목록을 확인한다. 이 명령들은 파일을 복원하거나 API를 중지하지 않는다.

```bash
cd /home/coke/Desktop/code/monp_db_re
sudo find /var/backups/monp -mindepth 1 -maxdepth 1 -type d -name '????????T??????Z' -printf '%f\n'
sudo find /var/backups/monp-password-release -mindepth 1 -maxdepth 1 -type d -printf '%f\n'
```

선택한 실제 시각으로 아래 `YYYYMMDDTHHMMSSZ`를 바꾼다. 폴더 이름의 시각은 UTC이며 KST는 +9시간이다. 가장 최신 폴더를 자동 선택하지 않는다.

```bash
sudo bash back/deploy/check-recovery-readiness.sh \
  /var/backups/monp/YYYYMMDDTHHMMSSZ \
  /var/backups/monp-password-release/20261015T055422Z
```

이 도구는 백업/deploy와 같은 lock을 잡고 checksum·archive 경로·이전 JAR 존재·hash 설정 유무·서비스 상태를 확인한다. SQL 내용을 출력하지 않는다. **파일 사전 점검 통과는 실제 SQL 복원/운영 rollback 성공을 뜻하지 않는다.**

### 운영 적용 전에 확정할 기록

| 항목 | 확인할 값 |
| --- | --- |
| 작업 종류 | JAR/config rollback / SQL+uploads 복원 / 둘 다 |
| 운영 대상 | MiniPC `coke-NucBox-G3`, MariaDB `127.0.0.1:3306/monp`, uploads `/var/lib/monp-api/uploads` |
| 데이터 백업 시점 | 정확한 UTC 폴더명·KST 변환·SHA256SUMS 결과 |
| release/env | 복구할 JAR 경로·hash·호환되는 schema·비밀번호 설정 |
| 손실 허용 범위 | 백업 시점 이후 작품/이미지 변경을 되돌려도 되는지 |
| 작업 시간 | 쓰기 중단/접속 불가 예상 시간·사용자 확인 |
| 되돌아올 지점 | 작업 직전 SQL/uploads + 현재 JAR/env/Caddy의 별도 보관 위치 |

확정 후 순서:

1. 선택한 **실제 운영 백업 사본**을 분리 MariaDB/임시 uploads에서 먼저 복원한다. 운영 3306/8181 대신 별도 socket/13317·18181을 사용한다. SQL의 DB 지정 구문·DEFINER와 archive 경로도 먼저 검토한다. 운영 작품 수·대표 본문·이미지 조회를 대조하고 복원 시간을 기록한다. 운영 데이터를 담은 `/tmp` 사본은 mode 0700으로 제한하고 훈련 종료 후 정리한다.
2. JAR rollback은 현재 schema와의 호환성을 먼저 확인한다. 비밀번호 이전 JAR가 대상이면 **공개 `/monp-api/*` route를 먼저 닫아 validate/reload하고 외부 접근이 차단됐는지 확인한 뒤** JAR/env를 전환한다. private 접근을 유지한다. 과거 Caddy 전체 사본을 그대로 적용하지 말고 현재 portfolio 설정을 보존하는 diff를 검토한다.
3. 데이터 복원은 사용자 확인 후에만 실행한다. 자동 백업 timer/진행 작업을 정리하고 작업 직전 백업을 성공시킨 뒤 같은 lock으로 경쟁 작업을 막는다. MONP 쓰기를 중지한 상태에서 동일 시점 SQL/uploads를 함께 복구한다. portfolio DB/서비스는 대상에 넣지 않는다.
4. API 시작 → loopback health → 익명 API 차단 → 공개 경로의 접근 제어 → 비밀번호 로그인/조회 → portfolio health 순으로 확인한다. 인증 이전 release면 공개 경로는 닫힌 상태로 둔다. 안전한 인증 release로 돌아온 뒤에만 다시 공개한다.
5. 실패하면 작업 직전 SQL/uploads·JAR/env/Caddy로 복귀한다. 성공/실패 모두 timer 복귀·다음 백업 시간·서비스 상태를 확인한다. 재접속해 생성/수정/refresh 저장 유지까지 확인하고 실제 소요 시간과 결과를 기록한다.

현재 제공된 실행 도구에는 운영 복원 명령이 없다. 정확한 대상/시점을 확인한 뒤 해당 작업에 맞는 절차를 확정한다.

## 3. MiniPC 밖 복제 구성 준비

대상 정보 대기: 실제 NAS/PC/클라우드 계정·전용 경로·연결 방식이 아직 확정되지 않았다. 같은 MiniPC의 다른 폴더는 외부 백업이 아니다. 상시 연결 가능한 별도 NAS/PC의 SSH 대상이 있으면 아래 도구를 사용할 수 있다. 클라우드를 선택하면 별도 암호화·자격증명 보관·복원 절차가 필요하며 이 SSH 도구를 그대로 적용하지 않는다.

- 전송: 완성된 날짜 폴더의 `monp.sql`, `uploads.tar.gz`, `SHA256SUMS`만 보낸다. 로컬 checksum 성공 후 SSH/rsync로 private staging에 복제하고 원격 checksum 성공 뒤 날짜 폴더로 게시한다.
- 원격 GNU `sha256sum`, `mv -T -n`, rsync와 SSH가 필요하다. 기존 폴더를 덮거나 원격 사본을 삭제하지 않는다. 실패한 `.incoming-*`는 완성된 백업이 아니며 확인 후 정리한다. 파일은 0600, staging은 0700이다. 실제 대상의 도구/파일 권한 호환성은 첫 연결 때 확인한다.
- 전용 SSH 계정·키·known_hosts를 복제 실행 계정(root 또는 별도 backup 계정)에 준비한다. 서버 host key fingerprint를 별도로 확인한다. 도구는 비밀번호 입력이나 host-key 자동 수락을 하지 않는다. 키/백업/SQL을 프로젝트나 Vercel에 넣지 않는다.
- SSH는 전송을 암호화하지만 이 도구의 원격 SQL/uploads 파일은 평문이다. 소유자가 관리하는 암호화 디스크·접근 제한 저장소에서 사용한다. 공개/공유 저장소라면 클라이언트 암호화를 먼저 구성한다.

아래 `monp-backup-nas`와 `/srv/monp-backup`은 **미확정 예시**다. 실제 대상 확인 전 실행하지 않는다. 기본 호출은 로컬 checksum과 목적지 출력만 하며 네트워크 연결도 하지 않는다.

```bash
sudo bash back/deploy/replicate-monp.sh \
  /var/backups/monp/YYYYMMDDTHHMMSSZ monp-backup-nas /srv/monp-backup
# 목적지 확인·SSH 계정/host key 설정을 마친 뒤에만 실제 복제
sudo bash back/deploy/replicate-monp.sh --apply \
  /var/backups/monp/YYYYMMDDTHHMMSSZ monp-backup-nas /srv/monp-backup
```

첫 사본 게시 → 원격 checksum 확인 → **원격 사본을 다시 내려받아 분리 DB+uploads 복원**까지 마친 뒤 자동화를 설치한다. 자동화는 로컬 백업 성공 뒤 같은 lock을 사용해 완성된 최신 폴더를 복제하고 실패를 알리도록 구성한다. 서버 로컬 14일 보존과 별개로 원격 보존 기간/용량·삭제 권한·실패 통지 수단을 정한다. 현재 원격 접속/전송·타이머 설치·키 생성·원격 삭제 정책은 적용하지 않았다.

## 이번 환경에서 확인한 결과

- 2026-10-18 00:21 KST: 공개 웹 200, MONP health UP, portfolio health ok, 무인증 works 401, 허용 CORS 200/다른 origin 403. 서비스 4개 active, backup Result=success/exit 0. 3306/8181 loopback bind. 디스크 여유 약 408GiB.
- 당시 최근 일일 백업 서비스 실행 2026-10-17 04:19:45 KST, 다음 2026-10-18 04:17:11 KST. root 전용 백업의 날짜/checksum 상세는 아직 확인하지 못했다.
- 복제 도구 로컬 대역 검증: 계획 모드 네트워크 없음, 잘못된 대상·로컬 손상 거부, 전송 실패·원격 checksum 손상 시 미게시, 검증 후 게시, 기존 사본 보존 통과. 실제 원격 연결 검증은 아니다.
- `bash back/deploy/verify-runtime.sh` 재실행 통과(`/tmp/monp-runtime.JH4BjjrW`): 분리 MariaDB 13317/API 18181에서 재시작 저장 유지·백업 checksum·dump 실패 후 재시작·별도 SQL/uploads 복원·HTTP 이미지 조회 확인. 검증용 프로세스 종료. 합성 검증 데이터이며 실제 운영 백업 사본/운영 rollback 훈련은 아니다.
- 실제 장치 결과·운영 rollback·운영 백업 사본 복원·off-host 전송 결과는 위 표와 이 문서에 추가한다. 완료 전 Task 20~22를 완료로 표시하지 않는다.
