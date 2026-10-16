# MONP 개인 HTTPS 연결

> **접속 방식 변경(2026-10-16):** 공개 HTTPS + 최초 비밀번호 접속을 운영 배포하고 새 브라우저에서 검증했다. 현재 웹은 `https://monpdb.vercel.app/`, API는 `https://qbix-portfolio.shop/monp-api/api`다. 사용하는 기기의 Tailscale 등록·whitelist 갱신은 필요 없다. 현재 절차는 [PASSWORD_PUBLIC_ACCESS.md](PASSWORD_PUBLIC_ACCESS.md)를 따른다. 기존 서버 Tailscale 경로는 유지하며 아래 내용은 이전 사설 연결 이력이다.

> **현재 완료 상태(2026-10-14):** MiniPC Tailscale/MagicDNS DNS 사용·HTTPS·Caddy owner whitelist·Vercel Production HTTP env/redeploy 완료. 실제 공개 웹 bundle의 `http` 모드와 확정 API 주소를 확인했고, 로컬 네트워크 접근 권한을 허용한 모바일 크기 Chromium에서 Vercel→MiniPC `/api/v1/versions`·`/api/v1/works` 모두 200, page error/API failure 0으로 조회를 검증했다. 운영 DB 작품 0개이며 샘플은 자동 이관되지 않았다. 아래 설치/인증/DNS/redeploy 대기는 진행 이력이다. 다른 PC/iPhone 등록·조회/저장·외부 차단·운영 복구 훈련은 여전히 남아 있다.

> 2026-10-14: 로컬 MONP DB·API·backup timer 설치 완료. 사용자가 다음 단계 진행을 요청했다. 아래 Tailscale 설치와 Caddy 연결 준비는 완료했으나 sudo 인증·소유자 로그인이 없어 실제 적용은 아직 하지 않았다.

> 최신 상태: 사용자 터미널에서 Tailscale **1.104.1 설치·로그인 완료**, BackendState Running. 실제 FQDN은 `coke-nucbox-g3.tail4c5836.ts.net`, IPv4 `100.66.211.102`, IPv6 `fd7a:115c:a1e0::5d01:d3d2`다. HTTPS `CertDomains`는 아직 비어 있고 다른 owner 기기는 0대다. 먼저 DNS admin에서 HTTPS를 활성화하고 사용 PC/iPhone을 등록한 뒤 Caddy script를 실행한다. API 최종 base URL은 `https://coke-nucbox-g3.tail4c5836.ts.net/api`이며 아직 HTTPS로 검증하지 않았고 Vercel production은 fixture 그대로다. 기기가 한 대인 `Peer=null` 응답도 script에 반영·검증했다.

## Tailscale 계정과 장치 연결

Tailscale은 MiniPC와 사용자의 PC/iPhone을 같은 개인 네트워크에 연결한다. 사용자가 본인의 로그인 계정을 만들거나 기존 계정에 로그인하고 모든 MONP 사용 장치를 같은 tailnet에 등록한다. Vercel 웹 페이지는 공개 HTTPS로 그대로 제공하고 브라우저가 개인망의 API에 직접 연결한다. 따라서 서버 데이터 조회/저장을 하려면 브라우저가 실행되는 기기도 Tailscale 연결이 필요하다.

MiniPC 터미널의 저장소 루트에서 실행한다.

```bash
sudo bash back/deploy/install-tailscale.sh
```

스크립트가 출력하는 로그인 URL을 본인 브라우저에서 열어 가입/로그인을 완료한다. 해당 URL·인증 키·비밀번호는 채팅에 보내지 않는다. 가입을 처음 한다면 본인 계정의 개인 tailnet을 생성한다. 완료 후 출력의 `MONP node FQDN` (`coke-nucbox-g3.<실제 tailnet>.ts.net`)만 공유하면 다음 설정을 확정할 수 있다. 2분 내에 로그인하지 못해 스크립트가 멈추면 다음 명령을 실행하고 표시된 링크에서 로그인한다.

```bash
sudo tailscale up --accept-dns=false --accept-routes=false
```

설치는 [공식 Ubuntu 24.04 stable 저장소](https://pkgs.tailscale.com/stable/#ubuntu-noble)를 사용하고 Tailscale **1.104.1**로 고정했다(2026-10-14 공식 apt metadata 확인). 기존 Tailscale이 있으면 자동 재설치/다운그레이드하지 않는다. 전체 apt upgrade를 하지 않으며 기존 OS DNS 변경·subnet routes·exit node·Tailscale SSH를 활성화하지 않는다. Tailscale 자체의 network interface/netfilter 규칙과 systemd daemon은 생성된다. 공유기 포워딩과 UFW 설정은 직접 수정하지 않는다. 설치는 아직 미실행이며 sudo 비밀번호는 서버 터미널에서 입력한다.

## HTTPS와 Caddy

**2026-10-14 Caddy 적용 완료:** 사용자가 connect script를 실행해 MONP site import를 추가하고 validation/reload를 완료했다. config backup은 `/var/backups/monp-caddy/20261014T093633Z`다. 실제 인증서가 적용된 HTTPS health UP·works GET 200, Production origin `https://monpdb.vercel.app`의 POST/content-type/if-match CORS preflight 200, 다른 origin 403, 같은 MONP host로 loopback source 접속 403을 직접 확인했다. portfolio HTTPS health ok, API/backup timer/tailscaled/Caddy/portfolio unit active다. 현재 whitelist는 MiniPC IPv4/IPv6 두 주소뿐이며 PC/iPhone 추가 등록 후 script를 재실행한다. 아래 cert 발급 오류는 완료 전 이력이다.

2026-10-14 HTTPS 활성화 완료: 실제 `CertDomains`에 `coke-nucbox-g3.tail4c5836.ts.net`이 확인됐다. 최초 Caddy 연결 시 tailscaled 재시작 직후 인증서 요청이 `no netmap available`로 실패하여 Caddy 적용 전 멈췄다. 현재 Running/Online·health 문제 없음, Caddy certificate permission은 설정됐다. 연결 스크립트에 `tailscale wait --timeout=60s`와 missing-netmap만 제한적으로 재시도하는 처리를 추가하고 검증했다. 같은 Caddy 연결 명령을 다시 실행하면 되며 HTTPS를 다시 활성화하거나 Tailscale을 재설치하지 않는다.

1. [Tailscale DNS 설정](https://login.tailscale.com/admin/dns)에서 MagicDNS·HTTPS Certificates를 활성화한다. 인증서에 사용되는 노드 도메인이 인증서 투명성 로그에 공개됨을 해당 화면에서 확인한다.
2. PC/iPhone에 Tailscale을 설치하고 같은 계정으로 로그인한다. 사용 장치 등록이 끝나야 해당 장치 주소가 Caddy whitelist에 포함된다.
3. 다음 스크립트는 등록된 실제 hostname·IP를 읽어 MONP 전용 site를 만들고 적용한다.

```bash
sudo bash back/deploy/connect-tailscale-caddy.sh
```

이 스크립트는 `TS_PERMIT_CERT_UID=caddy`를 보존적으로 추가하고 필요할 때 tailscaled를 재시작한다. **서버와 동일 UserID의 현재 등록된 untagged 장치 IP만** Caddy에 허용한다(IPv4/IPv6). 다른 소유자·tagged 장치는 자동 포함하지 않고 전역 tailnet ACL을 덮어쓰지 않는다. 사용 장치를 추가하면 script를 다시 실행해 whitelist를 갱신한다. 기존 permit certificate UID가 다르면 검토하도록 멈춘다.

적용 전에 caddy 사용자로 인증서를 얻을 수 있는지, 기존 portfolio와 MONP site를 합친 설정이 유효한지 확인한다. `/etc/caddy/Caddyfile`에는 top-level `import /etc/caddy/conf.d/monp-api.caddy`만 추가하며 portfolio upstream을 보존한다. 기존 Caddy 설정과 site 사본을 `/var/backups/monp-caddy/<timestamp>`에 저장한다. reload 후 실제 tailnet IP source의 health 200, loopback source의 같은 MONP host 403, portfolio의 local HTTP/HTTPS health를 확인한다. 적용/health 실패 시 Caddyfile/site를 직전 상태로 복원하고 reload한다. tailscaled 기본값 변경은 Caddy rollback 대상에 포함되지 않으며 사본으로 별도 복원한다.

이 단계는 아직 실적용하지 않았다. 서버 접속 기기의 현재 whitelist/태그가 기대와 같은지 출력 내용을 확인한다. 다른 장치의 실제 HTTPS CRUD/CORS와 tailnet 비허용 장치·공개 인터넷 거부 검증은 적용 후 별도로 수행한다. 공식 인증서 연동 방식은 [Tailscale Caddy 문서](https://tailscale.com/docs/integrations/web-servers/caddy/caddy-certificates)를 따른다.

## Vercel HTTP 연결

**재배포 확인 완료:** 실제 웹 entry `index-D9kCbMjO.js`, repository `appRepositories-Bz9XMyGF.js`가 HTTP 모드와 `https://coke-nucbox-g3.tail4c5836.ts.net/api`를 포함하는 것을 확인했다. MiniPC `tailscale dns status`는 enabled이며 일반 hostname health UP이다. 로컬 네트워크 접근 권한이 없는 새 Chromium context에서는 초기 versions fetch가 `Permission was denied ... local address space`로 차단됐고, 해당 origin에 `local-network-access`를 허용한 context에서는 실제 웹의 versions/works GET이 200으로 성공했다. 검증은 데이터 쓰기 없이 수행했다.

실제 Chrome에서 사이트의 로컬 네트워크 접근 요청을 허용한다. 이미 거부했다면 사이트 권한 설정에서 로컬 네트워크 접근을 허용하고 새로고침한다. 이 권한은 CORS 설정이나 HTTPS 인증서와 별개다. 현재 Caddy whitelist에는 MiniPC만 있으므로 다른 기기를 tailnet에 등록하면 연결 script를 다시 실행하고 해당 기기에서 검증해야 한다.

서버의 초기 설치는 기존 DNS를 유지하려고 `--accept-dns=false`로 연결했으므로, **MiniPC에서 `.ts.net` 일반 이름 조회는 현재 실패한다**. IP를 지정한 실제 TLS/CORS 검증은 통과했지만 MiniPC 브라우저로 이용하려면 다음 명령으로 Tailscale DNS를 사용하도록 바꾼 뒤 일반 URL의 health를 확인한다. 이 명령은 DNS resolver 설정을 변경하며 정상 동작을 확인한 후 사용한다. 다른 PC/iPhone도 Tailscale의 DNS 사용이 켜져 있어야 한다.

```bash
sudo tailscale set --accept-dns=true
curl -fsS https://coke-nucbox-g3.tail4c5836.ts.net/healthz
```

변경 후 DNS 장애가 있으면 `sudo tailscale set --accept-dns=false`로 되돌리고 DNS 상태를 진단한다. portfolio의 HTTPS health도 함께 확인한다. 현재 agent는 sudo 인증이 없어 이 변경을 실행하지 않았다.

2026-10-14 공개 배포 bundle은 `fixture` 모드임을 확인했다. 서버 endpoint가 검증되면 [Vercel 프로젝트 Environment Variables](https://vercel.com/docs/environment-variables)의 Production에 다음을 설정하고 재배포한다.

```ini
VITE_DATA_MODE=http
VITE_API_BASE_URL=https://coke-nucbox-g3.tail4c5836.ts.net/api
```

Vercel에는 DB password·Tailscale auth key를 넣지 않는다. 사설 API는 브라우저에서 호출하며 Vercel rewrite/proxy로 공개하지 않는다. `front/.env.http.example`은 동일 값을 기록할 로컬 초안이다. 실제 FQDN과 TLS/CORS 검증은 완료했으나 Vercel CLI/로컬 계정 연결이 없으므로 production env와 배포는 미변경이다. 사용자 Vercel MONP 프로젝트의 Settings → Environment Variables에서 위 두 값을 Production에 추가/수정하고 Deployments에서 Redeploy한다. 로컬에서는 해당 HTTPS 주소를 넣은 `dist-http` production build를 검증했다. 샘플 fixture 데이터는 운영 DB로 자동 옮겨지지 않는다.

문제 발생 시 Vercel의 `VITE_DATA_MODE=fixture`로 재배포해 웹만 샘플 모드로 되돌릴 수 있다. 서버 DB/backup은 보존된다.
