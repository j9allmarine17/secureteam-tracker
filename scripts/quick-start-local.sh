#!/bin/bash

# Quick Start Script for Local Ubuntu Server
# This script helps get the RedTeam platform running with HTTPS

set -e

SERVER_IP="10.0.2.8"  # Your server IP
DB_PASSWORD="redteam_secure_2024"

echo "🚀 Quick Start - RedTeam Collaboration Platform"
echo "Server IP: $SERVER_IP"
echo "==============================================="

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "❌ Don't run as root. Use: sudo ./quick-start-local.sh"
   exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
sudo apt update
sudo apt install -y nginx postgresql postgresql-contrib openssl nodejs npm curl

# Setup PostgreSQL
echo "🗄️ Setting up database..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS redteam_collab;
DROP USER IF EXISTS redteam_user;
CREATE DATABASE redteam_collab;
CREATE USER redteam_user WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE redteam_collab TO redteam_user;
ALTER USER redteam_user CREATEDB;
\q
EOF

# Generate SSL certificate
echo "🔐 Creating SSL certificate..."
sudo mkdir -p /etc/ssl/redteam-collab
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/redteam-collab/server.key \
    -out /etc/ssl/redteam-collab/server.crt \
    -subj "/C=US/ST=Local/L=Local/O=RedTeam/OU=Security/CN=$SERVER_IP"

sudo chmod 600 /etc/ssl/redteam-collab/server.key
sudo chmod 644 /etc/ssl/redteam-collab/server.crt

# Create environment file
echo "⚙️ Creating environment configuration..."
cat > .env.production << EOF
NODE_ENV=production
DATABASE_URL=postgresql://redteam_user:$DB_PASSWORD@localhost:5432/redteam_collab
SESSION_SECRET=$(openssl rand -base64 32)
PORT=5000
SERVER_HOST=$SERVER_IP
EOF

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Initialize database tables
echo "🗄️ Initializing database..."
npm run db:push

# Create admin user
echo "👤 Creating admin user..."
node scripts/create-admin.js

# Configure Nginx
echo "🌐 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/redteam-collab > /dev/null << EOF
server {
    listen 80;
    server_name $SERVER_IP _;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $SERVER_IP _;

    ssl_certificate /etc/ssl/redteam-collab/server.crt;
    ssl_certificate_key /etc/ssl/redteam-collab/server.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    location /ws {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/redteam-collab /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx

# Create systemd service
echo "🔧 Creating system service..."
sudo tee /etc/systemd/system/redteam-collab.service > /dev/null << EOF
[Unit]
Description=RedTeam Collaboration Platform
After=network.target postgresql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$PWD
Environment=NODE_ENV=production
EnvironmentFile=$PWD/.env.production
ExecStart=/usr/bin/npx tsx server/index.ts
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Start services
sudo systemctl daemon-reload
sudo systemctl enable redteam-collab
sudo systemctl start redteam-collab

# Configure firewall
echo "🔥 Configuring firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

echo ""
echo "✅ Setup Complete!"
echo "==================="
echo "🌐 Access your platform at: https://$SERVER_IP"
echo "👤 Admin credentials: admin / admin123"
echo ""
echo "📊 Status Commands:"
echo "   sudo systemctl status redteam-collab"
echo "   sudo systemctl status nginx"
echo "   sudo journalctl -u redteam-collab -f"
echo ""
echo "🔧 Troubleshooting:"
echo "   ./scripts/diagnose-502.sh"
echo "   sudo systemctl restart redteam-collab"
echo "   sudo systemctl restart nginx"