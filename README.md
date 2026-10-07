# MONP Storage (front)

여러 작품의 캐릭터·세계관·플롯·설정·아이디어·메모를 서로 연결해 관리하는 개인용 소설 설정 도구의 웹 프론트엔드입니다.

- 배포: <https://monpdb.vercel.app/> (Vercel)
- 스택: React 19, Vite 8, React Router 7(data router, route lazy), TanStack Query 5, Zod 4, Tiptap 3, DOMPurify
- 테스트: Vitest + React Testing Library, Playwright + axe-core

## 빠른 시작

```bash
npm ci
npm run dev        # http://localhost:5173
```

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm test` | 단위·통합 테스트(Vitest, 1회 실행) |
| `npm run lint` | ESLint |
| `npm run build` | production build(`dist/`) |
| `npm run test:e2e` | build 후 Playwright E2E·접근성 검사(`vite preview`로 실행) |

E2E 결과 HTML 보고서는 자동으로 열리지 않습니다. `npx playwright show-report`로 엽니다. 처음 실행하는 환경에서는 `npx playwright install chromium`이 필요합니다.

## 데이터 모드

기본은 **fixture repository**(정적 샘플 데이터, `src/data/fixtures/appFixture.js`)이며 네트워크를 쓰지 않습니다. HTTP 모드는 MiniPC API에 저장하고 7일 동안 텍스트 조회를 IndexedDB에 보관합니다. 이미지와 쓰기 요청은 오프라인에서 보관·실행하지 않습니다.

- fixture 모드 변경 사항은 브라우저 탭(SPA 세션) 동안만 유지되고, 새로고침하면 샘플 데이터로 돌아갑니다.
- 작업을 보존하려면 **백업**(`/works/:workId/backup`)에서 JSON으로 내보내고, 다시 가져옵니다.
- HTTP 모드는 `VITE_DATA_MODE=http`과 `VITE_API_BASE_URL`을 설정합니다. API는 loopback 8181에서 개발하고, 운영 API 주소는 HTTPS와 사설 네트워크 접근 제어를 사용합니다.

## 환경 변수

`.env.example`을 `.env.local`로 복사해 사용합니다. `VITE_` 값은 공개 bundle에 그대로 포함되므로 **비밀 값을 넣지 않습니다.**

| 이름 | 용도 |
| --- | --- |
| `VITE_DATA_MODE` | `fixture`(기본) 또는 `http` |
| `VITE_API_BASE_URL` | `/api`로 끝나는 백엔드 주소. 값을 지정하지 않으면 로컬 개발 API `http://127.0.0.1:8181/api`를 씁니다. |

## iPhone 앱

Capacitor iOS 프로젝트는 `ios/`에 있습니다. Node.js 22 이상, macOS, Xcode 26 이상이 필요합니다. `front/.env.ios.example`을 `.env.ios.local`로 복사하고, Tailscale을 통해 iPhone에서 연결할 수 있는 실제 HTTPS API 주소를 지정합니다. iOS 빌드는 HTTP 모드/API 주소가 없거나 안전하지 않은 경우 실패합니다.

```bash
npm ci
npm run cap:sync:ios
npm run cap:open:ios
```

Xcode에서 `App` scheme과 실제 signing team을 선택하고 Simulator 또는 연결한 iPhone에 실행합니다. 앱의 네트워크 상태는 Capacitor Network 플러그인과 브라우저 이벤트를 함께 사용합니다. iOS project sync/build와 실기기 동작은 Mac/Xcode에서 확인해야 합니다.

요청·ETag·오프라인 처리와 JSON 백업 v1의 필드/검증 규칙은 [`ai_read/API_AND_BACKUP_CONTRACTS.md`](ai_read/API_AND_BACKUP_CONTRACTS.md)에 있습니다. Capacitor 의존성 버전은 `package.json`과 `package-lock.json`에 고정했습니다.

## 주요 화면과 URL

| URL | 화면 |
| --- | --- |
| `/` | 작품 선택 |
| `/works/manage`, `/menu/manage` | 작품 관리, 모든 작품 공통 메뉴 관리 |
| `/works/:workId` | 작품 홈 |
| `/works/:workId/{characters,world,plot,setting,idea,memo}/:menuItemId/...` | 유형별 전문 화면(목록, `new`, 상세, `edit`) |
| `/works/:workId/:sectionId/:menuItemId/...` | 메뉴 관리에서 만든 사용자 정의 섹션(일반 자료) |
| `/works/:workId/search`, `/recent`, `/relations` | 통합 검색(초성·띄어쓰기 무시), 최근 항목, 관계 탐색(목록·그래프) |
| `/works/:workId/archive`, `/backup` | 보관함(선택 복원), JSON 내보내기/가져오기 |

메뉴 이름과 URL은 분리되어 있어 이름을 바꿔도 링크가 유지됩니다. 삭제는 모두 **보관**이며 관계는 지워지지 않습니다.

## 구조

```text
src/
├── app/            router, 경로 helper, route code splitting(routeModules)
├── domain/         Zod schema(무결성 검증), 검색·관계 그래프 순수 함수
├── data/
│   ├── fixtures/     샘플 데이터
│   ├── repositories/ fixture repository(작품·메뉴·콘텐츠 공유 세션 state)
│   └── backup/       버전 있는 JSON 백업
├── features/       작품, 메뉴 관리, 캐릭터, 세계관, 플롯, 설정, 아이디어, 메모, 탐색, 보관함, 백업
├── shared/         UI 컴포넌트, rich text editor, relation picker, 내비게이션 helper
└── layouts/, pages/, styles/
```

## 배포(Vercel)

- Build command `npm run build`, output `dist`, Node 20 이상.
- `vercel.json`: SPA rewrite(`/assets` 등 정적 파일 제외), 해시 파일 장기 캐시, `index.html` no-cache, 보안 헤더, `noindex`.
- 개인 도구이므로 preview/production 모두 검색 엔진 색인을 막습니다.
- 백엔드가 붙기 전까지 인증이 없으므로, 백엔드 연결 시 네트워크 제한(예: Tailscale)을 먼저 적용합니다. 자세한 계획은 `ai_read/MONP_DB_IMPLEMENTATION_PLAN.md`를 참고합니다.

## 접근성

- 모든 입력 16px 이상(iOS 확대 방지), 터치 대상 44px 이상, safe area, focus-visible, reduced motion을 지원합니다.
- `e2e/web-milestone.spec.js`가 주요 화면 27개를 390px·1200px에서 axe-core로 WCAG 2.1 A/AA 자동 검사합니다. 자동 검사로 모든 접근성 문제를 찾을 수는 없으므로 VoiceOver 등 보조 기술로 직접 확인하는 것을 권장합니다.
