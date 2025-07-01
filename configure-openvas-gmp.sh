#!/bin/bash

echo "Configuring OpenVAS GMP connection for SecureTeam Tracker..."

# Create admin user with known credentials
echo "Setting up admin credentials..."
sudo gvmd --create-user=admin --password=admin123 2>/dev/null || \
sudo gvmd --user=admin --new-password=admin123

# Check if socket exists, if not configure TCP listener
echo "Checking GMP socket availability..."
if [ ! -S /run/gvmd/gvmd.sock ]; then
    echo "Unix socket not available, configuring TCP listener..."
    
    # Create systemd override directory
    sudo mkdir -p /etc/systemd/system/gvmd.service.d/
    
    # Create override configuration
    sudo tee /etc/systemd/system/gvmd.service.d/override.conf > /dev/null << EOF
[Service]
ExecStart=
ExecStart=/usr/sbin/gvmd --listen=127.0.0.1 --port=9390 --osp-vt-update=/run/ospd/ospd.sock --listen-group=_gvm
EOF
    
    # Reload and restart service
    sudo systemctl daemon-reload
    sudo systemctl restart gvmd
    
    echo "Waiting for service to start..."
    sleep 5
fi

# Test connection
echo "Testing OpenVAS connection..."
if gvm-cli --gmp-username admin --gmp-password admin123 socket --xml "<get_version/>" 2>/dev/null; then
    echo "SUCCESS: Unix socket connection established"
    exit 0
elif gvm-cli --gmp-username admin --gmp-password admin123 tls --hostname 127.0.0.1 --port 9390 --xml "<get_version/>" 2>/dev/null; then
    echo "SUCCESS: TLS connection established"
    exit 0
else
    echo "Configuration complete. Manual verification may be needed."
    echo "Check service status: sudo systemctl status gvmd"
    exit 1
fi