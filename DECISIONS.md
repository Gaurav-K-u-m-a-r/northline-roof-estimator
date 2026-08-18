# DECISIONS.md

## The calculation formula, in plain language

For the base quantity (roof area) and whichever material, pitch, tear-off layer, and story-count
options the homeowner picked:

1. **Material cost** = roof area × material's rate-per-sqft × (1 + waste factor). The waste
   factor (10%) accounts for material lost to cuts and offcuts — it's applied to material cost
   only, not tear-off.
2. **Tear-off cost** = roof area × the selected layer option's tear-off rate (0 for a new build).
3. **Subtotal** = (material cost + tear-off cost) × pitch multiplier × story multiplier. Pitch and
   story multipliers stack multiplicatively — a steep, three-storey roof costs more on both counts,
   not just the larger of the two.
4. **Total** = subtotal + the flat permit fee ($350).
5. The final range is the total ± half of the configured spread percentage (12% → total × 0.94 to
   total × 1.06).

This lives in one place, `backend/src/calc/calculate.js`, and is generic over question *shape*
(a select option can carry `rate_per_sqft`, `multiplier`, and/or `tear_off_per_sqft`, and whichever
of those it has get folded into the formula in that role) rather than hardcoded to the five specific
question keys in the seed data. That means the owner can rename labels, change every rate, and
toggle questions on/off from the panel without needing a code change. It does **not** mean an owner
can invent a wholly new *kind* of pricing effect (e.g., "add $50 if skylight = yes") without a
developer — that's a real limit, and I think it's the right one for 24 hours: the brief's "hard
constraint" is about the front-end never hardcoding content, not about the calculation engine being
infinitely extensible.

## Assumptions made where the brief was silent

- **Which question is the "base quantity."** The brief never tags `roof_area` as special. I treat
  the first active, required, `type: "number"` question as the quantity the per-sqft rates multiply
  against. With the seed data there's exactly one such question, so this is unambiguous today; if a
  second numeric question were added, only the first would currently drive the formula — a
  documented limitation, not a silent bug.
- **Contact fields.** The brief says "name, phone, and what they answered." I added an optional
  email field since it's a normal thing to collect and the client mentioned email addresses in
  their own historical lead data (`aruiz@example.com` etc.) without saying not to ask for it.
- **Login mechanism.** "Basic auth is fine" — I read that as "you don't need to over-engineer
  security," not literally HTTP Basic Auth, because a raw browser auth prompt is a worse experience
  for a non-technical user than a normal login page. I built a simple username/password → JWT flow
  with a single shared owner account, which is "basic" in spirit (one shared login, no roles, no
  password reset flow, no 2FA) while still being something Marcus can actually use.
- **What "changes appear without a redeploy" requires.** I read this as: config lives in the
  database, is fetched fresh on every estimator page load, and owner edits write to that same
  document in place. I did *not* build config version history or a staging/publish step — the
  owner's save is live immediately. This satisfies "no redeploy" but does mean there's no undo
  button if Dale fat-fingers a rate; noted as a stretch-goal gap below.
- **What happens if config changes mid-flow.** A homeowner's browser holds the questions/options it
  fetched at the start of the flow. If the owner only changes *numbers* (rates, multipliers, flat
  fees) or labels while a homeowner is mid-flow, the visitor's in-progress answers stay valid and
  the final calculation just uses the current numbers — this is the normal case and works
  silently and correctly. If the owner removes a question or an option the visitor already
  selected — much rarer — the server rejects the submission with a clear "please restart" message
  (`STALE_CONFIG`, HTTP 409) rather than silently mis-pricing or crashing. I chose "fail loudly and
  ask them to restart" over "try to guess a fallback price," because a wrong number with someone's
  real contact info attached is worse than asking them to redo a 90-second form.
- **Number formatting quirk in the seed data.** The `pitch: medium` option's multiplier arrives as
  the *string* `"1.12"` while every other multiplier/rate in the seed data is a JSON number. This
  is exactly the kind of "real export, treat it as production data" mess the brief describes. I
  coerce it to a number at seed time and defensively coerce (and reject non-numeric) values again
  in the admin PUT route, so a future owner edit can't silently reintroduce a string-typed rate that
  would otherwise concatenate instead of multiply.
- **The two historical leads with a different config version.** `ld_0917` references question keys
  (`chimney_count`, `gutter_replace`) and a material (`slate_natural`) that don't exist in the
  current config. I seed it as-is — answers are stored schemaless specifically so old leads remain
  readable in the owner panel even after the config has moved on — but I don't try to run it through
  the current calculator or reconcile it with `estimate_low`/`estimate_high`, which are just stored
  historical numbers, not something the app recomputes.

## What I deliberately did not build, and why

- **Config version history** (stretch goal). `config_version` increments on every save and is
  stored on every lead, so the data needed for a future history view already exists — I just didn't
  build the UI to browse it. Given the choice between that and making sure the core flow (estimate →
  lead capture → owner edit → leads list) was solid and tested, the core flow won.
- **CSV export, webhooks, "add a new question" builder, automated tests** (all listed stretch
  goals) — same reasoning. The brief explicitly says a half-finished stretch goal scores worse than
  a finished core, so I stopped at a working, deployable core rather than starting several of these.
- **Multi-user roles / permissions for the owner panel.** Dale mentioned Marcus will use it too, but
  never asked for different permission levels between them, so I built one shared owner login
  instead of a user-management system nobody asked for.
- **Rate limiting / brute-force protection on the login route.** Worth having before this goes to a
  real client long-term; skipped for the 24-hour scope. Flagged here rather than left silent.

## Things in the brief or seed data I found questionable

- The `pitch: medium` string-vs-number multiplier, handled above.
- The seed leads' `estimate_low`/`estimate_high` don't correspond to any formula I could reverse
  out of the given rates (e.g. Bill Tanner's lead uses a material, `slate_natural`, that has no rate
  anywhere in the current config, and its own multipliers aren't given at all) — the brief
  anticipates this directly ("do not assume your formula must reproduce them exactly"), so I took it
  at its word and defined my own formula rather than reverse-engineering old numbers from
  incomplete inputs.
- "Nothing fancy, I just need name, phone, and what they answered" versus "I also want to be able
  to see the leads" being the entire spec for the leads view — I kept it to a single sortable table,
  no filtering or search, since that's genuinely all that was asked for.

## Questions I'd ask Dale before starting the real build

1. When you say you want to add a gutters question later — is it always going to be a yes/no plus a
   rate, or could it need its own kind of math (e.g. linear feet instead of a flat add-on)? That
   changes how flexible the "question type" system needs to be from day one.
2. Do you want the estimate to feel like a firm number or an obviously-rough range? Right now it's a
   ±6% band — is that the right amount of hedge for your business, or would you rather show a wider
   range (or no range, just "a member of our team will confirm")?
3. Should homeowners be able to come back and re-open an estimate later (e.g. via an emailed link),
   or is this strictly one-shot — fill it in, we call you?
4. Is Marcus going to need his own login separate from yours, ever — even just so you can tell who
   changed a price?
5. What happens today when someone's roof is a genuinely unusual shape or size outside your normal
   range — do you want the tool to still give a number, or would you rather it just say "let's talk"
   past a certain size?

## What I'd do next with another week

1. Build the config version history stretch goal properly — a diff view of what changed, when, and
   (once multi-user exists) by whom.
2. Add real form-level analytics: where in the multi-step flow people are dropping off, since that's
   exactly the "how much for a roof" friction Dale is trying to fix.
3. CSV export and the outbound webhook, in that order — both are small, high-value adds once the
   core is proven stable.
4. A proper automated test suite around `calculate.js` specifically (it's the one file where a
   silent bug directly costs the client money), plus integration tests for the stale-config
   rejection path.
5. Replace the single shared owner login with real per-user accounts once there's an actual second
   user (Marcus) who needs one.
