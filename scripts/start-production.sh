#!/bin/bash

# Production Start Script - Simple approach without tsx
# This compiles TypeScript to JavaScript and runs it directly

echo "Starting RedTeam Collaboration Platform in production..."

# Stop existing processes
pkill -f "server/index" 2>/dev/null || true
sudo systemctl stop redteam-collab 2>/dev/null || true

# Ensure PostgreSQL is running
sudo systemctl start postgresql

# Install global TypeScript compiler if not present
if ! command -v tsc &> /dev/null; then
    echo "Installing TypeScript compiler..."
    sudo npm install -g typescript
fi

# Compile TypeScript to JavaScript
echo "Compiling TypeScript..."
npx tsc --project tsconfig.json --outDir dist --module commonjs --target es2020

# Start the compiled application
echo "Starting application..."
cd dist
NODE_ENV=production nohup node server/index.js > /tmp/redteam-app.log 2>&1 &
cd ..

# Wait for startup
sleep 3

# Check if running
if pgrep -f "node.*server/index.js" > /dev/null; then
    echo "✅ Application started successfully"
    echo "Process ID: $(pgrep -f "node.*server/index.js")"
    
    # Test local connection
    if curl -s http://localhost:5000 > /dev/null; then
        echo "✅ Application responding on port 5000"
    else
        echo "❌ Application not responding - check logs"
        tail -10 /tmp/redteam-app.log
    fi
else
    echo "❌ Failed to start application"
    echo "Error log:"
    cat /tmp/redteam-app.log
fi