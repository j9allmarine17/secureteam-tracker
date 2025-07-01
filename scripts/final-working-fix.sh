#!/bin/bash

# Working Fix for 502 Error - Development mode with production database

echo "Starting RedTeam Platform..."

# Kill existing processes
sudo pkill -f "tsx.*server" 2>/dev/null || true
sudo pkill -f "node.*server" 2>/dev/null || true

# Start PostgreSQL
sudo systemctl start postgresql

# Setup database with correct syntax
sudo -u postgres psql << 'EOF'
SELECT 'CREATE DATABASE redteam_collab' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'redteam_collab')\gexec
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'redteam_user') THEN
      CREATE USER redteam_user WITH PASSWORD 'redteam_secure_2024';
   END IF;
END
$$;
GRANT ALL PRIVILEGES ON DATABASE redteam_collab TO redteam_user;
ALTER USER redteam_user CREATEDB;
\q
EOF

# Create working environment file
cat > .env << 'EOF'
NODE_ENV=development
DATABASE_URL=postgresql://redteam_user:redteam_secure_2024@localhost:5432/redteam_collab
SESSION_SECRET=production-secret-key-ultra-secure
PORT=5000
SERVER_HOST=10.0.2.8
EOF

# Initialize database schema
npm run db:push

# Create admin user if needed
node scripts/create-admin.js

echo "Starting application in background..."
nohup npm run dev > /tmp/redteam.log 2>&1 &

# Wait for startup
sleep 15

# Check if running
if pgrep -f "tsx.*server" > /dev/null; then
    echo "Application running (PID: $(pgrep -f "tsx.*server"))"
    
    # Test connection with retries
    for i in {1..5}; do
        if curl -s -m 3 http://localhost:5000 > /dev/null; then
            echo "Server responding on port 5000"
            echo "Platform accessible at: https://10.0.2.8"
            echo "Login: admin / admin123"
            
            # Restart nginx to clear any issues
            sudo systemctl restart nginx
            exit 0
        fi
        echo "Waiting for server... ($i/5)"
        sleep 3
    done
    
    echo "Server not responding after 15 seconds"
    echo "Recent logs:"
    tail -10 /tmp/redteam.log
else
    echo "Application failed to start"
    echo "Full error log:"
    cat /tmp/redteam.log
fi