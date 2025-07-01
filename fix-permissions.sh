#!/bin/bash

# Fix Directory Permissions for SecureTeam Tracker Service
set -e

echo "🔧 Fixing directory permissions for SecureTeam Tracker service..."

APP_DIR="/home/jamesga/Complete SecureTeamTracker"
USER="jamesga"

# Check if directory exists
if [ ! -d "$APP_DIR" ]; then
    echo "❌ Error: Directory '$APP_DIR' does not exist"
    echo "   Please verify the correct path"
    exit 1
fi

echo "📁 Working with directory: $APP_DIR"

# Stop the service
echo "⏹️  Stopping service..."
sudo systemctl stop secureteam-tracker 2>/dev/null || true

# Check current permissions
echo "🔍 Current directory permissions:"
ls -la "$APP_DIR" | head -5

echo "🔍 Current ownership:"
ls -ld "$APP_DIR"

# Fix ownership recursively
echo "👤 Setting correct ownership..."
sudo chown -R $USER:$USER "$APP_DIR"

# Set correct permissions
echo "🔒 Setting correct permissions..."
# Directory permissions: owner can read/write/execute, group can read/execute, others can read/execute
sudo find "$APP_DIR" -type d -exec chmod 755 {} \;
# File permissions: owner can read/write, group can read, others can read
sudo find "$APP_DIR" -type f -exec chmod 644 {} \;

# Make scripts executable
echo "⚡ Making scripts executable..."
sudo find "$APP_DIR" -name "*.sh" -exec chmod 755 {} \;

# Ensure .env file has proper permissions (readable by owner only for security)
if [ -f "$APP_DIR/.env" ]; then
    sudo chmod 600 "$APP_DIR/.env"
    sudo chown $USER:$USER "$APP_DIR/.env"
fi

# Create logs directory if needed
if [ ! -d "$APP_DIR/logs" ]; then
    sudo mkdir -p "$APP_DIR/logs"
    sudo chown $USER:$USER "$APP_DIR/logs"
    sudo chmod 755 "$APP_DIR/logs"
fi

# Verify permissions
echo "✅ Verifying permissions..."
echo "Directory ownership:"
ls -ld "$APP_DIR"

echo "Key files ownership:"
ls -la "$APP_DIR" | grep -E "(package\.json|\.env|node_modules)" || true

# Test directory access as the target user
echo "🧪 Testing directory access..."
if sudo -u $USER test -r "$APP_DIR/package.json"; then
    echo "✅ User $USER can read package.json"
else
    echo "❌ User $USER cannot read package.json"
    exit 1
fi

if sudo -u $USER test -w "$APP_DIR"; then
    echo "✅ User $USER has write access to directory"
else
    echo "❌ User $USER does not have write access to directory"
    exit 1
fi

# Update the service file to use absolute paths and proper user switching
echo "📝 Creating corrected service file..."
cat > secureteam-tracker.service << EOF
[Unit]
Description=SecureTeam Tracker - Red Team Collaboration Platform
Documentation=https://github.com/your-org/secureteam-tracker
After=network.target postgresql.service
Wants=network-online.target
StartLimitIntervalSec=300
StartLimitBurst=5

[Service]
Type=simple
User=$USER
Group=$USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=5000
Environment=HOME=/home/$USER
EnvironmentFile=$APP_DIR/.env
ExecStartPre=/usr/bin/npm ci --production
ExecStart=/usr/bin/npm run start
ExecReload=/bin/kill -HUP \$MAINPID
KillMode=mixed
KillSignal=SIGINT
TimeoutStartSec=60
TimeoutStopSec=30
RestartSec=10
Restart=on-failure
RestartPreventExitStatus=23

# Security settings (relaxed for directory access)
NoNewPrivileges=true
PrivateTmp=true

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

# Standard output and error
StandardOutput=journal
StandardError=journal
SyslogIdentifier=secureteam-tracker

[Install]
WantedBy=multi-user.target
EOF

# Install the corrected service file
echo "📦 Installing corrected service file..."
sudo cp secureteam-tracker.service /etc/systemd/system/
sudo chmod 644 /etc/systemd/system/secureteam-tracker.service

# Reload systemd
echo "🔄 Reloading systemd..."
sudo systemctl daemon-reload

# Test the service can access the directory
echo "🧪 Testing service configuration..."
if sudo systemd-analyze verify secureteam-tracker.service; then
    echo "✅ Service configuration is valid"
else
    echo "❌ Service configuration has errors"
    exit 1
fi

# Start the service
echo "▶️  Starting service..."
sudo systemctl enable secureteam-tracker
sudo systemctl start secureteam-tracker

# Wait and check status
sleep 5

if sudo systemctl is-active --quiet secureteam-tracker; then
    echo "✅ Service started successfully!"
    sudo systemctl status secureteam-tracker --no-pager --lines=10
    
    echo ""
    echo "🌐 Service is running on: http://localhost:5000"
    echo "📋 Management commands:"
    echo "   sudo systemctl status secureteam-tracker"
    echo "   sudo journalctl -u secureteam-tracker -f"
    
else
    echo "❌ Service failed to start. Checking logs..."
    sudo systemctl status secureteam-tracker --no-pager
    echo ""
    echo "Recent logs:"
    sudo journalctl -u secureteam-tracker -n 20 --no-pager
    exit 1
fi

echo ""
echo "✅ Permissions fixed and service is running!"