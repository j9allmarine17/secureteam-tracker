#!/bin/bash

echo "Setting up OpenVAS admin user and testing connection..."

# Create admin user with direct gvmd commands
echo "Creating admin user..."

# Try to create admin user using different methods
sudo -u _gvm gvmd --create-user=admin --password=admin123 2>/dev/null || \
sudo -u _gvm gvmd --user=admin --new-password=admin123 2>/dev/null || \
echo "User creation may have failed or user already exists"

# Test connection with different credential combinations
echo "Testing GMP connections..."

# Test 1: admin/admin123
if timeout 5 gvm-cli --gmp-username admin --gmp-password admin123 socket --xml "<get_version/>" 2>/dev/null | grep -q "get_version_response"; then
    echo "SUCCESS: Connected with admin/admin123"
    gvm-cli --gmp-username admin --gmp-password admin123 socket --xml "<get_version/>"
    exit 0
fi

# Test 2: admin/admin
if timeout 5 gvm-cli --gmp-username admin --gmp-password admin socket --xml "<get_version/>" 2>/dev/null | grep -q "get_version_response"; then
    echo "SUCCESS: Connected with admin/admin"
    gvm-cli --gmp-username admin --gmp-password admin socket --xml "<get_version/>"
    exit 0
fi

# Test 3: Check if there are existing users
echo "Checking existing users..."
sudo -u _gvm gvmd --get-users 2>/dev/null || echo "Cannot list users"

# Test 4: Try with empty password
if timeout 5 gvm-cli --gmp-username admin socket --xml "<get_version/>" 2>/dev/null | grep -q "get_version_response"; then
    echo "SUCCESS: Connected with admin (no password)"
    exit 0
fi

echo "All authentication methods failed. May need manual user creation."
echo "Current gvmd status:"
ps aux | grep gvmd | grep -v grep

exit 1