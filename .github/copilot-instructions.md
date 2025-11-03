# Copilot instructions for this repo

This repository is a small full‑stack app: Django REST API (backend/) + React/Vite (frontend/). Follow these repo‑specific guardrails to be productive.

## Architecture and data flow
- Backend (Django 5 + DRF) lives in `backend/` with one app: `accounts/`.
  - Entrypoints: `backend/popi_backend/urls.py` wires:
    - `GET /health/` simple status
    - `POST /api/auth/register/` customers
    - `POST /api/auth/login/`
    - `POST /api/auth/collaborator/register/` multipart form with files
    - `GET /api/auth/admin/overview/` staff‑only summary
  - Models in `backend/accounts/models.py`:
    - `UserProfile(user OneToOne, phone_number unique, role in {customer|collaborator})`
    - `CollaboratorApplication` stores business metadata, Google Place info, docs (INE/address proof), and coverage flag
  - Serializers in `backend/accounts/serializers.py` own validation rules:
    - Email/phone uniqueness and format
    - Password confirmation
    - Collaborator proof_address must equal chosen address; coverage limited to ~30km of Guadalajara
    - Creates `User` + `UserProfile`; collaborator creates `CollaboratorApplication`
  - Views in `backend/accounts/views.py` return compact JSON used by the frontend; collaborator/register accepts `multipart/form-data`.
  - Settings: `backend/popi_backend/settings.py` uses Postgres, `django-environ`, CORS open in dev, DRF JSON parsers + MultiPart.
- Frontend (React 18 + Vite) in `frontend/`.
  - Router defined in `src/App.jsx`:
    - `/`, `/register`, `/login`, `/colaborar`, `/app`, `/admin/panel`
  - API layer: `src/api/auth.js` and `src/api/admin.js` build URLs from `VITE_API_BASE_URL` and send `credentials: 'include'`.
    - For forms with files, pass a `FormData` instance (no Content‑Type header).
    - Error messages are extracted via `extractMessage()` – prefer returning server errors as DRF‑style `{field: ["msg"]}` or `{detail: "msg"}`.
  - Google Maps: `@react-google-maps/api` used in `PlacePicker.jsx` and `Dashboard.jsx`. Requires `VITE_GOOGLE_MAPS_API_KEY`.
  - State is lightweight: uses `localStorage('popi_user')` after login; admin gate checks `is_staff|is_superuser` fields.

## Dev workflows
- Backend
  - Python 3.12+, Postgres on localhost. Configure `.env` (see README). Key settings are in `settings.py` with `django-environ`.
  - Common commands:
    - Run server: `cd backend; python -m venv .venv; .venv\\Scripts\\activate; pip install -r requirements.txt; python manage.py migrate; python manage.py runserver`
    - Create migrations: `python manage.py makemigrations accounts`
  - Media uploads are served in DEBUG by `urlpatterns += static(...)`.
- Frontend
  - Vite dev server with HTTPS and proxy:
    - `cd frontend; npm install; npm run dev`
    - Proxy in `vite.config.js` forwards `/api` to `http://192.168.56.1:8000` (adjust for your LAN). Alternatively set `VITE_API_BASE_URL` and call absolute URLs.
  - Required env vars in `frontend/.env`:
    - `VITE_API_BASE_URL=http://localhost:8000`
    - `VITE_GOOGLE_MAPS_API_KEY=...`

## Conventions and patterns
- API surface and payloads
  - Register user: `POST /api/auth/register/` JSON body fields match `RegisterSerializer` (see file for exact names).
  - Login: `POST /api/auth/login/` expects `{email, password}`; server logs in via session, response includes `user` object with `role` and flags.
  - Collaborator: send `FormData` with business fields + `ine_document`, `address_proof_document`. Field `proof_address` must exactly match `address` (case‑insensitive compare on server).
- Frontend requests
  - All fetches go through `request()` in `src/api/auth.js`, which:
    - Sets `credentials: 'include'`
    - Auto‑JSON encodes non‑FormData
    - Normalizes server errors to `Error(message)` where message is from `{detail}` or first field error
- Roles and auth
  - Logged‑in state is not a JWT; UI relies on localStorage snapshot and server session (cookies). For protected pages, verify `is_staff` on the stored user and handle 403s from API.
- Maps integration
  - Place selection yields `business_name`, `address`, `lat/lng`, `place_id`, optional `phone/website/schedule/rating/review_count/photo_url/place_types`. Frontend sends these to collaborator endpoint.

## Extension points and gotchas
- If adding new API endpoints, register in `backend/accounts/urls.py` and return JSON with top‑level keys that align with existing patterns (`message`, `user`, specific resource).
- When adding models with file fields, ensure `MEDIA_URL/ROOT` handling; in dev, URLs are available due to `static()` in `urls.py`.
- The Vite proxy assumes LAN IP `192.168.56.1`. If backend runs elsewhere, update `frontend/vite.config.js` or rely on `VITE_API_BASE_URL`.
- Frontend error surfaces expect DRF error shapes; prefer `{field: ["error"]}` or `{detail: "..."}` for consistency.

## Examples from code
- Customer register (frontend) at `src/pages/Register.jsx` posts the exact serializer fields and navigates to `/login` on 201.
- Collaborator flow at `src/pages/Collaborator.jsx` builds `FormData` using file inputs; server accepts via `MultiPartParser`.
- Admin panel fetches `GET /api/auth/admin/overview/` via `src/api/admin.js`; UI checks `is_staff || is_superuser` from `localStorage('popi_user')`.

## What agents should do
- Read source of `serializers.py` before changing forms: backend validation drives frontend shape.
- Use `src/api/*` helpers for network calls; don’t bypass `request()` unless necessary.
- Keep Spanish copy consistent with existing UI strings.
- When changing proxy/URLs, update both `.env` and `vite.config.js` if needed.

Unclear areas to verify with maintainers:
- Exact desired production host/CORS policy and session cookie settings
- Whether Postgres credentials and DB name in `settings.py` should be env‑driven for all environments
- Any pending auth hardening (CSRF handling for non‑same‑site dev)
