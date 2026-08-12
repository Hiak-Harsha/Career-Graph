# Career Identity System

An evidence-led career intelligence application that turns repositories and user-confirmed work into a portfolio, role-tailored resume, and recruiter-view assessment.

## What was completed

- Restored the missing frontend modules that prevented the supplied archive from compiling.
- Added a responsive navigation, project cards, domain progress cards, skill badges, and an actionable evidence review queue.
- Added a single API client with clear failure messages and local development session support.
- Prevented the mock login endpoint from being available in production.
- Added an environment template for deployment configuration.

## Run locally

1. Copy `.env.example` to `.env` and set values appropriate to your machine.
2. In `backend`, install `requirements.txt` and run `uvicorn backend.app.main:app --reload --port 8000` from the repository root.
3. In `frontend`, install packages with `npm ci`, then run `npm run dev`.
4. Open `http://localhost:3000`. In development, the app creates a local mock session solely for the sandbox flow.

## Production checklist

- Set `APP_ENV=production` and a long, unique `JWT_SECRET`.
- Use a managed database instead of the default SQLite file.
- Configure only trusted values in `CORS_ORIGINS`.
- Set `NEXT_PUBLIC_API_BASE_URL` for the deployed API.
- Configure GitHub OAuth credentials and use HTTPS.
- Run `npm run lint`, `npm run build`, and `pytest backend/tests/test_api.py -q` in CI.

The mock login endpoint returns 404 in production and must never be used as an authentication mechanism outside local development.
