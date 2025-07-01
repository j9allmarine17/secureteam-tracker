#!/bin/bash

# Production Setup Script for RedTeam Collaboration Platform
# Run this script on your Ubuntu server to set up the production environment

set -e

echo "🔧 Setting up RedTeam Collaboration Platform for production..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root. Please run as a regular user with sudo privileges."
   exit 1
fi

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
print_status "Installing required packages..."
sudo apt install -y nginx postgresql postgresql-contrib ufw curl openssl

# Install Node.js 18.x
print_status "Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
print_status "Installing PM2 process manager..."
sudo npm install -g pm2

# Create application directory
APP_DIR="/opt/redteam-collab"
print_status "Creating application directory at $APP_DIR..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Create logs directory
mkdir -p logs

# Prompt for server IP or hostname
read -p "Enter your server IP address or hostname (e.g., 192.168.1.100 or redteam-server): " SERVER_HOST
if [[ -z "$SERVER_HOST" ]]; then
    print_error "Server IP address or hostname is required"
    exit 1
fi

# Prompt for database password
read -s -p "Enter a secure password for the database user: " DB_PASSWORD
echo
if [[ -z "$DB_PASSWORD" ]]; then
    print_error "Database password is required"
    exit 1
fi

# Generate session secret
SESSION_SECRET=$(openssl rand -base64 32)

# Setup PostgreSQL
print_status "Setting up PostgreSQL database..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE redteam_collab;
CREATE USER redteam_user WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE redteam_collab TO redteam_user;
ALTER USER redteam_user CREATEDB;
\q
EOF

# Generate self-signed SSL certificate
print_status "Generating self-signed SSL certificate..."
sudo mkdir -p /etc/ssl/redteam-collab
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/redteam-collab/server.key \
    -out /etc/ssl/redteam-collab/server.crt \
    -subj "/C=US/ST=Local/L=Local/O=RedTeam/OU=Security/CN=$SERVER_HOST"

# Set proper permissions
sudo chmod 600 /etc/ssl/redteam-collab/server.key
sudo chmod 644 /etc/ssl/redteam-collab/server.crt

# Create production environment file
print_status "Creating production environment configuration..."
cat > .env.production << EOF
NODE_ENV=production
DATABASE_URL=postgresql://redteam_user:$DB_PASSWORD@localhost:5432/redteam_collab
SESSION_SECRET=$SESSION_SECRET
PORT=5000
SERVER_HOST=$SERVER_HOST
EOF

# Set proper permissions on env file
chmod 600 .env.production

# Setup firewall
print_status "Configuring firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# Create Nginx configuration
print_status "Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/redteam-collab > /dev/null << EOF
server {
    listen 80;
    server_name $SERVER_HOST _;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $SERVER_HOST _;

    # SSL Configuration (self-signed certificate)
    ssl_certificate /etc/ssl/redteam-collab/server.crt;
    ssl_certificate_key /etc/ssl/redteam-collab/server.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:5000;
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

    # WebSocket proxy for real-time chat
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
    }

    # Static file serving with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://localhost:5000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/redteam-collab /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration and restart
print_status "Testing Nginx configuration..."
sudo nginx -t && sudo systemctl restart nginx

# Install application dependencies
print_status "Installing application dependencies..."
npm install --production

# Create systemd service for the application
print_status "Creating systemd service..."
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
ExecStart=/usr/bin/node --loader tsx server/index.ts
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=redteam-collab

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable redteam-collab
sudo systemctl start redteam-collab

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Setup log rotation
print_status "Setting up log rotation..."
sudo tee /etc/logrotate.d/redteam-collab > /dev/null << EOF
$PWD/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        sudo systemctl reload redteam-collab
    endscript
}
EOF

print_status "Production setup complete!"
echo
print_status "Application is running at: https://$SERVER_HOST"
print_status "Database: redteam_collab (user: redteam_user)"
print_status "SSL Certificate: Self-signed (located at /etc/ssl/redteam-collab/)"
echo
print_status "Useful commands:"
echo "  - Check application status: sudo systemctl status redteam-collab"
echo "  - View application logs: sudo journalctl -u redteam-collab -f"
echo "  - Restart application: sudo systemctl restart redteam-collab"
echo "  - Check Nginx status: sudo systemctl status nginx"
echo "  - View Nginx logs: sudo tail -f /var/log/nginx/error.log"
echo
print_warning "Remember to:"
echo "  1. Create an admin user using: node scripts/create-admin.js"
echo "  2. Configure your firewall to allow HTTPS traffic on port 443"
echo "  3. Set up regular database backups using: ./scripts/backup-database.sh"
echo "  4. Accept the self-signed certificate warning in browsers"
echo "  5. Team members should access via: https://$SERVER_HOST"
echo
print_status "Setup completed successfully!"