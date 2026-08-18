# AI_LOG.md

## Tools used

Claude was used to scaffold the initial backend (Express API, Mongoose models, calculation
engine) and frontend (React estimator flow, owner panel) from the client brief PDF, and to walk
me through deployment on Render and Netlify.

## What I used it for

- Scaffolding the Express routes, Mongoose schemas, and the calculation engine in
  `backend/src/calc/calculate.js`.
- Scaffolding the multi-step estimator UI and the owner panel's editing forms in React.
- Step-by-step guidance setting up MongoDB Atlas, deploying the backend to Render, and deploying
  the frontend to Netlify.
- Debugging two real deployment issues, described below.

## Specific instances where something was wrong or weak, and what I did about it

1. **Double-slash 404 on `/api/config`.** After deploying, the live estimator failed to load with
   a 404 on `https://.../onrender.com//api/config` — a double slash before `api/config`. This came
   from `VITE_API_URL` on Netlify being set with a trailing slash, which combined with the
   `/api/config` the code appends. I found this myself by opening the browser's dev tools Network
   tab and reading the actual failing request URL, rather than guessing — that's what pointed at
   the env var instead of the backend code. Fixed by removing the trailing slash and forcing a
   clean rebuild (a normal redeploy didn't pick up the change since Vite bakes env vars in at
   build time — I had to explicitly clear cache and redeploy).

2. **`/admin/login` returning Netlify's own 404 page.** Going directly to a route other than `/`
   broke on the live site even though it worked fine locally. This is a real gap in the initial
   scaffold — client-side routing with `react-router-dom` needs a host-level rewrite rule
   (`/* → /index.html`) so the server always serves the app shell and lets React Router take over,
   and Netlify doesn't do this by default. I added `frontend/public/_redirects` with that one rule
   myself and confirmed it fixed the routing after redeploying.

3. **`pitch: medium`'s multiplier arriving as the string `"1.12"`** in the seed data, while every
   other rate/multiplier in the same JSON is a number — flagged during scaffolding and handled with
   explicit coercion in both the seed script and the admin save route, so a naive multiply-by-string
   bug can't silently reappear later.

## What I verified myself vs. still need to

Verified: the backend deploys and responds correctly at `/api/health`; the frontend deploys and,
after the two fixes above, loads the live estimator; both issues above were diagnosed from actual
browser Network-tab output, not assumed.

Still to do before submitting: complete a full estimator run-through and owner-panel test
(login → view leads → edit a rate → confirm it reflects live) on the actual deployed URLs, and read
through `calculate.js` and the route files closely enough to explain and modify them live in the
interview round.

## Parts I wrote or substantially reworked myself

- `frontend/public/_redirects` (the SPA routing fix) — added and verified by me, not part of the
  original scaffold.
- The exact `VITE_API_URL` / `CORS_ORIGIN` values for my specific Render and Netlify deployments.