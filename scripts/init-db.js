import { Pool } from 'pg';
import crypto from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function initializeDatabase() {
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
      CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);
    `);

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY,
        username VARCHAR UNIQUE,
        password VARCHAR,
        "firstName" VARCHAR,
        "lastName" VARCHAR,
        email VARCHAR UNIQUE,
        role VARCHAR DEFAULT 'analyst',
        "profileImageUrl" VARCHAR,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create findings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS findings (
        id SERIAL PRIMARY KEY,
        title VARCHAR NOT NULL,
        description TEXT,
        severity VARCHAR DEFAULT 'medium',
        status VARCHAR DEFAULT 'open',
        category VARCHAR,
        "reportedById" VARCHAR REFERENCES users(id),
        "assignedTo" VARCHAR[],
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create comments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        "findingId" INTEGER REFERENCES findings(id) ON DELETE CASCADE,
        "userId" VARCHAR REFERENCES users(id),
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create reports table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        title VARCHAR NOT NULL,
        description TEXT,
        "createdById" VARCHAR REFERENCES users(id),
        "findings" INTEGER[],
        "generatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Tables created successfully!');

    // Check if admin user exists
    const existingAdmin = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      ['admin']
    );

    if (existingAdmin.rows.length === 0) {
      console.log('Creating default admin user...');
      const hashedPassword = await hashPassword('admin123');
      
      await pool.query(`
        INSERT INTO users (id, username, password, "firstName", "lastName", email, role)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        'admin_user_001',
        'admin',
        hashedPassword,
        'System',
        'Administrator',
        'admin@company.com',
        'admin'
      ]);
      
      console.log('Default admin user created:');
      console.log('  Username: admin');
      console.log('  Password: admin123');
      console.log('  Role: admin');
    } else {
      console.log('Admin user already exists, skipping creation.');
    }

    console.log('\nDatabase initialization completed successfully!');
    console.log('You can now start the application with: npm run dev');
    
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run initialization
initializeDatabase();