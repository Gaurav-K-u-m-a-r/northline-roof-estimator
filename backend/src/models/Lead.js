const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema(
  {
    captured_at: { type: Date, default: Date.now },
    config_version: { type: Number, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    // Free-form: { [question_key]: value }. Intentionally schemaless
    // because the set of question keys is owner-editable at runtime.
    answers: { type: mongoose.Schema.Types.Mixed, required: true },
    estimate_low: { type: Number, required: true },
    estimate_high: { type: Number, required: true }
  },
  { collection: 'leads' }
);

module.exports = mongoose.model('Lead', LeadSchema);
