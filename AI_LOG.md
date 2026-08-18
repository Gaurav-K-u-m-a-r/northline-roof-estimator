# AI_LOG.md

> ⚠️ **Personalize this before you submit.** This draft describes how the assistant (Claude) was
> actually used to scaffold this project. Before you send it to Wantace, edit it to be true for
> *you specifically* — what you actually ran, what you actually changed, and what you'd actually
> say live in the interview. Submitting an AI log that isn't honestly yours defeats its purpose,
> and the brief specifically scores honesty here.

## Tools used

Claude (Sonnet) was used as the primary build tool for the initial scaffold: the Express API,
Mongoose models, the calculation engine, the React estimator flow, the owner panel, and the seed
data transcription from the client brief's PDF.

## What I used it for

- Translating the PDF brief's seed JSON into working Mongoose schemas and a seed script.
- Scaffolding the multi-step estimator UI and the owner panel's editing forms.
- Writing the calculation engine (`calc/calculate.js`) and its input-validation edge cases.
- First-pass README/DECISIONS structure, which I then edited to reflect my own reasoning.

## A specific instance where the AI produced something wrong or weak, and what I did about it

The `pitch: medium` option's multiplier arrives in the brief's seed JSON as the *string* `"1.12"`,
while every other rate/multiplier in the same document is a plain number. A naive implementation
that just multiplies option fields together would silently do string concatenation or `NaN` math
on that one option — Claude flagged this itself while writing the seed data file and added a
coercion step, but I want to be explicit that **this is exactly the kind of thing you have to
actually check by hand**, not trust because the code "looks" like it handles it. Before you submit:
run the estimator with `pitch = medium` selected and confirm the returned estimate looks
proportionally right relative to `pitch = low`, not wildly off — that's your real verification, not
just reading the coercion code and assuming it works.

## What I would do differently / what still needs my own verification

I have not yet run `npm install`, started MongoDB, or clicked through the estimator and owner
panel myself end-to-end in this environment. **Before submitting, I need to:**

1. Actually run both servers locally and complete the estimator flow with real input.
2. Confirm a lead appears correctly in the owner panel.
3. Confirm editing a rate in the owner panel changes the next estimate's number.
4. Read every file in `backend/src/calc/calculate.js` and `backend/src/routes/*.js` closely enough
   that I can explain and modify any function live, since round 2 is exactly that.
5. Decide whether the contact-form validation, the "stale config" error message wording, and the
   owner panel's copy actually sound like something I'd ship, or whether I want to rewrite them in
   my own words.

## Parts I wrote or substantially reworked myself

_(Fill this in honestly once you've actually gone through the code — e.g., "I rewrote the phone
validation regex," "I changed the formula's waste-factor placement after checking it against a
manual calculation," "I restyled the admin panel's color scheme," etc. An AI log with nothing in
this section is a weak AI log.)_
