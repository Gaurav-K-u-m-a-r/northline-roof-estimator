# DECISIONS.md

## The calculation formula, in plain language

For the base quantity (roof area) and whichever material, pitch, tear-off layer, and story-count
options the homeowner picked:

1. **Material cost** = roof area × material's rate-per-sqft × (1 + waste factor). The 10% waste
   factor accounts for material lost to cuts and offcuts — applied to material cost only, not
   tear-off.
2. **Tear-off cost** = roof area × the selected layer option's tear-off rate (0 for a new build).
3. **Subtotal** = (material cost + tear-off cost) × pitch multiplier × story multiplier. Pitch and
   story multipliers stack multiplicatively — a steep, three-storey roof costs more on both counts,
   not just the larger of the two.
4. **Total** = subtotal + the flat $350 permit fee.
5. The final range is total ± half the configured spread percentage (12% → total × 0.94 to
   total × 1.06).

This lives in one place, `backend/src/calc/calculate.js`, and is generic over question *shape*
rather than hardcoded to the five specific keys in the seed data — a select option can carry
`rate_per_sqft`, `multiplier`, and/or `tear_off_per_sqft`, and whichever of those it has gets
folded into the formula in that role. That means the owner can rename labels, change every rate,
and toggle questions on/off without a code change. It does **not** mean an owner can invent a
wholly new *kind* of pricing effect (e.g. "add $50 if skylight = yes") without a developer — a
real limit I think is the right one for 24 hours, since the brief's hard constraint is about the
front-end never hardcoding content, not the calculation engine being infinitely extensible.

## Assumptions made where the brief was silent

- **Which question is the "base quantity."** I treat the first active, required, `type: "number"`
  question as what the per-sqft rates multiply against. Unambiguous today since there's exactly
  one such question; a second numeric question added later wouldn't automatically drive the
  formula — a documented limitation, not a silent bug.
- **Contact fields.** The brief says "name, phone, and what they answered." I added an optional
  email field since the client's own historical lead data already includes emails.
- **Login mechanism.** "Basic auth is fine" I read as "don't over-engineer security," not literally
  HTTP Basic Auth — a raw browser auth prompt is worse for a non-technical user than a normal login
  page. Built as username/password → JWT, one shared owner account, no roles or password reset.
- **What "no redeploy" requires.** Config lives in the database, fetched fresh on every estimator
  load; owner edits write to that same document in place, live immediately. I didn't build version
  history or a staging/publish step — a save is live the moment it happens, with no undo. Noted as
  a gap below.
- **What happens if config changes mid-flow.** If the owner only changes numbers or labels while a
  homeowner is mid-flow, the visitor's answers stay valid and the final calculation just uses
  current numbers — the normal case, works silently and correctly. If the owner removes a question
  or option the visitor already selected, the server rejects the submission with a clear "please
  restart" message (`STALE_CONFIG`, HTTP 409) instead of silently mis-pricing. I chose "fail loudly"
  over "guess a fallback," because a wrong number attached to someone's real contact info is worse
  than asking them to redo a 90-second form.
- **The `pitch: medium` multiplier arriving as the string `"1.12"`** while every other rate in the
  seed JSON is a number — exactly the "real export, treat it as production data" mess the brief
  describes. Coerced to a number at seed time, and defensively again in the admin save route, so a
  future owner edit can't silently reintroduce a string-typed rate that would concatenate instead
  of multiply.
- **The two historical leads referencing a different config version** (`chimney_count`,
  `gutter_replace`, `slate_natural` — none of which exist in the current config). Seeded as-is,
  since answers are stored schemaless specifically so old leads stay readable after the config
  moves on. I don't try to run them through the current calculator or reconcile them with their
  stored estimate figures — those are historical numbers, not something the app recomputes.
- **Hosting.** Render (backend), Netlify (frontend), MongoDB Atlas (database) — all free-tier,
  no credit card, and all explicitly allowed by the brief. The one real trade-off: Render's free
  tier spins down after 15 minutes idle and takes 30–60s to wake on the next request. I'm flagging
  that here rather than letting a reviewer think the app is broken if their first load is slow.

## What I deliberately did not build, and why

- **Config version history** (stretch goal). `config_version` increments on every save and is
  stored on every lead, so the data a future history view needs already exists — I didn't build
  the UI to browse it, prioritizing a solid core flow instead.
- **CSV export, webhooks, "add a new question" builder, automated tests** — same reasoning; the
  brief is explicit that a half-finished stretch goal scores worse than a finished core.
- **Multi-user roles for the owner panel.** Dale mentioned Marcus will use it too, but never asked
  for different permission levels between them, so one shared owner login instead of a
  user-management system nobody asked for.
- **Rate limiting on the login route.** Worth adding before this goes to a real client long-term;
  skipped for the 24-hour scope, flagged here rather than left silent.

## Things in the brief or seed data I found questionable

- The `pitch: medium` string-vs-number quirk, handled above.
- The seed leads' `estimate_low`/`estimate_high` don't reverse-engineer cleanly against the given
  rates (Bill Tanner's lead uses `slate_natural`, which has no rate anywhere in the current config).
  The brief anticipates this directly ("do not assume your formula must reproduce them exactly"),
  so I defined my own formula rather than reverse-engineering old numbers from incomplete inputs.
- "Nothing fancy, I just need name, phone, and what they answered" is genuinely the entire spec for
  the leads view, so I kept it to a single sortable table — no filtering or search.

## Questions I'd ask Dale before starting the real build

1. When you add a gutters question later, is it always a yes/no plus a flat rate, or could it need
   its own kind of math (e.g. linear feet instead of a flat add-on)? That changes how flexible the
   question-type system needs to be from day one.
2. Should the estimate feel like a firm number or an obviously-rough range — is ±6% the right
   amount of hedge for your business, or would you rather show a wider range, or none at all?
3. Should homeowners be able to reopen an estimate later, or is this strictly one-shot?
4. Will Marcus ever need his own login separate from yours — even just so you can tell who changed
   a price?
5. What should happen when someone's roof is genuinely outside your normal size range — still give
   a number, or say "let's talk" past a certain size?

## What I'd do next with another week

1. Build the version-history stretch goal properly — a diff view of what changed, when, and (once
   multi-user exists) by whom.
2. Add drop-off analytics on the multi-step flow, since that's exactly the "how much for a roof"
   friction Dale is trying to fix.
3. CSV export and the outbound webhook, in that order — small, high-value once the core is proven
   stable.
4. A real automated test suite around `calculate.js` specifically — it's the one file where a
   silent bug directly costs the client money — plus integration tests for the stale-config
   rejection path.
5. Replace the single shared owner login with real per-user accounts once there's an actual second
   user who needs one.