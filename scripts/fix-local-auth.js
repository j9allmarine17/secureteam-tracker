import { Pool } from 'pg';
import crypto from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function fixLocalAuth() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:password123@localhost:5432/redteam_collab';
  console.log('Connecting to:', databaseUrl);
  
  const pool = new Pool({ 
    connectionString: databaseUrl,
    ssl: false
  });

  try {
    console.log('1. Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✓ Database connected');

    console.log('\n2. Checking/creating sessions table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      );
      CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);
    `);
    console.log('✓ Sessions table ready');

    console.log('\n3. Recreating admin user with fresh password...');
    const hashedPassword = await hashPassword('admin123');
    
    await pool.query(`
      DELETE FROM users WHERE username = 'admin';
    `);
    
    await pool.query(`
      INSERT INTO users (id, username, password, first_name, last_name, email, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
    `, [
      'admin_user_001',
      'admin',
      hashedPassword,
      'System',
      'Administrator',
      'admin@company.com',
      'admin'
    ]);

    console.log('✓ Admin user recreated');
    console.log('   Username: admin');
    console.log('   Password: admin123');

    console.log('\n4. Testing authentication...');
    const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
    if (userCheck.rows.length > 0) {
      console.log('✓ Admin user verified in database');
    }

    console.log('\n5. Clearing old sessions...');
    await pool.query('DELETE FROM sessions WHERE expire < NOW()');
    console.log('✓ Old sessions cleared');

    console.log('\n✅ Local authentication setup complete!');
    console.log('\nNext steps:');
    console.log('1. Start your application: ./start-local.sh');
    console.log('2. Navigate to http://localhost:5000');
    console.log('3. Login with admin / admin123');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    
    if (error.message.includes('connect ECONNREFUSED')) {
      console.log('\n🔧 PostgreSQL is not running. Start it with:');
      console.log('   sudo systemctl start postgresql');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.log('\n🔧 Database does not exist. Create it with:');
      console.log('   sudo -u postgres createdb redteam_collab');
    } else if (error.message.includes('authentication failed')) {
      console.log('\n🔧 Authentication failed. Check postgres password:');
      console.log('   sudo -u postgres psql -c "ALTER USER postgres PASSWORD \'password123\';"');
    }
  } finally {
    await pool.end();
  }
}

fixLocalAuth();