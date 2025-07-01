#!/bin/bash

echo "=== OpenVAS Integration Test ==="
echo "Testing connection to running gvmd service..."

# Check if gvm-cli is available
if ! command -v gvm-cli &> /dev/null; then
    echo "❌ gvm-cli not found. Install with: sudo apt install gvm-tools"
    exit 1
fi

echo "✓ gvm-cli is available"

# Test gvmd service status
echo "Checking gvmd service status..."
sudo systemctl is-active gvmd.service

# Test different connection methods
echo ""
echo "Testing OpenVAS connections..."

echo "1. Testing Unix socket connection..."
if gvm-cli --gmp-username admin --gmp-password admin socket --xml "<get_version/>" 2>/dev/null; then
    echo "✓ Unix socket connection successful"
    OPENVAS_WORKING=true
else
    echo "❌ Unix socket failed"
fi

echo "2. Testing with admin123 password..."
if gvm-cli --gmp-username admin --gmp-password admin123 socket --xml "<get_version/>" 2>/dev/null; then
    echo "✓ Socket connection with admin123 successful"
    OPENVAS_WORKING=true
else
    echo "❌ Socket with admin123 failed"
fi

echo "3. Testing TLS connection..."
if gvm-cli --gmp-username admin --gmp-password admin tls --hostname 127.0.0.1 --port 9390 --xml "<get_version/>" 2>/dev/null; then
    echo "✓ TLS connection successful"
    OPENVAS_WORKING=true
else
    echo "❌ TLS connection failed"
fi

# Check if any method worked
if [ "$OPENVAS_WORKING" = true ]; then
    echo ""
    echo "🎉 OpenVAS integration is ready!"
    echo "SecureTeam Tracker can now perform real vulnerability scans."
else
    echo ""
    echo "⚠️  OpenVAS requires configuration:"
    echo "1. Reset admin password: sudo gvmd --user=admin --new-password=admin123"
    echo "2. Enable TCP listener: sudo systemctl edit gvmd.service"
    echo "3. Add: ExecStart=/usr/sbin/gvmd --listen=127.0.0.1 --port=9390 --osp-vt-update=/run/ospd/ospd.sock"
    echo "4. Restart service: sudo systemctl restart gvmd"
fi

echo ""
echo "Current gvmd process info:"
ps aux | grep gvmd | grep -v grep