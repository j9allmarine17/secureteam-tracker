#!/bin/bash

# SecureTeam Tracker Service Setup Script
# Run this script to automatically configure the application as a Ubuntu service

set -e  # Exit on any error

echo "🔧 Setting up SecureTeam Tracker as a system service..."

# Check if running as non-root user
if [ "$EUID" -eq 0 ]; then
    echo "❌ Please run this script as a regular user (ubuntu), not as root"
    echo "   The script will prompt for sudo when needed"
    exit 1
fi

# Get current directory
APP_DIR=$(pwd)
USER=$(whoami)

echo "📁 Application directory: $APP_DIR"
echo "👤 Running as user: $USER"

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "secureteam-tracker.service" ]; then
    echo "❌ Error: Please run this script from the SecureTeam Tracker root directory"
    echo "   Expected files: package.json, secureteam-tracker.service"
    exit 1
fi

# Update service file with correct paths
echo "📝 Configuring service file with current paths..."
# Escape spaces in the directory path for systemd
ESCAPED_APP_DIR=$(echo "$APP_DIR" | sed 's/ /\\ /g')
sed -i "s|WorkingDirectory=.*|WorkingDirectory=$ESCAPED_APP_DIR|g" secureteam-tracker.service
sed -i "s|EnvironmentFile=.*|EnvironmentFile=$ESCAPED_APP_DIR/.env|g" secureteam-tracker.service
sed -i "s|ReadWritePaths=.*|ReadWritePaths=$ESCAPED_APP_DIR|g" secureteam-tracker.service
sed -i "s|User=.*|User=$USER|g" secureteam-tracker.service
sed -i "s|Group=.*|Group=$USER|g" secureteam-tracker.service

# Build the application
echo "🔨 Building production version..."
npm ci
npm run build

# Test the build
echo "🧪 Testing production build..."
timeout 10s npm run start &
BUILD_PID=$!
sleep 5

if kill -0 $BUILD_PID 2>/dev/null; then
    echo "✅ Production build works correctly"
    kill $BUILD_PID 2>/dev/null || true
else
    echo "❌ Production build failed. Check the logs above."
    exit 1
fi

# Install the service
echo "🚀 Installing systemd service..."
sudo cp secureteam-tracker.service /etc/systemd/system/
sudo chmod 644 /etc/systemd/system/secureteam-tracker.service
sudo systemctl daemon-reload

# Enable and start the service
echo "▶️  Enabling and starting the service..."
sudo systemctl enable secureteam-tracker
sudo systemctl start secureteam-tracker

# Wait a moment for service to start
sleep 3

# Check service status
echo "📊 Checking service status..."
if sudo systemctl is-active --quiet secureteam-tracker; then
    echo "✅ Service is running successfully!"
    
    # Get the port from .env or default to 5000
    PORT=$(grep "^PORT=" .env 2>/dev/null | cut -d'=' -f2 || echo "5000")
    
    echo ""
    echo "🌐 Your SecureTeam Tracker is now running as a service!"
    echo "   - URL: http://localhost:$PORT"
    echo "   - Service: secureteam-tracker"
    echo "   - Status: Active and enabled for auto-start"
    echo ""
    echo "📋 Useful commands:"
    echo "   sudo systemctl status secureteam-tracker    # Check status"
    echo "   sudo systemctl restart secureteam-tracker   # Restart service"
    echo "   sudo journalctl -u secureteam-tracker -f   # View live logs"
    echo ""
    
    # Test the web interface
    if curl -s --max-time 5 http://localhost:$PORT > /dev/null; then
        echo "✅ Web interface is responding on port $PORT"
    else
        echo "⚠️  Web interface may not be responding yet (this is normal during startup)"
    fi
    
else
    echo "❌ Service failed to start. Checking logs..."
    sudo systemctl status secureteam-tracker --no-pager
    echo ""
    echo "📋 Troubleshooting commands:"
    echo "   sudo journalctl -u secureteam-tracker -n 20"
    echo "   sudo systemctl restart secureteam-tracker"
    exit 1
fi

echo ""
echo "✅ Setup complete! Your SecureTeam Tracker will now:"
echo "   - Start automatically when the server boots"
echo "   - Restart automatically if it crashes"
echo "   - Run with security hardening enabled"
echo ""
echo "📖 For more details, see SERVICE_SETUP_GUIDE.md"