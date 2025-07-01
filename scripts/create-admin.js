import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";
import crypto from 'crypto';
import { promisify } from 'util';

neonConfig.webSocketConstructor = ws;

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function createAdminUser() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password123@localhost:5432/redteam_collab'
  });

  try {
    console.log('Creating admin user...');
    
    const hashedPassword = await hashPassword('admin123');
    
    // First check the table structure
    const tableInfo = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
    `);
    
    const columns = tableInfo.rows.map(row => row.column_name);
    console.log('Available columns:', columns);
    
    // Insert admin user using snake_case columns
    await pool.query(`
      INSERT INTO users (id, username, password, first_name, last_name, email, role)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (username) DO UPDATE SET
        password = EXCLUDED.password,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        email = EXCLUDED.email,
        role = EXCLUDED.role
    `, [
      'admin_user_001',
      'admin',
      hashedPassword,
      'System',
      'Administrator',
      'admin@company.com',
      'admin'
    ]);
    
    console.log('Admin user created/updated successfully');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('Role: admin');
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await pool.end();
  }
}

createAdminUser();