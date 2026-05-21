# Portfolio Backend Connection Guide for MONPDB Frontend

이 문서는 분리된 MONPDB 프론트 프로젝트의 Codex가 포트폴리오 백엔드에 연결할 때 읽기 위한 최신 연동 문서다. 이전 `PORTFOLIO_BACKEND_HANDOFF.md`는 구현 전 요청사항이고, 이 문서가 현재 구현된 API 계약이다.

## 현재 연결 상태

백엔드는 포트폴리오 서버 하나에 합쳐져 있고, DB도 포트폴리오 서버의 `Portfolio` 데이터베이스를 사용한다. MONPDB 캐릭터 데이터만 `monpdb` 테이블에 저장된다.

프론트 환경 변수는 아래 값을 사용하면 된다.

```txt
VITE_API_BASE_URL=https://qbix-portfolio.shop/api
```

프론트 API 파일 기준으로는 `apiBaseUrl` 뒤에 아래 path만 붙이면 된다.

```http
GET   /characters?regionId=characters00&q=keyword
POST  /characters
GET   /characters/{characterId}
PATCH /characters/{characterId}
POST  /character-images
```

주의: 백엔드 컨트롤러의 실제 prefix는 `/api`다. 그래서 배포 URL 전체는 `https://qbix-portfolio.shop/api/characters` 형식이다.

## 캐릭터 API 계약

응답은 `success/data`로 감싸지 않는다. 프론트는 JSON 배열 또는 캐릭터 객체를 그대로 받으면 된다.

### Character shape

```json
{
  "id": "uuid-string",
  "regionId": "characters01",
  "name": "청운",
  "hanjaName": "靑雲",
  "englishName": "Cheong Un",
  "imageUrl": "",
  "species": "인간",
  "gender": "남",
  "type": "",
  "birthplace": "청음관",
  "birthDate": "xxxx.xx.xx",
  "age": "22살",
  "height": "172cm",
  "weight": "69kg",
  "occupation": "무사",
  "alignment": "혼돈 중립",
  "affiliation": "꾸러기",
  "faction": "정파",
  "likes": "따뜻한 밥",
  "dislikes": "비겁한 거래",
  "martialArts": "청음검식",
  "personality": "냉철",
  "appearance": "잘생김",
  "themeSong": "Be The One",
  "summary": "목록 카드 요약",
  "notes": "상세 메모",
  "profileTheme": {
    "labelBackground": "#111111",
    "labelText": "#ffffff",
    "autoText": true
  }
}
```

### GET /characters

Query params:

```txt
regionId optional
q optional
```

동작:

- `regionId`가 없거나 `characters00`이면 전체 목록을 반환한다.
- `regionId=characters01` 같은 실제 지역이면 해당 지역만 반환한다.
- `regionId=미정`은 빈 배열을 반환한다. 미정 캐릭터는 전체 목록에서만 보이게 하기 위한 정책이다.
- `q`는 이름, 종족, 구분, 한자명, 영문명, 출생지, 직업, 성향, 소속, 파벌, 요약에서 부분 검색한다.

응답:

```json
[
  {
    "id": "uuid-string",
    "regionId": "characters01",
    "name": "청운",
    "species": "인간",
    "type": "",
    "occupation": "무사",
    "alignment": "혼돈 중립",
    "summary": "목록 카드 요약",
    "profileTheme": {
      "labelBackground": "#111111",
      "labelText": "#ffffff",
      "autoText": true
    }
  }
]
```

현재 백엔드는 목록에서도 전체 캐릭터 필드를 반환한다. 프론트는 필요한 필드만 사용하면 된다.

### POST /characters

요청 body는 Character shape과 동일하게 보내면 된다. `id`를 보내도 백엔드는 무시하고 UUID를 생성한다.

지역 정책:

- `regionId: "characters01"`처럼 실제 지역이면 그대로 저장한다.
- `regionId: ""`, `null`, 누락, 또는 `characters00`이면 `regionId: "미정"`으로 저장한다.
- `미정` 캐릭터는 전체 목록에서만 보이고 특정 지역 목록에는 나오지 않는다.

종족 정책:

- `species: "인간"`이면 `gender`가 비어 있을 때 `남`으로 저장하고 `type`은 빈 문자열로 저장한다.
- `species: "마물"`이면 `type`이 비어 있을 때 `마물`로 저장하고 `gender`는 빈 문자열로 저장한다.
- 그 외 species 값은 현재 `인간`으로 정규화된다.

응답은 생성된 캐릭터 객체 전체다.

### GET /characters/{characterId}

단일 캐릭터 객체를 반환한다. 없으면 `404`와 아래 형태의 body를 반환한다.

```json
{
  "message": "캐릭터를 찾을 수 없습니다."
}
```

### PATCH /characters/{characterId}

부분 업데이트를 지원한다. 보내지 않은 필드는 기존 값을 유지한다. 빈 문자열은 명시적으로 저장된다.

응답은 저장 후 최신 캐릭터 객체 전체다. 없으면 `404`를 반환한다.

### POST /character-images

요청:

```txt
multipart/form-data
field name: image
allowed mime: image/jpeg, image/png, image/gif, image/webp
allowed ext: .jpg, .jpeg, .png, .gif, .webp
```

응답:

```json
{
  "imageUrl": "https://qbix-portfolio.shop/uploads/characters/{uuid}.png"
}
```

프론트는 `imageUrl`만 읽으면 된다. 저장 위치는 백엔드 서버의 `public/uploads/characters/`이고, 정적 서빙 URL은 `/uploads/characters/...`다.

## Region IDs

프론트 라우터와 API 필터는 아래 ID를 유지한다.

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
미정 = DB 저장용 미정 지역. 프론트 필터 탭으로 만들지 말고 전체 목록에서만 노출.
```

전체 탭에서 새 캐릭터를 추가할 때 프론트가 현재처럼 `regionId: ""`를 보내면 백엔드가 `미정`으로 저장한다.

## 백엔드 구현 구조

포트폴리오 백엔드는 Spring Boot 3 + Java 17 + JPA 구조다. MONPDB 캐릭터 기능은 아래 파일들로 분리되어 있다.

```txt
server_springBoot/portfolio/src/main/java/com/portfolio/portfolio/controller/MonpCharacterController.java
server_springBoot/portfolio/src/main/java/com/portfolio/portfolio/service/MonpCharacterService.java
server_springBoot/portfolio/src/main/java/com/portfolio/portfolio/repository/MonpCharacterRepository.java
server_springBoot/portfolio/src/main/java/com/portfolio/portfolio/domain/MonpCharacter.java
server_springBoot/portfolio/src/main/java/com/portfolio/portfolio/dto/MonpCharacterDTO.java
server_springBoot/portfolio/src/main/java/com/portfolio/portfolio/dto/ProfileThemeDTO.java
```

DB 테이블:

```txt
monpdb
```

주요 컬럼:

```txt
id varchar(36) primary key
region_id varchar(20) not null
name varchar(100) not null
species varchar(20) not null
gender varchar(20)
type varchar(50)
image_url varchar(500)
profile_label_background varchar(20)
profile_label_text varchar(20)
profile_auto_text bit not null
```

나머지 상세 텍스트 필드는 프론트 Character shape의 camelCase 필드가 JPA 기본 snake_case 컬럼으로 저장된다.

## 향후 다른 테이블 추가 규칙

같은 포트폴리오 서버에 MONPDB용 다른 테이블을 추가할 때도 아래 구조를 따른다.

1. `domain`: 테이블 1개당 엔티티 1개를 만들고 `@Table(name = "...")`로 실제 테이블명을 명시한다.
2. `dto`: 프론트 API shape에 맞는 DTO를 만들고, Entity 변환은 DTO 내부 static/fromEntity 패턴으로 둔다.
3. `repository`: `JpaRepository<Entity, IdType>`로 시작하고, 복잡한 검색은 필요할 때만 query method 또는 `@Query`를 추가한다.
4. `service`: 저장 정규화, validation, partial update merge, 검색 정책은 service에 둔다.
5. `controller`: `/api` prefix 아래 프론트가 호출하는 리소스 path를 추가한다. 응답은 프론트가 바로 쓰기 쉽게 래핑하지 않는다.
6. 테스트: service 단위 테스트를 먼저 추가하고, 필요하면 controller 테스트를 추가한다.

권장 네이밍 예시:

```txt
WorldSettingController / WorldSettingService / WorldSettingRepository / WorldSetting / WorldSettingDTO
PlotController / PlotService / PlotRepository / Plot / PlotDTO
MemoController / MemoService / MemoRepository / Memo / MemoDTO
```

프론트에서 새 리소스를 추가할 때는 `src/features/{resource}/api/{resource}Api.js`에서 `VITE_API_BASE_URL` 뒤 path만 맞추면 된다. 백엔드는 `https://qbix-portfolio.shop/api/{resource}` 형태로 노출된다.

## 검증 상태

백엔드에서 아래 명령이 통과했다.

```bash
cd /home/coke/Desktop/code/portfolio/server_springBoot/portfolio
./gradlew test
```

결과:

```txt
BUILD SUCCESSFUL
```

`Portfolio` DB 안에 `monpdb` 테이블 생성도 확인됐다.
