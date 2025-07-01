#!/bin/bash

# 502 Bad Gateway Diagnostic Script
# This script helps diagnose connection issues between Nginx and Node.js

echo "🔍 Diagnosing 502 Bad Gateway Error..."
echo "=================================="

# Check if Node.js application is running
echo "1. Checking Node.js application status:"
if pgrep -f "server/index.ts" > /dev/null; then
    echo "✅ Node.js process is running"
    echo "   Process ID: $(pgrep -f "server/index.ts")"
else
    echo "❌ Node.js process is NOT running"
fi

# Check if port 5000 is listening
echo ""
echo "2. Checking if port 5000 is listening:"
if netstat -tlnp 2>/dev/null | grep ":5000 " > /dev/null; then
    echo "✅ Port 5000 is listening"
    netstat -tlnp | grep ":5000 "
else
    echo "❌ Port 5000 is NOT listening"
fi

# Test local connection to Node.js app
echo ""
echo "3. Testing local connection to Node.js app:"
if curl -s http://localhost:5000 > /dev/null; then
    echo "✅ Local connection to Node.js works"
else
    echo "❌ Cannot connect to Node.js locally"
fi

# Check Nginx status
echo ""
echo "4. Checking Nginx status:"
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx is NOT running"
fi

# Check Nginx configuration
echo ""
echo "5. Testing Nginx configuration:"
if nginx -t 2>/dev/null; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration has errors:"
    nginx -t
fi

# Check if Nginx site is enabled
echo ""
echo "6. Checking Nginx site configuration:"
if [ -f /etc/nginx/sites-enabled/redteam-collab ]; then
    echo "✅ RedTeam site is enabled"
else
    echo "❌ RedTeam site is NOT enabled"
fi

# Check SSL certificates
echo ""
echo "7. Checking SSL certificates:"
if [ -f /etc/ssl/redteam-collab/server.crt ] && [ -f /etc/ssl/redteam-collab/server.key ]; then
    echo "✅ SSL certificates exist"
    echo "   Certificate expires: $(openssl x509 -in /etc/ssl/redteam-collab/server.crt -noout -enddate)"
else
    echo "❌ SSL certificates are missing"
fi

# Check recent Nginx error logs
echo ""
echo "8. Recent Nginx error logs:"
if [ -f /var/log/nginx/error.log ]; then
    echo "Last 5 error log entries:"
    tail -5 /var/log/nginx/error.log
else
    echo "No Nginx error log found"
fi

# Check systemd service status if using systemd
echo ""
echo "9. Application service status:"
if systemctl list-units --type=service | grep -q redteam-collab; then
    systemctl status redteam-collab --no-pager -l
else
    echo "No systemd service found for redteam-collab"
fi

echo ""
echo "🔧 Common fixes for 502 errors:"
echo "1. Start Node.js app: npm run dev (or systemctl start redteam-collab)"
echo "2. Restart Nginx: sudo systemctl restart nginx"
echo "3. Check firewall: sudo ufw status"
echo "4. Verify database connection"
echo ""
echo "Run this to start the application manually:"
echo "NODE_ENV=production node --loader tsx server/index.ts"