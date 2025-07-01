#!/usr/bin/env node

import { Pool } from 'pg';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
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

async function createDatabaseAndUser() {
  console.log('Setting up PostgreSQL database and user...');
  
  try {
    // Connect as postgres superuser to create database and user
    const adminPool = new Pool({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'postgres', // Try common default password
      database: 'postgres',
      ssl: false
    });

    try {
      // Test connection
      await adminPool.query('SELECT NOW()');
      console.log('✓ Connected to PostgreSQL as postgres user');

      // Create database if not exists
      await adminPool.query(`
        CREATE DATABASE redteam_collab
      `).catch(() => console.log('Database redteam_collab already exists'));

      // Create user if not exists
      await adminPool.query(`
        CREATE USER redteam_user WITH ENCRYPTED PASSWORD 'redteam_secure_2024'
      `).catch(() => console.log('User redteam_user already exists'));

      // Grant privileges
      await adminPool.query(`
        GRANT ALL PRIVILEGES ON DATABASE redteam_collab TO redteam_user
      `);

      await adminPool.query(`
        ALTER USER redteam_user CREATEDB
      `);

      console.log('✓ Database and user setup complete');
      
    } finally {
      await adminPool.end();
    }

  } catch (adminError) {
    console.log('Could not connect as postgres user, trying alternative approach...');
    
    // Try using system commands if PostgreSQL access is available
    try {
      execSync('sudo -u postgres createdb redteam_collab', { stdio: 'ignore' });
      console.log('✓ Database created via system command');
    } catch (e) {
      console.log('Database creation via system command failed or database exists');
    }

    try {
      execSync(`sudo -u postgres psql -c "CREATE USER redteam_user WITH ENCRYPTED PASSWORD 'redteam_secure_2024';"`, { stdio: 'ignore' });
      execSync('sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE redteam_collab TO redteam_user;"', { stdio: 'ignore' });
      execSync('sudo -u postgres psql -c "ALTER USER redteam_user CREATEDB;"', { stdio: 'ignore' });
      console.log('✓ User created via system command');
    } catch (e) {
      console.log('User creation via system command failed or user exists');
    }
  }
}

async function setupApplicationDatabase() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://redteam_user:redteam_secure_2024@localhost:5432/redteam_collab';
  
  console.log('Setting up application schema...');
  console.log('Connection:', connectionString.replace(/:[^:@]*@/, ':****@'));

  const pool = new Pool({
    connectionString,
    ssl: false
  });

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✓ Application database connection successful');

    // Create all required tables
    const tables = [
      {
        name: 'sessions',
        sql: `
          CREATE TABLE IF NOT EXISTS sessions (
            sid VARCHAR NOT NULL COLLATE "default",
            sess JSON NOT NULL,
            expire TIMESTAMP(6) NOT NULL,
            CONSTRAINT sessions_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE
          );
          CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);
        `
      },
      {
        name: 'users',
        sql: `
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
        `
      },
      {
        name: 'findings',
        sql: `
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
            reported_by_id VARCHAR NOT NULL,
            assigned_to JSONB DEFAULT '[]',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `
      },
      {
        name: 'comments',
        sql: `
          CREATE TABLE IF NOT EXISTS comments (
            id SERIAL PRIMARY KEY,
            finding_id INTEGER NOT NULL,
            user_id VARCHAR NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
          );
        `
      },
      {
        name: 'reports',
        sql: `
          CREATE TABLE IF NOT EXISTS reports (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            findings JSONB NOT NULL,
            generated_by_id VARCHAR NOT NULL,
            format VARCHAR NOT NULL DEFAULT 'pdf',
            filename VARCHAR,
            file_path VARCHAR,
            created_at TIMESTAMP DEFAULT NOW()
          );
        `
      },
      {
        name: 'messages',
        sql: `
          CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            content TEXT NOT NULL,
            user_id VARCHAR NOT NULL,
            channel VARCHAR NOT NULL DEFAULT 'general',
            reply_to INTEGER,
            edited BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `
      }
    ];

    for (const table of tables) {
      await pool.query(table.sql);
      console.log(`✓ ${table.name} table ready`);
    }

    // Add foreign key constraints if they don't exist
    const constraints = [
      `ALTER TABLE findings ADD CONSTRAINT IF NOT EXISTS fk_findings_reported_by 
       FOREIGN KEY (reported_by_id) REFERENCES users(id)`,
      `ALTER TABLE comments ADD CONSTRAINT IF NOT EXISTS fk_comments_finding 
       FOREIGN KEY (finding_id) REFERENCES findings(id) ON DELETE CASCADE`,
      `ALTER TABLE comments ADD CONSTRAINT IF NOT EXISTS fk_comments_user 
       FOREIGN KEY (user_id) REFERENCES users(id)`,
      `ALTER TABLE reports ADD CONSTRAINT IF NOT EXISTS fk_reports_generated_by 
       FOREIGN KEY (generated_by_id) REFERENCES users(id)`,
      `ALTER TABLE messages ADD CONSTRAINT IF NOT EXISTS fk_messages_user 
       FOREIGN KEY (user_id) REFERENCES users(id)`
    ];

    for (const constraint of constraints) {
      try {
        await pool.query(constraint);
      } catch (e) {
        // Constraint might already exist
      }
    }

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

    console.log('\n🎉 Database setup complete!');
    console.log('Admin credentials:');
    console.log('Username: admin');   
    console.log('Password: admin123');

  } catch (error) {
    console.error('❌ Application database setup failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

async function main() {
  try {
    await createDatabaseAndUser();
    await setupApplicationDatabase();
    console.log('\n✅ All setup complete! You can now start the application.');
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.log('\nPlease check your PostgreSQL installation and try running:');
    console.log('sudo -u postgres psql');
    console.log('Then manually create the database and user.');
    process.exit(1);
  }
}

main().catch(console.error);