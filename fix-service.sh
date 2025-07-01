#!/bin/bash

# Fix SecureTeam Tracker Service - Handle Directory Path with Spaces
set -e

echo "🔧 Fixing SecureTeam Tracker service configuration..."

# Stop the service if it's running
echo "⏹️  Stopping current service..."
sudo systemctl stop secureteam-tracker 2>/dev/null || true

# Update the service file
echo "📝 Updating service file..."
sudo cp secureteam-tracker.service /etc/systemd/system/
sudo chmod 644 /etc/systemd/system/secureteam-tracker.service

# Reload systemd
echo "🔄 Reloading systemd configuration..."
sudo systemctl daemon-reload

# Verify the directory exists and has correct permissions
APP_DIR="/home/jamesga/Complete SecureTeamTracker"
if [ ! -d "$APP_DIR" ]; then
    echo "❌ Error: Directory '$APP_DIR' does not exist"
    echo "   Please verify the correct path to your application"
    exit 1
fi

echo "📁 Checking directory permissions..."
ls -la "$APP_DIR" | head -5

# Test that we can access the directory as the target user
if [ ! -r "$APP_DIR/package.json" ]; then
    echo "❌ Error: Cannot read package.json in '$APP_DIR'"
    echo "   Please check file permissions"
    exit 1
fi

# Build the application if needed
echo "🔨 Building application..."
cd "$APP_DIR"
npm ci
npm run build

# Start and enable the service
echo "▶️  Starting service..."
sudo systemctl enable secureteam-tracker
sudo systemctl start secureteam-tracker

# Wait for service to start
sleep 5

# Check service status
echo "📊 Checking service status..."
if sudo systemctl is-active --quiet secureteam-tracker; then
    echo "✅ Service is now running successfully!"
    
    sudo systemctl status secureteam-tracker --no-pager -l
    
    echo ""
    echo "🌐 Service should be available at: http://localhost:5000"
    echo ""
    echo "📋 Useful commands:"
    echo "   sudo systemctl status secureteam-tracker"
    echo "   sudo journalctl -u secureteam-tracker -f"
    
else
    echo "❌ Service failed to start. Checking logs..."
    echo ""
    echo "🔍 Recent service logs:"
    sudo journalctl -u secureteam-tracker -n 20 --no-pager
    
    echo ""
    echo "🔍 Service status:"
    sudo systemctl status secureteam-tracker --no-pager -l
    
    exit 1
fi