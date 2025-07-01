#!/usr/bin/env node

import { Pool } from 'pg';
import { readFileSync, existsSync } from 'fs';

// Load environment variables
if (existsSync('.env')) {
  const envFile = readFileSync('.env', 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

async function fixUserPassword() {
  console.log('🔧 Fixing redteam_user password...');

  // Connect as postgres superuser to fix the password
  const adminPool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres',
    ssl: false
  });

  try {
    // Reset the user password
    await adminPool.query(`
      ALTER USER redteam_user WITH ENCRYPTED PASSWORD 'redteam_secure_2024'
    `);
    console.log('✓ Password reset for redteam_user');

    // Ensure proper privileges
    await adminPool.query(`
      GRANT ALL PRIVILEGES ON DATABASE redteam_collab TO redteam_user
    `);

    await adminPool.query(`
      ALTER USER redteam_user CREATEDB
    `);

    console.log('✓ Privileges granted to redteam_user');

  } catch (error) {
    console.error('❌ Failed to fix password:', error.message);
    throw error;
  } finally {
    await adminPool.end();
  }

  // Test the connection with the fixed password
  console.log('🧪 Testing connection with redteam_user...');
  const testPool = new Pool({
    connectionString: 'postgresql://redteam_user:redteam_secure_2024@localhost:5432/redteam_collab',
    ssl: false
  });

  try {
    const result = await testPool.query('SELECT NOW() as current_time');
    console.log('✅ SUCCESS! Connection works:', result.rows[0].current_time);
    console.log('✅ redteam_user password is now correctly set');
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    throw error;
  } finally {
    await testPool.end();
  }
}

fixUserPassword().catch(console.error);