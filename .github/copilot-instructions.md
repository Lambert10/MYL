% MYL — Copilot instructions

Purpose
- Help AI agents become productive quickly by summarizing the architecture, developer workflows, and project-specific conventions.

Big picture
- Two-process app: a Node/Express backend that loads and persists cards from a CSV, and a React + Vite frontend that talks to the backend API.
- Backend: single-process API server (CSV-backed store) that exposes public and admin routes and an image proxy.
- Frontend: Vite + React app using `axios` client and environment variables to target the API.

Key run/debug commands
- Start backend (dev watch): run `npm run dev` inside `backend`.
- Start frontend (dev): run `npm run dev` inside `frontend`.

Important integration points & env
- Backend reads `Base_MYL.csv` at boot (cwd is repo root when running from `backend`). See [backend/src/index.js](backend/src/index.js).
- CSV is the single source of truth for cards; updates call `saveToCsv()` to persist changes (see [backend/src/services/cardsStore.js](backend/src/services/cardsStore.js)).
- Auth uses JWT; secret from `process.env.JWT_SECRET` (defaults to `dev_secret` for local). Seed admin with: GET `/api/auth/seed-admin` (see [backend/src/routes/auth.routes.js](backend/src/routes/auth.routes.js)).
- Frontend uses these env vars: `VITE_API_URL`, `VITE_IMAGE_BASE_URL`, `VITE_IMAGE_PROXY`. See [frontend/src/lib/api.js](frontend/src/lib/api.js) and [frontend/src/lib/image.js](frontend/src/lib/image.js).

APIs & behaviours to know
- Public endpoints: `/api/health`, `/api/cards`, `/api/cards/:id`, `/api/cards/meta`, `/api/image` (image proxy).
- Admin endpoints: prefixed with `/api/admin/*` and protected by `requireAuth` + `requireAdmin` (see [backend/src/middlewares/auth.js](backend/src/middlewares/auth.js)).
- Image proxy (`/api/image?url=...`) blocks private hosts and follows safe redirect rules. Frontend often resolves images via `resolveImageUrl()` and may call the proxy.

Project-specific conventions
- CSV structure: `DEFAULT_HEADERS` are defined in `cardsStore.js`. New CSV columns should be normalized and included in `headers`; `createCardsStore` will merge headers automatically.
- ID allocation: cards use string IDs; `cardsStore` will allocate numeric IDs when missing and keep `usedIds` to avoid collisions.
- Soft-delete: deleting a card sets `is_deleted` flag to `true` (not removed from CSV). Many queries default to exclude deleted entries unless `includeDeleted` is set.
- Timestamps: `created_at` and `updated_at` are managed in `syncCsvRow` when headers are present.

Frontend patterns
- API wrapper: use `apiGet`, `apiPost`, `apiPut`, `apiDelete` from [frontend/src/lib/api.js](frontend/src/lib/api.js). The axios instance reads `localStorage.myl_access_token` and sets `Authorization: Bearer ...`.
- Image handling: use `pickCardImage()` / `resolveImageUrl()` in [frontend/src/lib/image.js](frontend/src/lib/image.js) which honors `VITE_IMAGE_PROXY`.
- Data fetching hook example: see `useCards` in [frontend/src/hooks/useCards.js](frontend/src/hooks/useCards.js) — it fetches cards with query params and handles loading/error state.

Editing notes for contributors/agents
- When adding or renaming CSV fields:
  - Ensure `DEFAULT_HEADERS` or CSV headers include the new column name (normalized).
  - Update any UI code that reads the new field (frontend components are small and located under `frontend/src/components`).
  - Persisted CSV rows are generated via `syncCsvRow` — if you add derived fields, ensure they're written here.
- When changing auth behavior: check `requireAuth`/`requireAdmin` and `auth.routes.js` (JWT generation + seed admin).

Files to inspect first
- Backend entry: [backend/src/index.js](backend/src/index.js)
- CSV store + logic: [backend/src/services/cardsStore.js](backend/src/services/cardsStore.js)
- Auth & user store: [backend/src/routes/auth.routes.js](backend/src/routes/auth.routes.js) and [backend/src/services/userStore.js](backend/src/services/userStore.js)
- Frontend API + image helpers: [frontend/src/lib/api.js](frontend/src/lib/api.js) and [frontend/src/lib/image.js](frontend/src/lib/image.js)
- Card UI & hooks: [frontend/src/hooks/useCards.js](frontend/src/hooks/useCards.js) and [frontend/src/components/CardItem.jsx](frontend/src/components/CardItem.jsx)

What I didn't assume
- Do not change CSV format blindly; CSV is the persistent store and may be edited by non-code workflows.
- Production deployment details (build pipelines, CI/CD, Netlify config in `netlify.toml`) are not exhaustively documented here — inspect `netlify.toml` before changing deploy-related code.

If anything here is unclear or you want the instructions expanded with examples (e.g., a sample CSV edit + required code changes), tell me which section to expand.
