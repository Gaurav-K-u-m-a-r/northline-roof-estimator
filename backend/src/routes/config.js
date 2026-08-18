const express = require('express');
const Config = require('../models/Config');

const router = express.Router();

/**
 * GET /api/config
 *
 * Public. Returns ONLY what the estimator front-end needs to render
 * itself: business info, active questions (inactive ones are filtered
 * out server-side — the client never even sees them), and the modifiers
 * needed for... nothing actually, the client never calculates. We strip
 * modifiers entirely so pricing internals never reach the browser.
 */
router.get('/', async (req, res) => {
  const config = await Config.findOne().sort({ updated_at: -1 }).lean();
  if (!config) {
    return res.status(503).json({ error: 'Estimator is not configured yet.' });
  }

  const publicQuestions = config.questions
    .filter((q) => q.active)
    .map((q) => ({
      key: q.key,
      label: q.label,
      type: q.type,
      unit: q.unit,
      required: q.required,
      min: q.min,
      max: q.max,
      options: q.options
        ? q.options.map((o) => ({ value: o.value, label: o.label }))
        : undefined
    }));

  res.json({
    config_version: config.config_version,
    business: config.business,
    questions: publicQuestions
  });
});

module.exports = router;
