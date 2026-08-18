const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Config = require('../models/Config');
const Lead = require('../models/Lead');
const requireAuth = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/admin/login
 * Body: { username, password }
 * Returns a JWT the owner-panel front-end stores and sends back as
 * `Authorization: Bearer <token>` on every subsequent admin call.
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const admin = await Admin.findOne({ username: username.trim() });
  if (!admin) {
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }

  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }

  const token = jwt.sign(
    { sub: admin._id.toString(), username: admin.username },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({ token, username: admin.username });
});

// Everything below this line requires a valid owner session.
router.use(requireAuth);

/**
 * GET /api/admin/config
 * Full config, including rates/multipliers — this is the ONLY route
 * that returns pricing internals, and it's behind auth.
 */
router.get('/config', async (req, res) => {
  const config = await Config.findOne().sort({ updated_at: -1 });
  if (!config) return res.status(404).json({ error: 'No config found.' });
  res.json(config);
});

/**
 * PUT /api/admin/config
 * Body: full config object (business, questions[], modifiers).
 * We validate structure, coerce numeric fields (the seed data has one
 * multiplier as a string — "1.12" — so this coercion isn't hypothetical,
 * it's needed from day one; see DECISIONS.md), and bump config_version.
 * We update the SAME document in place (there's only ever one live
 * config) so the change is visible to the public estimator immediately,
 * with zero downtime and no redeploy.
 */
router.put('/config', async (req, res) => {
  const { business, questions, modifiers } = req.body || {};

  if (!business || !business.name) {
    return res.status(400).json({ error: 'business.name is required.' });
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'At least one question is required.' });
  }

  const seenKeys = new Set();
  for (const q of questions) {
    if (!q.key || !q.label || !q.type) {
      return res.status(400).json({ error: 'Every question needs a key, label, and type.' });
    }
    if (seenKeys.has(q.key)) {
      return res.status(400).json({ error: `Duplicate question key "${q.key}".` });
    }
    seenKeys.add(q.key);

    if (q.type === 'select') {
      if (!Array.isArray(q.options) || q.options.length === 0) {
        return res.status(400).json({ error: `Question "${q.key}" needs at least one option.` });
      }
      for (const opt of q.options) {
        if (!opt.value || !opt.label) {
          return res
            .status(400)
            .json({ error: `An option on "${q.key}" is missing a value or label.` });
        }
        // Coerce numeric-looking strings (defensive — mirrors the
        // pitch:medium multiplier "1.12" quirk found in the seed data).
        for (const field of ['rate_per_sqft', 'multiplier', 'tear_off_per_sqft']) {
          if (opt[field] !== undefined && opt[field] !== null && opt[field] !== '') {
            const num = Number(opt[field]);
            if (Number.isNaN(num)) {
              return res
                .status(400)
                .json({ error: `"${field}" on option "${opt.value}" must be a number.` });
            }
            opt[field] = num;
          } else {
            delete opt[field];
          }
        }
      }
    }
  }

  const current = await Config.findOne().sort({ updated_at: -1 });
  if (!current) return res.status(404).json({ error: 'No config found to update.' });

  current.business = business;
  current.questions = questions;
  current.modifiers = {
    waste_factor: Number(modifiers?.waste_factor ?? current.modifiers.waste_factor ?? 0),
    permit_flat_fee: Number(modifiers?.permit_flat_fee ?? current.modifiers.permit_flat_fee ?? 0),
    range_spread_pct: Number(
      modifiers?.range_spread_pct ?? current.modifiers.range_spread_pct ?? 0
    )
  };
  current.config_version += 1;
  current.updated_at = new Date();

  await current.save();
  res.json(current);
});

/**
 * GET /api/admin/leads
 * Newest first. Simple — no pagination — because the brief says "nothing
 * fancy". If lead volume grows this is the first thing to revisit
 * (noted in DECISIONS.md).
 */
router.get('/leads', async (req, res) => {
  const leads = await Lead.find().sort({ captured_at: -1 }).lean();
  res.json(leads);
});

module.exports = router;
