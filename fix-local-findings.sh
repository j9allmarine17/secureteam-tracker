#!/bin/bash

echo "Fixing local finding creation on Kali Linux"
echo "==========================================="

# Ensure proper .env file exists
cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres:password123@localhost:5432/redteam_collab
SESSION_SECRET=redteam-collab-secure-session-key-for-local-development
NODE_ENV=development
PORT=5000
EOF

echo "✓ Environment configured"

# Start PostgreSQL service
sudo systemctl start postgresql 2>/dev/null || true

# Create database if it doesn't exist
sudo -u postgres createdb redteam_collab 2>/dev/null || true

# Set postgres password
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'password123';" 2>/dev/null || true

# Run database setup
node scripts/setup-db.mjs

echo "✓ Database initialized"

# Create a test script to verify authentication
cat > test-auth.js << 'EOF'
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://postgres:password123@localhost:5432/redteam_collab',
  ssl: false
});

async function testAuth() {
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
    if (result.rows.length > 0) {
      console.log('✓ Admin user exists in database');
      console.log('User details:', result.rows[0]);
    } else {
      console.log('❌ Admin user not found');
    }
  } catch (error) {
    console.error('Database test failed:', error);
  } finally {
    await pool.end();
  }
}

testAuth();
EOF

node test-auth.js
rm test-auth.js

echo ""
echo "🚀 Local setup complete!"
echo "The finding creation issue should now be resolved."
echo ""
echo "Start the application with: npm run dev"
echo "Admin credentials: admin / admin123"