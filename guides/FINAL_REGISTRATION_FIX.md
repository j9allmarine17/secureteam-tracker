# Final Registration Fix for Production Server

## Root Cause
Your production server logs show `/api/register` returning 200 status but serving HTML instead of JSON. This is a middleware ordering issue where Vite development middleware intercepts API routes.

## Immediate Solution

On your production server, update the systemd service to use production mode with the built application:

1. **Stop the current service:**
```bash
sudo systemctl stop redteam-collab
```

2. **Build the application (run this in your project directory):**
```bash
cd /home/jamesga/Complete\ SecureTeamTracker
npm run build
```

3. **Update systemd service for production mode:**
```bash
sudo tee /etc/systemd/system/redteam-collab.service > /dev/null << 'EOF'
[Unit]
Description=RedTeam Collaboration Platform
After=network.target

[Service]
Type=simple
User=jamesga
WorkingDirectory=/home/jamesga/Complete SecureTeamTracker
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
```

4. **Start the service:**
```bash
sudo systemctl daemon-reload
sudo systemctl start redteam-collab
sudo systemctl status redteam-collab
```

## Alternative Quick Fix

If the build fails, use this alternative approach:

1. **Create a fixed startup script:**
```bash
cat > /home/jamesga/Complete\ SecureTeamTracker/start-fixed.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
export NODE_ENV=production
export PORT=5000
exec /usr/bin/node --import tsx/esm server/index.ts
EOF

chmod +x /home/jamesga/Complete\ SecureTeamTracker/start-fixed.sh
```

2. **Update systemd to use the fixed script:**
```bash
sudo tee /etc/systemd/system/redteam-collab.service > /dev/null << 'EOF'
[Unit]
Description=RedTeam Collaboration Platform
After=network.target

[Service]
Type=simple
User=jamesga
WorkingDirectory=/home/jamesga/Complete SecureTeamTracker
ExecStart=/home/jamesga/Complete SecureTeamTracker/start-fixed.sh
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
```

## Verification

After applying the fix:

1. **Check API endpoints return JSON:**
```bash
curl -X POST http://localhost:5000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123","firstName":"Test","lastName":"User","email":"test@example.com"}'
```

Should return JSON, not HTML.

2. **Check service logs:**
```bash
sudo journalctl -u redteam-collab -f
```

Should show proper API request handling without HTML responses.

## Why This Fixes It

- **Production mode** eliminates Vite middleware conflicts
- **Built application** has proper static file serving without route conflicts
- **API routes** are handled correctly before static file middleware

Your registration error will be resolved once the service runs in true production mode without development middleware interference.