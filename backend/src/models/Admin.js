const mongoose = require('mongoose');

/*
 * One admin account is enough for this brief ("Dale, and probably Marcus
 * will be in there too" — but the brief never asks for multi-user roles,
 * so we keep a single shared owner login rather than building a user
 * management system nobody asked for). See DECISIONS.md.
 */
const AdminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true }
  },
  { collection: 'admins' }
);

module.exports = mongoose.model('Admin', AdminSchema);
