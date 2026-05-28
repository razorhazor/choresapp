# Chore Quest

A mobile-first chores app. Parents create chores with rewards and assign them to
children; children mark chores complete; parents approve completions to release the
reward into the child's running total.

- **Frontend:** React 18 + Vite (plain JS, plain CSS)
- **Backend:** Node.js + Express 5, SQLite via `better-sqlite3` (raw SQL, no ORM)
- **Auth:** JWT stored in an httpOnly cookie (7-day expiry), bcrypt password hashing

## Project layout

```
choresapp/
├── client/   # React + Vite frontend (runs on :5173)
└── server/   # Express + SQLite backend (runs on :3001)
```

The two packages are independent — there is no root `package.json`. Install and run
each one separately.

## Prerequisites

- Node.js 18+ (developed on Node 22)
- npm

## Install

```bash
# backend
cd server
npm install

# frontend (in a second terminal)
cd client
npm install
```

> `better-sqlite3` and `bcrypt` are native modules and compile on install. If install
> fails, make sure you have build tools available (Xcode CLT on macOS, build-essential
> on Linux).

## Run (development)

Start the backend first, then the frontend, each in its own terminal:

```bash
# terminal 1 — backend on http://localhost:3001
cd server
npm run dev      # or: npm start

# terminal 2 — frontend on http://localhost:5173
cd client
npm run dev
```

Open http://localhost:5173 in your browser.

## Run with Docker

The app also ships as a single image: a multi-stage build compiles the React client
and the Express server then serves both the API and the built client on **one port**
(`3001`), so no separate frontend server or CORS config is needed at runtime.

### Using docker compose (recommended)

```bash
docker compose up --build
```

Then open http://localhost:3001. The SQLite database is stored in a named volume
(`chores-data`) so your data survives restarts and rebuilds.

Set a strong `JWT_SECRET` in [`docker-compose.yml`](docker-compose.yml) before any real use.

### Using plain docker

```bash
# build
docker build -t choresapp .

# run (persist the DB on a named volume, set a real secret)
docker run -p 3001:3001 \
  -e JWT_SECRET=please-change-me \
  -v chores-data:/app/data \
  choresapp
```

Open http://localhost:3001.

### Docker notes

- **First run** seeds the same parent account (`parent@home.com` / `password123`) — the
  credentials are printed in the container logs. Change them before real use.
- **Reset the database:** remove the volume, e.g. `docker compose down -v`
  (compose) or `docker volume rm chores-data` (plain docker). It re-seeds on next start.
- **Change the port:** map a different host port, e.g. `-p 8080:3001`, then open
  http://localhost:8080. The client uses a relative `/api` path, so it works on any
  host/port.
- Relevant env vars: `JWT_SECRET`, `PORT`, `DB_PATH` (defaults to `/app/data/chores.db`),
  `CLIENT_DIST` (defaults to `/app/public`).

## First login (seeded parent account)

On its **first run** the backend creates a single parent account and prints the
credentials to the console:

```
Email:    parent@home.com
Password: password123
```

**Change this password after logging in is not yet a feature — instead, treat these as
development credentials.** For real use, reset the database (below) and create your own
parent, or edit the seed in `server/db.js` before the first run.

### Recreating / resetting the first parent account

The seed only runs when the `users` table is empty. To start over with a fresh database
and re-trigger the seed:

```bash
cd server
rm -f chores.db chores.db-wal chores.db-shm
npm start        # the parent account is recreated on startup
```

To change the seeded email/password, edit the `seed()` function in
[`server/db.js`](server/db.js) before that first run.

Child accounts are created from the app: log in as the parent → **Children** →
**Add a child**.

## How it works

- **Parent** logs in with email + password, creates child accounts, creates/edits/deletes
  chores (name, description, due date, reward), assigns each chore to one or more children,
  and approves or rejects submitted completions. Approving releases the reward; rejecting
  sends the chore back to `pending` so the child can redo it.
  - **Reward types:** each chore has either a **financial** reward (a `£` amount) or a
    **custom** reward (free text, e.g. "Extra screen time"). Financial rewards are summed
    into the money totals; approved custom rewards are tallied (counted) alongside them.
- **Child** logs in with username + password, sees only their own chores sorted by due
  date, marks a chore complete (which moves it to *awaiting approval* — no instant credit),
  views their running reward total, a breakdown of rewards earned per calendar month,
  and a history of submitted/approved chores.

Both the parent (on the **Children** page) and each child (on their dashboard) can see
approved rewards broken down by calendar month. Monthly totals are computed from each
approved chore's approval date.

Reward totals are **computed** from approved assignments, so they can never drift out of
sync. The currency symbol is configurable in [`client/src/config.js`](client/src/config.js)
(`CURRENCY`, default `£`).

## Configuration

### Backend (`server`)

Environment variables (all optional in dev):

| Variable        | Default                          | Purpose                              |
| --------------- | -------------------------------- | ------------------------------------ |
| `PORT`          | `3001`                           | Port the API listens on              |
| `JWT_SECRET`    | `dev-insecure-secret-change-me`  | Signing secret — **set this in prod**|
| `CLIENT_ORIGIN` | `http://localhost:5173`          | Allowed CORS origin (the frontend)   |

### Frontend (`client`)

The API base URL is set in [`client/src/config.js`](client/src/config.js):

```js
export const API_BASE = 'http://localhost:3001/api';
```

## Production notes

This app is configured for local development. Before deploying:

1. **CORS** — set `CLIENT_ORIGIN` on the server to your deployed frontend URL.
   It is currently locked to `http://localhost:5173`.
2. **API base** — update `API_BASE` in `client/src/config.js` to your deployed API URL,
   then `npm run build` in `client/` to produce static files in `client/dist/`.
3. **Cookies over HTTPS** — in [`server/auth.js`](server/auth.js), set the cookie
   `secure: true` (and `sameSite: 'none'` if the API and frontend are on different sites)
   so the browser will send the auth cookie over HTTPS.
4. **JWT secret** — set a strong `JWT_SECRET` environment variable.
```
