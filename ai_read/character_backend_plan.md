# Character Backend Plan

## Current Frontend Behavior

- The frontend calls the portfolio backend API directly.
- Default API base URL: `https://qbix-portfolio.shop/api`
- This can be overridden with `VITE_API_BASE_URL`.
- Mock character data and mock localStorage persistence have been removed.

## Required Endpoints

- `GET /characters?regionId=characters01&q=keyword`
- `POST /characters`
- `GET /characters/:characterId`
- `PATCH /characters/:characterId`
- `POST /character-images`

## Character Fields

- `id`, `regionId`, `name`, `hanjaName`, `englishName`, `imageUrl`
- `species`, `birthplace`, `gender`, `type`, `birthDate`, `age`, `height`, `weight`
- `occupation`, `alignment`, `affiliation`, `faction`
- `likes`, `dislikes`, `martialArts`, `personality`, `appearance`, `themeSong`, `notes`, `summary`
- `profileTheme`

## Species Rules

- `species: "인간"`: frontend displays `gender` as `성별`.
- `species: "마물"`: frontend displays `type` as `구분` instead of showing `gender`.

## Image Rules

- `POST /character-images` receives multipart field `image`.
- It should return `{ "imageUrl": "..." }`.
- `imageUrl` is saved on the character through `POST /characters` or `PATCH /characters/:id`.
- If `imageUrl` is empty, the frontend uses default images from `/coverImage`.

See `PORTFOLIO_BACKEND_HANDOFF.md` for the full contract.
