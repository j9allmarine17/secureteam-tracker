#!/bin/bash

echo "Fixing OpenVAS authentication and database connection..."

# Fix PostgreSQL role issue first
echo "Creating PostgreSQL gvm user..."
sudo -u postgres createuser --createdb --no-superuser --no-createrole _gvm 2>/dev/null || echo "User _gvm may already exist"

# Grant database permissions
sudo -u postgres psql -c "ALTER USER _gvm CREATEDB;" 2>/dev/null || echo "Permission may already be set"

# Create admin user with proper database connection
echo "Creating OpenVAS admin user with proper database context..."
sudo -u _gvm gvmd --create-user=admin --password=admin123 2>/dev/null || \
sudo -u _gvm gvmd --user=admin --new-password=admin123 2>/dev/null || \
echo "User creation attempted"

# Test connection immediately
echo "Testing GMP connection..."
if timeout 10 gvm-cli --gmp-username admin --gmp-password admin123 socket --xml "<get_version/>" 2>/dev/null | grep -q "get_version_response"; then
    echo "SUCCESS: OpenVAS connection established!"
    echo "Getting version info:"
    gvm-cli --gmp-username admin --gmp-password admin123 socket --xml "<get_version/>"
    echo ""
    echo "Testing scan capabilities:"
    gvm-cli --gmp-username admin --gmp-password admin123 socket --xml "<get_configs/>" | head -10
    exit 0
else
    echo "Connection still failing, checking alternative methods..."
    
    # Try with different user context
    if timeout 10 sudo -u _gvm gvm-cli --gmp-username admin --gmp-password admin123 socket --xml "<get_version/>" 2>/dev/null | grep -q "get_version_response"; then
        echo "SUCCESS: Connection works with _gvm user context"
        exit 0
    fi
    
    echo "Authentication still failing. OpenVAS may need service restart or manual configuration."
    echo "Current socket permissions:"
    ls -la /run/gvmd/gvmd.sock 2>/dev/null || echo "Socket not found"
    exit 1
fi