#!/bin/bash

# Simple Production Start - Direct Node.js approach
# Avoids tsx loader issues by running development server in production mode

echo "Starting RedTeam Platform..."

# Kill existing processes
pkill -f "tsx.*server" 2>/dev/null || true
pkill -f "node.*server" 2>/dev/null || true

# Start PostgreSQL
sudo systemctl start postgresql

# Set production environment and start using npm
export NODE_ENV=production
export DATABASE_URL="postgresql://redteam_user:redteam_secure_2024@localhost:5432/redteam_collab"

# Start the application using npm dev script but with production env
echo "Starting application with npm..."
nohup npm run dev > /tmp/redteam-app.log 2>&1 &

# Wait for startup
sleep 5

# Check if running
if pgrep -f "tsx.*server" > /dev/null; then
    echo "✅ Application started"
    echo "PID: $(pgrep -f "tsx.*server")"
    
    # Test connection
    sleep 2
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 | grep -q "200\|401\|404"; then
        echo "✅ Server responding on port 5000"
        echo "Access at: https://10.0.2.8"
    else
        echo "❌ Server not responding"
        echo "Last few log lines:"
        tail -5 /tmp/redteam-app.log
    fi
else
    echo "❌ Failed to start"
    echo "Full log:"
    cat /tmp/redteam-app.log
fi