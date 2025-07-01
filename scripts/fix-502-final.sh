#!/bin/bash

# Final 502 Fix - Direct approach using Node.js without tsx loader issues

echo "Fixing 502 Bad Gateway - Final Solution"

# Kill any existing processes
sudo pkill -f "tsx.*server" 2>/dev/null || true
sudo pkill -f "node.*server" 2>/dev/null || true

# Start PostgreSQL
sudo systemctl start postgresql

# Create the environment file with correct database credentials
cat > .env.production << 'EOF'
NODE_ENV=production
DATABASE_URL=postgresql://redteam_user:redteam_secure_2024@localhost:5432/redteam_collab
SESSION_SECRET=super-secret-session-key-for-production-change-this
PORT=5000
SERVER_HOST=10.0.2.8
EOF

# Install tsx as a dependency (not globally)
npm install tsx

# Start the application using the CommonJS wrapper
echo "Starting application..."
NODE_ENV=production nohup node server/index.js > /tmp/redteam-app.log 2>&1 &

# Wait for startup
sleep 8

# Check if process is running
if pgrep -f "node.*server" > /dev/null; then
    echo "Application process running (PID: $(pgrep -f "node.*server"))"
    
    # Test if port 5000 is listening
    if netstat -tln | grep -q ":5000 "; then
        echo "Port 5000 is listening"
        
        # Test HTTP response
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 2>/dev/null || echo "000")
        if [[ "$HTTP_CODE" =~ ^[2-4][0-9][0-9]$ ]]; then
            echo "Server responding with code $HTTP_CODE"
            echo "502 error should be fixed!"
            echo "Access at: https://10.0.2.8"
        else
            echo "Server not responding properly (code: $HTTP_CODE)"
            echo "Check logs:"
            tail -10 /tmp/redteam-app.log
        fi
    else
        echo "Port 5000 not listening"
        echo "Application logs:"
        tail -20 /tmp/redteam-app.log
    fi
else
    echo "Application process not running"
    echo "Startup errors:"
    cat /tmp/redteam-app.log
fi

# Restart nginx to ensure clean state
sudo systemctl restart nginx