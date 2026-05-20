# MONP Character Backend Handoff

이 문서는 포트폴리오 백엔드 프로젝트에 MONP 캐릭터 API를 추가할 때 먼저 읽기 위한 인수인계 문서다.

프론트 프로젝트는 `monp_db`이며, 캐릭터 목록/상세/추가/수정 화면은 구현되어 있다. mock 데이터와 mock localStorage 저장 계층은 제거했다. 프론트는 이제 실제 API만 호출한다.

기본 API base URL은 프론트 코드에서 아래 값으로 잡혀 있다.

```txt
https://qbix-portfolio.shop/api
```

현재 프론트는 Vercel에 배포되어 있다.

```txt
Frontend URL: https://monpdb.vercel.app/
Vercel Environment Variable:
VITE_API_BASE_URL=https://qbix-portfolio.shop/api
```

배포 환경에서 다른 prefix가 필요하면 `VITE_API_BASE_URL`로 덮어쓰면 된다. 프론트는 이 base URL 뒤에 아래 경로를 붙여 호출한다.

## Frontend API Entrypoints

프론트 API 파일:

```txt
src/features/characters/api/charactersApi.js
```

프론트가 호출하는 함수:

```js
getCharacters({ regionId, q })
createCharacter(characterData)
getCharacter(characterId)
updateCharacter(characterId, updates)
uploadCharacterImage(file)
```

필요한 백엔드 엔드포인트:

```http
GET   /characters?regionId=characters01&q=keyword
POST  /characters
GET   /characters/:characterId
PATCH /characters/:characterId
POST  /character-images
```

## Character Data Shape

백엔드의 `Character` 모델은 최소한 아래 필드를 지원해야 한다.

```json
{
  "id": "cheong-un",
  "regionId": "characters01",
  "name": "청운",
  "hanjaName": "靑雲",
  "englishName": "Cheong Un",
  "imageUrl": "",
  "species": "인간",
  "birthplace": "청음관",
  "gender": "남",
  "type": "",
  "birthDate": "xxxx.xx.xx",
  "age": "22살",
  "height": "172cm(1부) → 180cm(2부)",
  "weight": "69kg",
  "occupation": "무사",
  "alignment": "혼돈 중립",
  "affiliation": "꾸러기",
  "faction": "정파",
  "likes": "따뜻한 밥, 조용한 수련, 오래된 검",
  "dislikes": "명령조의 말투, 비겁한 거래",
  "martialArts": "기본기, 불사(재창조), 청음검식",
  "personality": "냉철",
  "appearance": "잘생김",
  "themeSong": "Be The One",
  "notes": "여기 길게 적기",
  "summary": "목록 카드에 표시할 짧은 요약",
  "profileTheme": {
    "labelBackground": "#111111",
    "labelText": "#ffffff",
    "autoText": true
  }
}
```

`species`는 현재 `인간`, `마물` 두 값을 사용한다. 추후 확장 가능성이 있다.

- `species: "인간"`이면 프론트는 `gender`를 `성별`로 표시한다.
- `species: "마물"`이면 프론트는 `gender` 대신 `type`을 `구분`으로 표시한다.

`imageUrl`이 비어 있으면 프론트는 기본 커버 이미지를 사용한다.

- 인간 + 남: `/coverImage/cover_image_man.png`
- 인간 + 여: `/coverImage/cover_image_woman.png`
- 마물: `/coverImage/cover_image_monster.png`
- 마물 중 `type`에 악마/demon 계열 값이 있으면 `/coverImage/cover_image_demon.png`

`profileTheme`은 캐릭터 상세 표의 왼쪽 제목 칸 색상 설정이다.

- `labelBackground`: 제목 칸 배경색
- `labelText`: 제목 칸 글씨색
- `autoText`: true이면 프론트가 배경 밝기에 맞춰 글씨색을 자동 계산한다

## Region IDs

프론트 헤더, 라우터, 목록 필터는 아래 지역 ID를 사용한다.

```txt
characters00 = 전체
characters01 = 동부평야지대
characters02 = 남동하천지대
characters03 = 북동평야지대
characters04 = 중부 숲지대
characters05 = 북부 산악지대
characters06 = 암수굴
characters07 = 생사의 탑
characters08 = 남부 산림지대
characters09 = 귀주도
characters10 = 남서 협곡지대
characters11 = 한야섬
characters12 = 귀곡성
```

`characters00`은 전체 목록이다. 백엔드는 `regionId=characters00`이면 전체로 처리한다.

## Endpoint Behavior

### GET /characters

Query params:

- `regionId`: optional. `characters00`이면 전체 목록.
- `q`: optional. 이름, 종족, 구분, 한자 이름, 영문 이름, 출생지, 직업, 성향, 소속, 파벌, 요약 검색.

Response:

```json
[
  {
    "id": "cheong-un",
    "regionId": "characters01",
    "name": "청운",
    "species": "인간",
    "englishName": "Cheong Un",
    "affiliation": "꾸러기",
    "occupation": "무사",
    "alignment": "혼돈 중립",
    "summary": "동부평야지대 출신의 젊은 무사."
  }
]
```

목록은 전체 필드를 반환해도 되고 카드에 필요한 필드만 반환해도 된다. 프론트 목록 카드에서 사용하는 주요 필드는 `id`, `name`, `regionId`, `species`, `type`, `affiliation`, `occupation`, `alignment`, `summary`다.

### POST /characters

Request body:

- 캐릭터 생성 객체를 받는다.
- 프론트는 추가 페이지에서 `regionId`, `name`, `species`, `gender`, `type`, 상세 표 필드, `summary`, `imageUrl`, `profileTheme`을 보낸다.
- `characters00` 전체 목록에서 추가하면 `regionId`가 빈 문자열일 수 있다. 이 경우 백엔드에서 기본 지역을 강제하거나 validation error를 반환해도 된다.

Response:

- 생성된 `id`를 포함한 최신 `Character` 객체 전체를 반환한다.
- 프론트는 응답의 `regionId`와 `id`로 상세 페이지로 이동한다.

### GET /characters/:characterId

Response:

- 단일 `Character` 객체 전체를 반환한다.
- 없으면 `404`를 반환한다.

### PATCH /characters/:characterId

Request body:

- 부분 업데이트 객체를 받는다.
- 프론트는 상세 표의 모든 값, `imageUrl`, `profileTheme`을 한 번에 보낼 수 있다.
- `species`가 `인간`이면 `gender`를 사용하고 `type`은 빈 문자열일 수 있다.
- `species`가 `마물`이면 `type`을 사용하고 `gender`는 빈 문자열일 수 있다.

Response:

- 저장 후 최신 `Character` 객체 전체를 반환한다.
- 프론트는 응답값으로 React Query 캐시를 갱신한다.

### POST /character-images

Request:

- `multipart/form-data`
- file field name: `image`

Response:

```json
{
  "imageUrl": "https://qbix-portfolio.shop/uploads/characters/cheong-un.png"
}
```

프론트는 `imageUrl` 또는 `url` 필드를 허용한다. 가능하면 `imageUrl`로 반환하는 쪽을 권장한다.

## Frontend Notes

- 캐릭터 목록 경로는 `/characters00`, `/characters01` 형식이다.
- 추가 페이지 경로는 `/characters01/new` 형식이다.
- 상세 페이지 경로는 `/characters01/:characterId` 형식이다.
- 현재 지역 판별은 URL pathname 기준으로 한다. `characters01`에 있으면 목록 title과 API `regionId`가 `characters01`로 맞춰진다.
- textarea는 `react-textarea-autosize`를 사용한다.
- mock 데이터 파일은 삭제되어 있다. 백엔드 연결 전에는 목록/상세/추가/수정이 API 실패 상태로 보일 수 있다.

## Backend Implementation Order

1. 기존 포트폴리오 서버의 라우터/DB/파일 업로드 패턴을 먼저 확인한다.
2. `characters` 모델/스키마를 추가한다.
3. 위 5개 엔드포인트를 추가한다.
4. `POST /character-images`는 이미지 파일을 저장하고 public URL인 `imageUrl`을 반환한다.
5. `GET /characters`는 `regionId=characters00`을 전체 목록으로 처리한다.
6. `PATCH`와 `POST`는 허용된 캐릭터 필드와 `profileTheme`만 저장하게 한다.
7. 프론트 빌드 환경에서 `VITE_API_BASE_URL=https://qbix-portfolio.shop/api`가 맞는지 확인한다.
