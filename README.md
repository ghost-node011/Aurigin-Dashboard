# Aurigin People

The HR portal for Aurigin Media — a React + Vite frontend for the
[aurigin-hr-backend](../aurigin-hr-backend) API.

## Setup

```bash
npm install
cp .env.example .env.local   # points at the local API by default
npm run dev                  # http://localhost:5173
```

The backend must be running (`npm run dev` in `aurigin-hr-backend`, on
port 4000) — the app loads everything from the API and shows a "Couldn't
reach the Aurigin People API" screen with a Retry button if it can't.

Log in with a seeded account; `npm run seed` on the backend prints a
one-time temp password for each. Accounts created that way land on a
forced change-password prompt on first login.

## Environment

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the API, including `/api`. Defaults to `http://localhost:4000/api`. |

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run lint` | Oxlint |

## How it's put together

- `src/context/AuthContext.jsx` — login, the stored JWT, and the current
  user. `src/lib/api.js` attaches the token to every request and bounces to
  `/login` on a 401.
- `src/context/HRDataContext.jsx` — loads every collection once after
  login and exposes the mutators pages call. Each mutator writes through
  the API, then refetches what the change affects, so there's no local
  copy of server state to drift.
- `src/data/*.js` — static constants and pure helpers only (leave types,
  departments, core values, the policy text shown during onboarding).
  Employee, leave, attendance, kudos and announcement *records* all come
  from the API.
- Routes are role-gated in `src/App.jsx` via `RequireAuth` / `RequireRole`
  (Analytics is admin/hr only), and the sidebar filters its own links by
  role to match.
- New hires get a guided welcome flow (`src/components/onboarding/`) that
  walks them through meeting the team and acknowledging company policies
  before the rest of the app opens up.

## Deploying to Vercel

`vercel.json` rewrites all paths to `/`, so client-side routes survive a
direct visit or a refresh instead of 404ing.

1. In the Vercel dashboard: **Add New… → Project**, import this repo
   ([Aurigin-Dashboard](https://github.com/gaurank-sharma/Aurigin-Dashboard)).
2. Set `VITE_API_URL` (Settings → Environment Variables) to the deployed
   API, e.g. `https://<backend-project>.vercel.app/api`. It's read at
   build time, so changing it needs a redeploy to take effect.
3. Make sure the backend's `CORS_ORIGIN` includes this app's deployed
   origin, or every request will fail CORS.
