import { Pool } from 'pg';
import crypto from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function setupDatabase() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:password123@localhost:5432/redteam_collab';
  
  console.log('Connecting to database...');
  const pool = new Pool({ 
    connectionString: databaseUrl,
    ssl: false
  });

  try {
    console.log('Creating tables...');
    
    // Create sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      );
    `);

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY,
        username VARCHAR UNIQUE,
        password VARCHAR,
        email VARCHAR UNIQUE,
        first_name VARCHAR,
        last_name VARCHAR,
        profile_image_url VARCHAR,
        role VARCHAR NOT NULL DEFAULT 'analyst',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create comments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        finding_id INTEGER NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
        user_id VARCHAR NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create admin user
    const adminPassword = await hashPassword('admin123');
    await pool.query(`
      INSERT INTO users (id, username, password, email, first_name, last_name, role)
      VALUES ('admin_user_001', 'admin', $1, 'admin@company.com', 'System', 'Administrator', 'admin')
      ON CONFLICT (username) DO UPDATE SET
        password = EXCLUDED.password,
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        role = EXCLUDED.role;
    `, [adminPassword]);

    console.log('✓ Database setup complete!');
    console.log('✓ Admin user created (username: admin, password: admin123)');

  } catch (error) {
    console.error('Database setup error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();