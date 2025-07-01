#!/bin/bash

# Quick Fix for 502 Error - Use npm dev with production config

# Stop processes
pkill -f "tsx.*server" 2>/dev/null || true

# Start PostgreSQL  
sudo systemctl start postgresql

# Setup database
sudo -u postgres psql << 'EOF'
CREATE DATABASE IF NOT EXISTS redteam_collab;
CREATE USER IF NOT EXISTS redteam_user WITH PASSWORD 'redteam_secure_2024';
GRANT ALL PRIVILEGES ON DATABASE redteam_collab TO redteam_user;
EOF

# Create environment
cat > .env << 'EOF'
NODE_ENV=production
DATABASE_URL=postgresql://redteam_user:redteam_secure_2024@localhost:5432/redteam_collab
SESSION_SECRET=production-secret-key-change-this
PORT=5000
EOF

# Start application
nohup npm run dev > /tmp/app.log 2>&1 &

sleep 5

if curl -s http://localhost:5000 > /dev/null; then
    echo "Application started successfully"
    echo "Access at: https://10.0.2.8"
    sudo systemctl restart nginx
else
    echo "Startup failed. Log:"
    tail /tmp/app.log
fi