# Northline Roofing — Config-Driven Estimator & Owner Panel

A two-surface app for Northline Roofing & Exteriors:

- **Public estimator** (`/`) — a multi-step, mobile-friendly form a homeowner fills in to get a
  roof cost estimate. Every question, label, option, and rate is read from the database at
  runtime — nothing is hardcoded in the front-end.
- **Owner panel** (`/admin`) — a login-protected dashboard where the owner (or Marcus, the
  bookkeeper) can edit question wording, turn questions on/off, change rates and multipliers,
  and view captured leads. Changes go live immediately, no redeploy.

Stack: **React (Vite) + Node/Express + MongoDB**, plain CSS (no UI kit), JWT-based owner login.

---

## Project structure

```
wantace-estimator/
├── backend/           Express API + MongoDB models + calculation engine
│   ├── server.js
│   └── src/
│       ├── models/         Config, Lead, Admin (Mongoose schemas)
│       ├── routes/         config.js, estimate.js, admin.js
│       ├── calc/            calculate.js  ← the pricing formula lives here
│       ├── middleware/     auth.js (JWT guard for /api/admin/*)
│       └── seed/           seedData.js + seed.js (loads the client's seed data)
├── frontend/           React app (estimator + owner panel)
│   └── src/
│       ├── pages/          Estimator.jsx, AdminLogin.jsx, AdminPanel.jsx
│       └── api.js          fetch helpers
├── DECISIONS.md
├── AI_LOG.md
└── README.md (this file)
```

---

## Running it locally from a clean clone

You'll need **Node.js 18+** and a **MongoDB instance** (either installed locally, or a free
[MongoDB Atlas](https://www.mongodb.com/atlas) cluster — Atlas is the easier path if you don't
want to install Mongo).

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and fill in:

| Variable | What it is |
|---|---|
| `MONGO_URI` | Your MongoDB connection string |
| `PORT` | Defaults to `5000` |
| `JWT_SECRET` | Any long random string |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | The owner-panel login you'll use — seeded on first run |
| `CORS_ORIGIN` | Where the frontend runs — `http://localhost:5173` for local dev |

Load the client's seed data (business info, questions, rates, and the 3 historical leads) and
create the owner login:

```bash
npm run seed
```

You should see:

```
[seed] config loaded (version 3)
[seed] 3 historical leads loaded
[seed] owner login ready -> username: "owner"
[seed] done.
```

Start the API:

```bash
npm run dev
```

It should print `[server] listening on http://localhost:5000`.

**Sanity check:** open `http://localhost:5000/api/health` in a browser — you should see
`{"ok":true}`.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env
```

`frontend/.env` just needs `VITE_API_URL=http://localhost:5000` (already the default).

```bash
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`).

---

## Test credentials

After running `npm run seed` with the default `.env.example` values:

- **Owner panel URL:** `http://localhost:5173/admin/login`
- **Username:** `owner`
- **Password:** `northline2026`

(Change `ADMIN_USERNAME`/`ADMIN_PASSWORD` in `backend/.env` **before** seeding if you want
different credentials — then re-run `npm run seed`.)

---

## How to verify it's working — a walkthrough with expected output

See the **"Step-by-step test drive"** section your assistant gave you alongside this repo for a
full walkthrough with exact sample inputs and expected estimate ranges. Short version:

1. Fill out the public estimator with: roof area `2000`, material "Standing seam metal", pitch
   "Medium", layers "One layer", stories "Two storeys" → expect an estimate around
   **$33,962–$38,298**.
2. Log into `/admin`, open a lead you just created under **Leads**, confirm the name/phone/answers
   match what you typed.
3. In **Questions & Pricing**, change the "Standing seam metal" rate, save, and re-run the
   estimator — the new number should reflect immediately with no restart of the server.
4. Turn a question off (e.g. "How many layers…"), save, refresh the public estimator — that step
   should disappear from the flow.

---

## Deploying

- **Backend:** Render, Railway, or Fly.io (set the same env vars as `.env`, plus a production
  `MONGO_URI` from Atlas).
- **Frontend:** Vercel or Netlify (set `VITE_API_URL` to your deployed backend URL).
- **Database:** MongoDB Atlas free tier (M0).

After deploying, run `npm run seed` once against your production `MONGO_URI` (e.g. by
temporarily pointing your local `.env` at the Atlas URI and running `npm run seed` from your
machine) to load the client's data and create the owner login.

---

## What's deliberately not built

See `DECISIONS.md` for the full reasoning — short version: no version history for config
changes, no CSV export, no webhook, no "add a brand-new question type" builder, no automated
tests. These are the stretch goals listed in the brief; scope was kept to a working core in the
time available.
