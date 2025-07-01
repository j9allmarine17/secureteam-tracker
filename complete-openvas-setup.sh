#!/bin/bash

echo "Completing OpenVAS GMP configuration..."

# Configure the systemd override
sudo tee /etc/systemd/system/gvmd.service.d/override.conf > /dev/null << 'EOF'
[Service]
ExecStart=
ExecStart=/usr/sbin/gvmd --listen=127.0.0.1 --port=9390 --osp-vt-update=/run/ospd/ospd.sock --listen-group=_gvm
EOF

echo "Created systemd override configuration"

# Reload systemd and restart gvmd
echo "Reloading systemd daemon..."
sudo systemctl daemon-reload

echo "Restarting gvmd service..."
sudo systemctl restart gvmd

echo "Waiting for service to start..."
sleep 10

# Check service status
echo "Checking service status..."
sudo systemctl status gvmd.service --no-pager -l

# Create/reset admin user
echo "Setting up admin credentials..."
sudo gvmd --create-user=admin --password=admin123 2>/dev/null || sudo gvmd --user=admin --new-password=admin123

# Test connections
echo ""
echo "Testing OpenVAS connections..."

echo "1. Testing Unix socket..."
if timeout 10 gvm-cli --gmp-username admin --gmp-password admin123 socket --xml "<get_version/>" 2>/dev/null | grep -q "get_version_response"; then
    echo "✓ Unix socket connection successful"
    CONNECTION_SUCCESS=true
fi

echo "2. Testing TLS connection..."
if timeout 10 gvm-cli --gmp-username admin --gmp-password admin123 tls --hostname 127.0.0.1 --port 9390 --xml "<get_version/>" 2>/dev/null | grep -q "get_version_response"; then
    echo "✓ TLS connection successful"
    CONNECTION_SUCCESS=true
fi

if [ "$CONNECTION_SUCCESS" = true ]; then
    echo ""
    echo "🎉 OpenVAS integration is now ready!"
    echo "SecureTeam Tracker can perform real vulnerability scans."
else
    echo ""
    echo "Connection still failing. Checking process details..."
    ps aux | grep gvmd | grep -v grep
    echo ""
    echo "Checking listening ports..."
    sudo netstat -tlnp | grep 9390 || echo "Port 9390 not listening"
fi