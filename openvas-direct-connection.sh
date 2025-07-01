#!/bin/bash

echo "Creating direct OpenVAS GMP connection..."

# Test if Unix socket exists and is accessible
SOCKET_PATH="/run/gvmd/gvmd.sock"
if [ -S "$SOCKET_PATH" ]; then
    echo "Found GMP socket at $SOCKET_PATH"
    
    # Test socket permissions
    if [ -r "$SOCKET_PATH" ] && [ -w "$SOCKET_PATH" ]; then
        echo "Socket is accessible"
        
        # Test direct connection with admin user
        echo "Testing admin credentials..."
        
        # Try default admin password
        if gvm-cli --gmp-username admin --gmp-password admin socket --xml "<get_version/>" 2>/dev/null | grep -q "get_version_response"; then
            echo "SUCCESS: Connected with admin/admin"
            exit 0
        fi
        
        # Try admin123 password
        if gvm-cli --gmp-username admin --gmp-password admin123 socket --xml "<get_version/>" 2>/dev/null | grep -q "get_version_response"; then
            echo "SUCCESS: Connected with admin/admin123"
            exit 0
        fi
        
        echo "Socket accessible but authentication failed"
    else
        echo "Socket found but not accessible - permission issue"
        echo "Current user: $(whoami)"
        echo "Socket permissions: $(ls -la $SOCKET_PATH)"
    fi
else
    echo "GMP socket not found at $SOCKET_PATH"
    echo "Checking for alternative socket locations..."
    find /var/run /run /tmp -name "*gvm*" -type s 2>/dev/null || echo "No GMP sockets found"
fi

# Check if gvmd is listening on any network interfaces
echo ""
echo "Checking network listeners..."
netstat -tlnp 2>/dev/null | grep gvmd || echo "gvmd not listening on network interfaces"

echo ""
echo "Current gvmd process:"
ps aux | grep gvmd | grep -v grep

exit 1