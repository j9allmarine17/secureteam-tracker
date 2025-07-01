#!/bin/bash

# Fix 502 Bad Gateway Error
# This script addresses common causes of 502 errors

echo "🔧 Fixing 502 Bad Gateway Error..."

# Stop any existing processes
sudo systemctl stop redteam-collab 2>/dev/null || true
pkill -f "server/index.ts" 2>/dev/null || true

# Check if PostgreSQL is running
if ! systemctl is-active --quiet postgresql; then
    echo "Starting PostgreSQL..."
    sudo systemctl start postgresql
fi

# Install tsx globally if not present
if ! command -v tsx &> /dev/null; then
    echo "Installing tsx globally..."
    sudo npm install -g tsx
fi

# Build the application
echo "Building application..."
npm run build 2>/dev/null || echo "No build script found"

# Start the application in production mode
echo "Starting Node.js application..."
NODE_ENV=production nohup tsx server/index.ts > /tmp/redteam-app.log 2>&1 &

# Wait for app to start
sleep 5

# Check if app is running
if pgrep -f "server/index.ts" > /dev/null; then
    echo "✅ Application is running"
    echo "Process ID: $(pgrep -f "server/index.ts")"
else
    echo "❌ Application failed to start"
    echo "Check logs: tail -f /tmp/redteam-app.log"
    exit 1
fi

# Test local connection
if curl -s http://localhost:5000 > /dev/null; then
    echo "✅ Local connection works"
else
    echo "❌ Local connection failed"
    echo "Check application logs for errors"
    exit 1
fi

# Restart Nginx
echo "Restarting Nginx..."
sudo systemctl restart nginx

echo "✅ 502 error should be fixed!"
echo "Access your site at: https://10.0.2.8"