# MONP 페이지 스타일 미세 조정 인수인계

2026-10-18 기준. 다음 에이전트가 여러 화면의 여백·글자·입력폼·카드·버튼 등을 조금씩 조정할 때 사용하는 파일 지도다. 구체적인 다음 디자인 변경값은 아직 정해지지 않았다. 사용자가 지정하는 화면과 요소부터 수정한다.

## 다음 에이전트에게 전달할 요청문

> 이 문서와 `ai_read/CODEX_HANDOFF.md`의 최신 내용을 읽고 MONP의 페이지 스타일을 조금씩 조정해 줘. 현재 흰색·차콜·회색 테마를 기준으로, 내가 지정하는 화면의 여백·글자·크기·배치를 수정하면 돼. 편집 입력폼과 본문에 파란색 포커스 테두리/그림자를 다시 넣지 마. 시작 전 `git status`와 diff를 확인해서 기존 미커밋 변경을 보존하고 commit/push는 하지 마. 페이지 전용 CSS와 공통 스타일의 영향 범위를 구분해서 수정하고 모바일·데스크톱에서 확인해 줘. 운영 데이터에 테스트 항목을 만들지 말고 fixture 모드에서 검증해 줘. 운영 반영 시에는 아래 기존 Vercel 배포 방법을 사용해 줘.

## 현재 상태와 유지할 사용자 요구

- 작업 루트 `/home/coke/Desktop/code/monp_db_re`, Git 저장소는 `front/`다. 아래 파일 경로는 별도 표시가 없으면 **front 기준**이다. `back/`은 이 Git 저장소 밖에 있다.
- 운영 웹 `https://monpdb.vercel.app/`. 공개 비밀번호 접속·흰색/차콜 디자인 배포 완료. 공개 API는 `https://qbix-portfolio.shop/monp-api/api`다.
- 최신 배포 `FqEoxYoWrBHjkeXeTfzpaAY7DwFX`: 입력폼 포커스 표시 제거까지 반영됐다. 아래 소스는 이미 배포됐어도 미커밋 상태일 수 있다.
- 최근 수정: `src/styles/global.css`, 7종 `*EditorPage.module.css`, `src/shared/editor/RichTextEditor.module.css`. input/textarea/select의 공통 파란 그림자, 각 편집폼의 포커스 border 변경, 본문 frame의 포커스 그림자를 제거했다. **이것을 회귀로 보고 복구하지 않는다.** 버튼·링크의 키보드 포커스는 기존대로 남아 있다.
- 사용자 표지·작품 강조색·캐릭터 테마색 등 저장된 데이터는 보존한다. 페이지 CSS 수정 때문에 데이터의 색상값을 일괄 변경하지 않는다.
- 작품 추가/수정의 slug 입력란은 사용자가 요청해서 제거했다. 내부 UUID 자동 생성 및 기존 slug 보존을 유지한다.
- Task 20 외부 기기·운영 복구·외부 백업, Task 21 Mac/iPhone, Task 22 최종 통합은 별도 진행 중이다. 스타일 조정으로 이를 완료 처리하지 않는다.

## 어느 범위의 스타일인지 먼저 구분

| 바꾸려는 요소 | 우선 확인할 파일 | 영향 범위/주의점 |
| --- | --- | --- |
| 전체 색상·기본 글꼴·여백 토큰·곡률·그림자 | `src/styles/tokens.css` | 전역. 페이지 한 곳의 간격 때문에 전체 토큰을 바꾸지 않는다. `--space-12`는 현재 12px이며 이름의 숫자만 보고 배율을 추정하지 않는다. |
| body·전역 focus·선택 색·reduced motion | `src/styles/global.css` | 모든 화면에 적용. 입력폼의 파란 focus 복구 금지. |
| 브라우저 기본 스타일 초기화 | `src/styles/reset.css` | 전체 문서에 영향. 일반적인 페이지 미세 조정은 페이지 CSS에서 한다. |
| 공통 버튼·Input·Card·빈 화면·Skeleton | `src/shared/ui/primitives.module.css` | 실제로 해당 공통 컴포넌트를 사용하는 화면에 적용. 네이티브 input/button을 별도 CSS로 꾸민 화면도 많다. |
| Dialog·Sheet의 배경막/패널 | `src/shared/ui/overlay.module.css` | `Dialog.jsx`, `Sheet.jsx`, `ModalLayer.jsx`와 연결. focus trap/닫기 동작은 유지. |
| 앱 전체 폭·사이드바와 본문 열 배치 | `src/layouts/RootLayout.module.css` | 1024px부터 sidebar 열, 1200px부터 shell 양옆 경계. |
| 본문 최대 폭·상하좌우 여백·하단 탐색 공간 | `src/components/layout/Main.module.css` | safe area, `--active-footer-height` 포함. 페이지 자체 max-width도 함께 확인. |
| 상단 헤더 | `src/components/layout/Header.module.css` | 로고·제목·상단 버튼. 구조는 같은 이름 `.jsx`. |
| 데스크톱 sidebar·모바일 하단 메뉴·탐색 | `src/components/layout/WorkNavigation.module.css` | 구조 `WorkNavigation.jsx`, 모바일 menu sheet는 공용 Sheet CSS도 확인. |
| 본문 작성 툴바·본문 입력 영역 | `src/shared/editor/RichTextEditor.module.css` | 모든 전문 editor가 공유. `.toolbar`, `.toolbarButton`, `.editorFrame`, `.proseMirror`. |
| 저장된 리치 텍스트 표시 | `src/shared/editor/RichTextRenderer.module.css` | 상세 화면의 문단·제목·목록 간격. editor CSS와 별개다. |
| 관계 선택/추가 입력 | `src/shared/relations/RelationPicker.module.css` | 여러 editor에서 공유. 주변 페이지의 `.field` 등도 확인. |
| 저장 안 된 변경 안내 | `src/shared/hooks/useUnsavedChanges.module.css` | 입력 중 이동 경고의 스타일. 저장/이동 보호 로직은 유지. |

`src/main.jsx`가 reset → tokens → global 순서로 가져온다. 페이지 CSS는 CSS Modules이며 `styles.xxx`로 연결된다. 적용 결과는 selector 우선순위와 모듈 로딩도 고려해 브라우저의 computed style로 확인한다. CSS Modules의 빌드 후 해시 class나 `dist/` 파일을 직접 수정하지 않는다.

페이지 폭이 기대만큼 변하지 않으면 **tokens의 폭 변수 → RootLayout → Main → 페이지 `.page`/`.form`의 max-width**를 함께 확인한다. `RootLayout.jsx`는 `--work-accent`를 inline으로 전달한다. 색상 수정이 CSS에서 반영되지 않으면 해당 컴포넌트의 `style={{...}}`와 저장된 theme/accent 값도 확인한다.

## 로그인·작품·메뉴 화면

아래 `.module.css` 옆의 같은 이름 `.jsx`가 화면 구조다. JSX 변경은 요소 순서·묶음·문구를 바꿀 때 필요하다.

| 화면/주소 | 전용 스타일 | 자주 조정할 부분 |
| --- | --- | --- |
| 비밀번호 화면: HTTP 모드에서 로그인 전 모든 주소 | `src/components/PasswordGate.module.css` | `.welcome` 2열/모바일 1열, `.statement`, `.description`, `.card`, `.card input/button`. 반응형 분기 760px. |
| 작품 선택 `/` | `src/features/works/pages/WorkSelectionPage.module.css` | 제목·설명·작품 카드·grid·표지·빈 화면. 이 화면은 RootLayout 밖에 있다. |
| 작품 관리 `/works/manage` | `src/features/works/pages/WorkManagePage.module.css` | 생성/수정 form·목록·보관 버튼. slug 입력 재추가 금지. |
| 작품 홈 `/works/:workId` | `src/features/works/pages/WorkHomePage.module.css` | 작품 제목·개요·메뉴 카드·grid. |
| 공통 메뉴 관리 `/menu/manage` | `src/features/menu-management/pages/MenuManagePage.module.css` | section/item 행·이름 입력·정렬/보관 버튼·모바일 줄바꿈. 메뉴는 모든 작품에 공통이다. |

## 콘텐츠 종류별 목록·상세·편집 화면

주소는 `/works/:workId` 뒤에 붙는 경로다. 목록 주소 뒤에 `/new`는 생성, `/:id`는 상세, `/:id/edit`는 편집이다. 생성/편집은 같은 EditorPage를 사용한다. 정확한 파라미터명과 연결은 `src/app/router.jsx`, lazy import는 `src/app/routeModules.js`를 기준으로 한다.

| 종류/경로 | 디렉터리 | 목록 / 상세 / 생성·편집 CSS |
| --- | --- | --- |
| 캐릭터 `/characters/:menuItemId` | `src/features/characters/pages/` | `CharacterListPage.module.css` / `CharacterDetailPage.module.css` / `CharacterEditorPage.module.css` |
| 세계관 `/world/:menuItemId` | `src/features/worlds/pages/` | `WorldListPage.module.css` / `WorldDetailPage.module.css` / `WorldEditorPage.module.css` |
| 플롯 `/plot/:menuItemId` | `src/features/plots/pages/` | `PlotListPage.module.css` / `PlotDetailPage.module.css` / `PlotEditorPage.module.css` |
| 설정 자료 `/setting/:menuItemId` | `src/features/settings/pages/` | `SettingListPage.module.css` / `SettingDetailPage.module.css` / `SettingEditorPage.module.css` |
| 아이디어 `/idea/:menuItemId` | `src/features/ideas/pages/` | `IdeaListPage.module.css` / `IdeaDetailPage.module.css` / `IdeaEditorPage.module.css` |
| 메모 `/memo/:menuItemId` | `src/features/memos/pages/` | `MemoListPage.module.css` / `MemoDetailPage.module.css` / `MemoEditorPage.module.css` |
| 사용자 정의/일반 콘텐츠 `/:sectionId/:menuItemId` | `src/features/content/pages/` | `ContentListPage.module.css` / `ContentDetailPage.module.css` / `ContentEditorPage.module.css` |

전문 화면들은 비슷하게 보여도 CSS 파일이 별개다. 공통 UI 컴포넌트가 아닌 로컬 `.control`, `.textarea`, `.field` 스타일을 복사해 사용하는 경우가 있어 한 화면 수정이 다른 화면에 자동 반영되지는 않는다. 전체 editor를 통일할 때는 위 7개를 비교한다.

- 캐릭터 editor: `.field input/select/textarea`, `.themeFields`가 기본 필드다. 이름·요약·외형 입력 간격은 여기서 수정한다. 본문은 공용 RichTextEditor, 관계는 RelationPicker도 확인한다.
- 다른 editor: `.form`, `.header`, `.field`, `.control`, `.textarea`, `.fieldGrid`부터 확인한다. checkbox/checklist·저장 영역은 각 파일의 별도 selector가 있다.
- 캐릭터 이미지: `src/features/characters/components/CharacterPortrait.module.css`와 `.jsx`. 상세 페이지 이미지 배치는 `CharacterDetailPage.module.css`도 함께 확인한다.
- 메모 색상: `src/features/memos/components/memoColors.module.css`. 체크리스트: `MemoChecklist.module.css`와 `.jsx`. 사용자가 고른 메모 색은 데이터다.
- 목록의 검색/filter focus 스타일과 버튼/링크 focus는 일부 남아 있다. 최근 요청은 편집 입력폼의 파란 포커스 제거였으며, 전역 focus token 자체를 삭제한 상태는 아니다.

## 검색·보관함·백업·오류 화면

| 화면 | JSX | 사용하는 CSS |
| --- | --- | --- |
| `/works/:workId/search` | `src/features/exploration/pages/SearchPage.jsx` | `src/features/exploration/pages/ExplorationPages.module.css` |
| `/works/:workId/recent` | `src/features/exploration/pages/RecentPage.jsx` | 위와 같음 |
| `/works/:workId/relations` | `src/features/exploration/pages/RelationsPage.jsx` | 위와 같음. 관계 graph SVG 속성도 JSX에서 확인. |
| `/works/:workId/archive` | `src/features/archive/pages/ArchivePage.jsx` | 위와 같음 |
| `/works/:workId/backup` | `src/features/backup/pages/BackupPage.jsx` | 위와 같음 |
| 작품/메뉴/일반 오류 | `src/pages/{WorkRouteErrorPage,MenuRouteErrorPage,ErrorPage}.jsx` | `src/pages/WorkRouteErrorPage.module.css` 공유 |
| 라우트 로딩 | `src/pages/RouteLoadingPage.jsx` | `src/pages/RouteLoadingPage.module.css` |

특히 ExplorationPages CSS는 **검색·최근·관계·보관함·백업 5개 화면이 공유**한다. 이 파일의 공용 selector를 바꾸면 다른 도구 화면도 같이 확인한다.

## 로컬 확인과 검증

운영 데이터 없이 fixture로 확인한다. 프로젝트 루트에서:

```bash
cd front
VITE_DATA_MODE=fixture npm run dev -- --host 127.0.0.1
```

비밀번호 화면은 HTTP 모드 전용이므로 fixture 화면에서는 나타나지 않는다. 로그인 화면만 수정할 때는 HTTP 모드의 새 브라우저에서 비로그인 상태로 확인한다. 로그인 확인이 필요하면 사용자가 직접 비밀번호를 입력하고 비밀번호/token은 로그·문서에 기록하지 않는다.

fixture 예시:

- `/works/work-monp/characters/characters01/character-yeonhwa/edit`
- `/works/work-monp/world/world01/world-east-plains/edit`
- `/works/work-monp/plot/plot01/plot-chapter-one-opening/edit`
- `/works/work-monp/setting/setting01/setting-cheongun-sword/edit`
- `/works/work-monp/idea/idea02/idea-dialogue-mist/edit`
- `/works/work-monp/memo/memo00/memo-next-session/edit`

다른 화면 예시는 `e2e/web-milestone.spec.js` 상단 `pages` 배열에 있다. 모든 생성/편집 화면에서 기본 상태와 focus, 긴 제목/본문, 오류 문구, 저장 버튼 위치를 본다. 320/390px 모바일 및 1200/1440px desktop에서 가로 넘침과 줄바꿈을 확인한다. 화면 전체 캡처와 실제 computed style을 함께 확인하면 좋다.

```bash
npm run lint
VITE_DATA_MODE=fixture npm run build
# Playwright는 dist를 preview하므로 위 fixture build 후 실행
npx playwright test e2e/web-milestone.spec.js --grep '캐릭터 편집' --workers=1
# 화면 동작에 영향이 있으면 해당 기존 여정도 실행
npx playwright test e2e/current-app.spec.js --grep 'character create relation edit' --workers=1
```

grep은 수정한 화면에 맞춰 바꾼다. CSS 미세 수정에 불필요한 새 unit test를 만들 필요는 없다. 전체 unit suite가 필요하면 `npm test -- --maxWorkers=1`로 단독 실행한다. MiniPC에서 무거운 frontend/backend 검증을 병행하면 지연/timeout 이력이 있다.

최근 포커스 제거는 lint/build 및 모바일 Chromium의 input/select/textarea·본문 focus computed style 확인을 통과했다. `/tmp/monp-verify-form-focus.mjs`는 당시 참고용이며 영구 테스트 도구는 아니다. 실제 공개 CSS도 검증된 빌드와 일치함을 확인했다.

## 운영 반영과 종료 기록

스타일 수정은 frontend만으로 가능하며 서버 재설치·DB/백업 복원·Caddy 변경은 필요하지 않다. 운영 반영이 작업 범위일 때 검증 후 **프로젝트 루트**에서:

```bash
bash back/deploy/publish-password-web.sh
```

기존 `hyperquanxs-projects/monpdb` 프로젝트에 로컬 소스를 배포하는 스크립트다. Git push 기반 Redeploy는 미커밋 소스를 반영하지 못한다. fixture 검증용 env를 운영에 올리지 말고 위 스크립트의 공개 HTTP API 설정을 유지한다. 배포 뒤 canonical 웹의 변경된 CSS/화면과 모바일 overflow를 확인한다.

종료 시 수정 파일·변경한 화면·확인한 화면 폭·검증 결과·배포 여부/ID를 `ai_read/CODEX_HANDOFF.md` 최신 요약에 남긴다. 기존 미커밋 변경 보존, commit/push 금지를 유지한다.

환경 참고: 프로젝트 `.codex/config.toml`은 `approval_policy = "never"`, `sandbox_mode = "workspace-write"`다. 현재 세션에서 `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`가 반복됐으며 프로젝트 CSS 오류와는 별개다. 이를 해결하려고 전역 Codex/OS 보안 설정을 임의로 바꾸지 않는다.
