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

async function fixTableOwnership() {
  console.log('🔧 Fixing table ownership...');

  // Connect as postgres superuser to fix ownership
  const adminPool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'redteam_collab',
    ssl: false
  });

  try {
    // Change ownership of all tables to redteam_user
    const tables = ['sessions', 'users', 'findings', 'comments', 'reports', 'messages'];
    
    for (const table of tables) {
      try {
        await adminPool.query(`ALTER TABLE ${table} OWNER TO redteam_user`);
        console.log(`✓ Changed ownership of ${table} to redteam_user`);
      } catch (error) {
        if (error.message.includes('does not exist')) {
          console.log(`- Table ${table} does not exist yet (will be created)`);
        } else {
          console.log(`- Could not change ownership of ${table}: ${error.message}`);
        }
      }
    }

    // Change ownership of sequences
    const sequences = ['findings_id_seq', 'comments_id_seq', 'reports_id_seq', 'messages_id_seq'];
    
    for (const seq of sequences) {
      try {
        await adminPool.query(`ALTER SEQUENCE ${seq} OWNER TO redteam_user`);
        console.log(`✓ Changed ownership of ${seq} to redteam_user`);
      } catch (error) {
        if (error.message.includes('does not exist')) {
          console.log(`- Sequence ${seq} does not exist yet (will be created)`);
        } else {
          console.log(`- Could not change ownership of ${seq}: ${error.message}`);
        }
      }
    }

    console.log('✓ Table ownership fixes complete');

  } catch (error) {
    console.error('❌ Failed to fix table ownership:', error.message);
    throw error;
  } finally {
    await adminPool.end();
  }
}

fixTableOwnership().catch(console.error);