#!/bin/bash

echo "RedTeam Collab - Ubuntu Server Setup"
echo "===================================="

# Install Node.js 20 if not present (required for import.meta.dirname)
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1 | cut -d'v' -f2) -lt 20 ]]; then
    echo "Installing Node.js 20 (required for Vite compatibility)..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "✓ Node.js $(node -v) installed"
else
    echo "✓ Node.js $(node -v) already installed"
fi

# Install PostgreSQL if not present
if ! command -v psql &> /dev/null; then
    echo "Installing PostgreSQL..."
    sudo apt update
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi

# Start PostgreSQL service
sudo systemctl start postgresql

# Set up PostgreSQL user and database
sudo -u postgres psql << EOF
ALTER USER postgres PASSWORD 'password123';
DROP DATABASE IF EXISTS redteam_collab;
CREATE DATABASE redteam_collab;
\q
EOF

# Create .env file with correct path
cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres:password123@localhost:5432/redteam_collab
SESSION_SECRET=redteam-collab-secure-session-key-for-ubuntu-production
NODE_ENV=development
PORT=5000
EOF

echo "✓ Environment file created"

# Install npm dependencies
npm install

# Initialize database with proper schema
node scripts/setup-db.mjs

echo "✓ Database initialized with admin user"

# Test database connection
node -e "
import { Pool } from 'pg';
const pool = new Pool({
  connectionString: 'postgresql://postgres:password123@localhost:5432/redteam_collab',
  ssl: false
});
pool.query('SELECT COUNT(*) FROM users').then(result => {
  console.log('✓ Database connection successful, users:', result.rows[0].count);
  process.exit(0);
}).catch(err => {
  console.error('❌ Database test failed:', err.message);
  process.exit(1);
});
"

echo ""
echo "🚀 Ubuntu server setup complete!"
echo ""
echo "To start the application:"
echo "  npm run dev"
echo ""
echo "Access the application at: http://localhost:5000"
echo "Admin credentials: admin / admin123"
echo ""
echo "For remote access, configure firewall:"
echo "  sudo ufw allow 5000"