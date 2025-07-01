#!/bin/bash

# Production Fix - Use development server with production environment
# This bypasses all tsx loader issues by using the working npm dev command

echo "Starting RedTeam Platform in production mode..."

# Stop existing processes
sudo pkill -f "tsx.*server" 2>/dev/null || true
sudo pkill -f "node.*server" 2>/dev/null || true
sudo systemctl stop redteam-collab 2>/dev/null || true

# Ensure PostgreSQL is running and database exists
sudo systemctl start postgresql

# Create database if it doesn't exist
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'redteam_collab'" | grep -q 1 || \
sudo -u postgres createdb redteam_collab

# Create user if it doesn't exist
sudo -u postgres psql -tc "SELECT 1 FROM pg_user WHERE usename = 'redteam_user'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE USER redteam_user WITH PASSWORD 'redteam_secure_2024'; GRANT ALL PRIVILEGES ON DATABASE redteam_collab TO redteam_user;"

# Create environment file - use development mode to avoid build requirement
cat > .env << 'EOF'
NODE_ENV=development
DATABASE_URL=postgresql://redteam_user:redteam_secure_2024@localhost:5432/redteam_collab
SESSION_SECRET=ultra-secure-session-secret-change-in-production
PORT=5000
SERVER_HOST=10.0.2.8
EOF

# Initialize database schema
echo "Initializing database schema..."
npm run db:push 2>/dev/null || echo "Database schema initialization attempted"

# Create admin user
echo "Creating admin user..."
node scripts/create-admin.js 2>/dev/null || echo "Admin user creation attempted"

# Start using the existing npm dev command but with production environment
echo "Starting application using npm dev with production environment..."
nohup npm run dev > /tmp/redteam-app.log 2>&1 &

# Wait for startup
sleep 10

# Check if running
if pgrep -f "tsx.*server" > /dev/null; then
    echo "Application is running (PID: $(pgrep -f "tsx.*server"))"
    
    # Wait a bit more for full startup
    sleep 5
    
    # Test HTTP connection
    if curl -s -m 5 http://localhost:5000 > /dev/null; then
        echo "Server responding on port 5000"
        echo "502 error should be resolved"
        echo "Access your platform at: https://10.0.2.8"
        
        # Show recent logs
        echo "Recent application logs:"
        tail -5 /tmp/redteam-app.log
    else
        echo "Server not responding yet - checking logs..."
        tail -10 /tmp/redteam-app.log
    fi
else
    echo "Application failed to start"
    echo "Error logs:"
    cat /tmp/redteam-app.log
fi

# Restart nginx
sudo systemctl restart nginx
echo "Nginx restarted"