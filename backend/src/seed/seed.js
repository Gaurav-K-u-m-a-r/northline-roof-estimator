require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../db');
const Config = require('../models/Config');
const Lead = require('../models/Lead');
const Admin = require('../models/Admin');
const { currentConfig, existingLeads } = require('./seedData');

async function run() {
  await connectDB();

  await Config.deleteMany({});
  await Config.create({ ...currentConfig, updated_at: new Date() });
  console.log('[seed] config loaded (version %d)', currentConfig.config_version);

  await Lead.deleteMany({});
  await Lead.insertMany(existingLeads);
  console.log('[seed] %d historical leads loaded', existingLeads.length);

  const username = process.env.ADMIN_USERNAME || 'owner';
  const password = process.env.ADMIN_PASSWORD || 'northline2026';
  const password_hash = await bcrypt.hash(password, 10);

  await Admin.deleteMany({});
  await Admin.create({ username, password_hash });
  console.log('[seed] owner login ready -> username: "%s"', username);

  console.log('[seed] done.');
  process.exit(0);
}

run().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
