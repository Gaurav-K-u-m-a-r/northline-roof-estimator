const express = require('express');
const Config = require('../models/Config');
const Lead = require('../models/Lead');
const { calculateEstimate, EstimateError } = require('../calc/calculate');

const router = express.Router();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * POST /api/estimate
 * Body: { name, phone, email?, answers: { [key]: value } }
 *
 * Calculates against the CURRENT live config (not a client-sent
 * snapshot) so a price change by the owner is reflected immediately.
 * If the owner has removed a question/option the visitor answered
 * (rare — labels/rates change far more often than structure), we fail
 * loudly with a clear message rather than silently mis-pricing. See
 * DECISIONS.md, "Changes appear on the public estimator without a
 * redeploy".
 */
router.post('/', async (req, res) => {
  const { name, phone, email, answers } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }
  if (email && !isValidEmail(email)) {
    return res.status(400).json({ error: 'Email address looks invalid.' });
  }
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return res.status(400).json({ error: 'Answers are required.' });
  }

  const config = await Config.findOne().sort({ updated_at: -1 }).lean();
  if (!config) {
    return res.status(503).json({ error: 'Estimator is not configured yet.' });
  }

  let result;
  try {
    result = calculateEstimate(config, answers);
  } catch (err) {
    if (err instanceof EstimateError) {
      const status = err.code === 'STALE_CONFIG' ? 409 : 422;
      return res.status(status).json({ error: err.message, code: err.code });
    }
    console.error('[estimate] unexpected calculation error', err);
    return res.status(500).json({ error: 'Could not calculate an estimate right now.' });
  }

  const lead = await Lead.create({
    config_version: config.config_version,
    name: name.trim(),
    phone: phone.trim(),
    email: email ? email.trim() : undefined,
    answers,
    estimate_low: result.estimate_low,
    estimate_high: result.estimate_high
  });

  res.status(201).json({
    lead_id: lead._id,
    estimate_low: result.estimate_low,
    estimate_high: result.estimate_high,
    currency: config.business?.currency || 'USD'
  });
});

module.exports = router;
