import { Pool } from 'pg';
import crypto from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt);

async function comparePasswords(supplied, stored) {
  const parts = stored.split(".");
  if (parts.length !== 2) {
    return false;
  }
  const [hashed, salt] = parts;
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return crypto.timingSafeEqual(hashedBuf, suppliedBuf);
}

async function testLogin() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password123@localhost:5432/redteam_collab',
    ssl: false
  });

  try {
    console.log('Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✓ Database connection successful');

    console.log('\nChecking admin user...');
    const result = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
    
    if (result.rows.length === 0) {
      console.log('✗ Admin user not found');
      return;
    }

    const user = result.rows[0];
    console.log('✓ Admin user found');
    console.log('User data:', {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0
    });

    if (!user.password) {
      console.log('✗ Admin user has no password set');
      return;
    }

    console.log('\nTesting password verification...');
    const testPassword = 'admin123';
    const isValid = await comparePasswords(testPassword, user.password);
    
    if (isValid) {
      console.log('✓ Password verification successful');
      console.log('Login should work with: admin / admin123');
    } else {
      console.log('✗ Password verification failed');
      console.log('The stored password hash does not match admin123');
    }

    console.log('\nTesting session store...');
    const sessionTest = await pool.query('SELECT COUNT(*) FROM sessions');
    console.log('✓ Sessions table accessible, count:', sessionTest.rows[0].count);

  } catch (error) {
    console.error('✗ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testLogin();