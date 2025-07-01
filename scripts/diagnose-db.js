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

async function diagnoseDatabase() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://redteam_user:redteam_secure_2024@localhost:5432/redteam_collab';
  
  console.log('🔍 Diagnosing PostgreSQL connection...');
  console.log('Connection string:', connectionString.replace(/:[^:@]*@/, ':****@'));

  // Test different connection combinations
  const configs = [
    {
      name: 'Original Config',
      connectionString: connectionString,
      ssl: false
    },
    {
      name: 'With postgres user',
      connectionString: connectionString.replace('redteam_user', 'postgres'),
      ssl: false
    },
    {
      name: 'Different password',
      connectionString: connectionString.replace('redteam_secure_2024', 'postgres'),
      ssl: false
    }
  ];

  for (const config of configs) {
    console.log(`\n🧪 Testing: ${config.name}`);
    const pool = new Pool({
      connectionString: config.connectionString,
      ssl: config.ssl
    });

    try {
      const result = await pool.query('SELECT NOW(), version()');
      console.log('✅ SUCCESS!', result.rows[0]);
      
      // Check if user exists
      try {
        const userCheck = await pool.query('SELECT usename FROM pg_user WHERE usename = $1', ['redteam_user']);
        console.log('Users found:', userCheck.rows.length > 0 ? 'redteam_user exists' : 'redteam_user does not exist');
      } catch (err) {
        console.log('Could not check user existence:', err.message);
      }

      // Check database existence
      try {
        const dbCheck = await pool.query('SELECT datname FROM pg_database WHERE datname = $1', ['redteam_collab']);
        console.log('Database:', dbCheck.rows.length > 0 ? 'redteam_collab exists' : 'redteam_collab does not exist');
      } catch (err) {
        console.log('Could not check database existence:', err.message);
      }

      console.log('🎉 This configuration works! Update your .env file with:');
      console.log(`DATABASE_URL=${config.connectionString}`);
      break;

    } catch (error) {
      console.log('❌ FAILED:', error.message);
    } finally {
      await pool.end();
    }
  }
}

diagnoseDatabase().catch(console.error);