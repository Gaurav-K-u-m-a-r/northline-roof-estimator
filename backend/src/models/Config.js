const mongoose = require('mongoose');

/*
 * Single "live" configuration document. We only ever keep one active
 * config (config_version increments on every save). This is deliberately
 * simple — see DECISIONS.md for why we did not build full version
 * history (it's a listed stretch goal).
 */

const OptionSchema = new mongoose.Schema(
  {
    value: { type: String, required: true },
    label: { type: String, required: true },
    // Any of these may be present depending on what the option affects.
    // Kept as Number (not String) — the seed data has one multiplier as a
    // string ("1.12"); we coerce that on seed/save so downstream math
    // never has to guess a type. See DECISIONS.md.
    rate_per_sqft: { type: Number },
    multiplier: { type: Number },
    tear_off_per_sqft: { type: Number }
  },
  { _id: false }
);

const QuestionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ['number', 'select'], required: true },
    unit: { type: String },
    required: { type: Boolean, default: true },
    min: { type: Number },
    max: { type: Number },
    active: { type: Boolean, default: true },
    options: { type: [OptionSchema], default: undefined }
  },
  { _id: false }
);

const ConfigSchema = new mongoose.Schema(
  {
    config_version: { type: Number, required: true, default: 1 },
    business: {
      name: { type: String, required: true },
      region: { type: String },
      currency: { type: String, default: 'USD' }
    },
    questions: { type: [QuestionSchema], default: [] },
    modifiers: {
      waste_factor: { type: Number, default: 0 },
      permit_flat_fee: { type: Number, default: 0 },
      range_spread_pct: { type: Number, default: 0 }
    },
    updated_at: { type: Date, default: Date.now }
  },
  { collection: 'config' }
);

module.exports = mongoose.model('Config', ConfigSchema);
