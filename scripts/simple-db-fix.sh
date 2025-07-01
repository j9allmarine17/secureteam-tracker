#!/bin/bash

# Simple database fix - use postgres user directly

echo "Fixing database authentication with postgres user..."

# Stop application
pkill -f "tsx.*server" 2>/dev/null || true

# Use postgres user directly (more reliable)
cat > .env << 'EOF'
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password123@localhost:5432/redteam_collab
SESSION_SECRET=production-secret-key-ultra-secure
PORT=5000
SERVER_HOST=10.0.2.8
EOF

# Ensure database exists with postgres user
sudo -u postgres createdb redteam_collab 2>/dev/null || echo "Database already exists"

# Push schema
npm run db:push

# Create admin user
node scripts/create-admin.js

# Start application
nohup npm run dev > /tmp/redteam.log 2>&1 &

sleep 8

echo "Database fixed. Try logging in with admin / admin123"