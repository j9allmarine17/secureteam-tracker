#!/usr/bin/env node

import { Pool } from 'pg';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { readFileSync, existsSync } from 'fs';

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function setupLocalDatabase() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://redteam_user:redteam_secure_2024@localhost:5432/redteam_collab';
  
  console.log('Setting up local database...');
  console.log('Connection:', connectionString.replace(/:[^:@]*@/, ':****@'));

  const pool = new Pool({
    connectionString,
    ssl: false // No SSL for local development
  });

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✓ Database connection successful');

    // Create sessions table for authentication
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR NOT NULL COLLATE "default",
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      );
    `);
    
    await pool.query(`
      ALTER TABLE sessions 
      ADD CONSTRAINT IF NOT EXISTS sessions_pkey 
      PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);
    `);
    console.log('✓ Sessions table created');

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY NOT NULL,
        username VARCHAR UNIQUE,
        password VARCHAR,
        email VARCHAR UNIQUE,
        first_name VARCHAR,
        last_name VARCHAR,
        profile_image_url VARCHAR,
        role VARCHAR NOT NULL DEFAULT 'analyst',
        status VARCHAR NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ Users table created');

    // Create findings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS findings (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        severity VARCHAR NOT NULL,
        category VARCHAR NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'open',
        cvss_score TEXT,
        affected_url TEXT,
        payload TEXT,
        evidence JSONB DEFAULT '[]',
        reported_by_id VARCHAR NOT NULL REFERENCES users(id),
        assigned_to JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ Findings table created');

    // Create comments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        finding_id INTEGER NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
        user_id VARCHAR NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ Comments table created');

    // Create reports table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        findings JSONB NOT NULL,
        generated_by_id VARCHAR NOT NULL REFERENCES users(id),
        format VARCHAR NOT NULL DEFAULT 'pdf',
        filename VARCHAR,
        file_path VARCHAR,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ Reports table created');

    // Create messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        user_id VARCHAR NOT NULL REFERENCES users(id),
        channel VARCHAR NOT NULL DEFAULT 'general',
        reply_to INTEGER,
        edited BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ Messages table created');

    // Check if admin user exists
    const adminCheck = await pool.query('SELECT id FROM users WHERE username = $1', ['admin']);
    
    if (adminCheck.rows.length === 0) {
      // Create admin user
      const hashedPassword = await hashPassword('admin123');
      await pool.query(`
        INSERT INTO users (id, username, password, email, first_name, last_name, role, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      `, [
        'admin_user_001',
        'admin',
        hashedPassword,
        'admin@company.com',
        'System',
        'Administrator',
        'admin',
        'active'
      ]);
      console.log('✓ Admin user created (username: admin, password: admin123)');
    } else {
      console.log('✓ Admin user already exists');
    }

    console.log('\n🎉 Local database setup complete!');
    console.log('\nYou can now start your application with:');
    console.log('npm run dev');
    console.log('\nAdmin credentials:');
    console.log('Username: admin');
    console.log('Password: admin123');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

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

setupLocalDatabase().catch(console.error);