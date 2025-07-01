#!/bin/bash

echo "RedTeam Collab - Local Environment Setup"
echo "========================================"

# Create local .env file with PostgreSQL connection
cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres:password123@localhost:5432/redteam_collab
SESSION_SECRET=redteam-collab-secure-session-key-change-in-production
NODE_ENV=development
PORT=5000
EOF

echo "✓ Created .env file for local PostgreSQL"

# Ensure PostgreSQL is running
if ! pgrep -x "postgres" > /dev/null; then
    echo "Starting PostgreSQL..."
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    echo "✓ PostgreSQL started"
else
    echo "✓ PostgreSQL already running"
fi

# Test database connection
if psql postgresql://postgres:password123@localhost:5432/redteam_collab -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✓ Database connection successful"
else
    echo "❌ Database connection failed"
    echo "Ensure PostgreSQL is running and database exists:"
    echo "  sudo systemctl start postgresql"
    echo "  sudo -u postgres createdb redteam_collab"
    exit 1
fi

# Initialize database and create admin user
echo "Setting up database tables and admin user..."
node scripts/fix-local-auth.js

echo ""
echo "🚀 Setup complete! Start the application with:"
echo "   npm run dev"
echo ""
echo "Login credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo "   URL: http://localhost:5000"