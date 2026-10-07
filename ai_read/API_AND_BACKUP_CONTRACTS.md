# MONP API 및 JSON 백업 계약

## API 계약

- Base path: `/api/v1`. runtime OpenAPI 문서는 개발 환경의 `/v3/api-docs`에서 확인한다. `prod`에서는 API docs와 Swagger UI가 꺼진다.
- `back/src/main/resources/contracts/schemas.json`은 프론트 Zod DTO에서 생성한 API 검증 계약이다. `front/scripts/generate-api-contracts.mjs`로 재생성한다. 계약 검증 오류는 RFC 9457 Problem Details로 반환한다.
- 단일 작품/메뉴/콘텐츠/관계 조회는 response `ETag`를 준다. 쓰기는 대상 ETag를 `If-Match`로 보내며 누락 시 428, 오래된 버전은 409를 반환한다.
- `/works/{id}/snapshot`은 작품, 전역 메뉴, 콘텐츠 유형별 컬렉션, 관계를 한 화면용 객체로 제공한다. 이미지 바이너리는 포함하지 않는다.
- 이미지 API는 UUID resource URL과 검증된 MIME을 반환한다. 이미지 바이트는 JSON 백업과 offline text cache에서 제외한다.

## 작품 백업 형식 v1

JSON export envelope는 다음 필드를 포함한다.

```json
{
  "format": "monp-db-backup",
  "version": 1,
  "exportedAt": "2026-01-01T00:00:00.000Z",
  "work": { "id": "work-id", "slug": "sample", "title": "작품" },
  "menu": { "menuSections": [], "menuItems": [] },
  "data": {
    "characters": [], "worlds": [], "plotScenes": [], "settings": [],
    "ideas": [], "memos": [], "contents": [], "relations": []
  },
  "images": []
}
```

- `work`는 export 대상 작품 metadata다. `data`의 모든 레코드는 `work.id`와 같은 `workId`를 가져야 한다. collection 레코드와 관계 endpoint는 프론트 DTO 계약 `schemas.json`을 따른다.
- `menu`는 전역 메뉴 snapshot이며, import는 누락된 메뉴만 병합한다.
- 업로드 바이너리/data URL은 JSON에 넣지 않는다. `images` manifest에는 `{kind,id,field,status,url}`로 이미지가 생략됐는지(`omitted-upload`) 또는 외부 URL인지(`url`) 기록한다.
- importer는 `format`, 정수 `version`, 8개 collection, 작품 소유권, ID 중복, 메뉴·관계 참조를 검사한다. 현재 지원 버전보다 높은 백업은 거부한다.
- import mode는 `merge` 또는 `replace`; 같은 ID가 충돌하면 `keep` 또는 `overwrite`를 고른다. `preview: true`는 변경 전에 검사 결과를 보여 주며 실제 import는 하나의 DB transaction으로 처리한다.
- 백업은 개인 데이터 복사본이다. 파일을 공유할 때 외부 이미지 URL과 소설 내용이 노출될 수 있으므로 안전한 위치에 보관한다.
