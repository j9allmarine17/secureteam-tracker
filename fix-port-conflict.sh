#!/bin/bash

echo "Stopping existing redteam-collab service..."
sudo systemctl stop redteam-collab

echo "Checking for processes using port 5000..."
sudo lsof -ti:5000 | xargs -r sudo kill -9

echo "Waiting 3 seconds..."
sleep 3

echo "Updating systemd service to use direct Node command..."
sudo tee /etc/systemd/system/redteam-collab.service > /dev/null << 'EOF'
[Unit]
Description=RedTeam Collaboration Platform
After=network.target

[Service]
Type=simple
User=jamesga
WorkingDirectory=/home/jamesga/Complete SecureTeamTracker
ExecStart=/usr/bin/node --import tsx/esm server/index.ts
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

echo "Reloading systemd and starting service..."
sudo systemctl daemon-reload
sudo systemctl start redteam-collab

echo "Checking service status..."
sudo systemctl status redteam-collab