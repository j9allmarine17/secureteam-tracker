# Ubuntu Server Deployment Guide - Local HTTPS Setup

## Prerequisites
- Ubuntu Server 20.04+ 
- Local network access to server IP
- PostgreSQL installed and running
- Node.js 18+ installed

## 1. SSL Certificate Setup (Self-Signed for Local Use)

### Generate Self-Signed Certificate
```bash
# Create SSL directory
sudo mkdir -p /etc/ssl/redteam-collab

# Generate self-signed certificate (valid for 365 days)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/redteam-collab/server.key \
    -out /etc/ssl/redteam-collab/server.crt \
    -subj "/C=US/ST=Local/L=Local/O=RedTeam/OU=Security/CN=YOUR_SERVER_IP"

# Set proper permissions
sudo chmod 600 /etc/ssl/redteam-collab/server.key
sudo chmod 644 /etc/ssl/redteam-collab/server.crt
```

Replace `YOUR_SERVER_IP` with your actual server IP address (e.g., 192.168.1.100).

## 2. Nginx Reverse Proxy Setup

```bash
# Install Nginx
sudo apt install nginx

# Create configuration file
sudo nano /etc/nginx/sites-available/redteam-collab
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name YOUR_SERVER_IP _;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name YOUR_SERVER_IP _;

    # SSL Configuration (Self-signed certificate)
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
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket proxy for chat
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/redteam-collab /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 3. Environment Configuration

Create production environment file:
```bash
cp .env.example .env.production
```

Update `.env.production`:
```env
NODE_ENV=production
DATABASE_URL=postgresql://redteam_user:your_secure_password@localhost:5432/redteam_collab
SESSION_SECRET=your-very-long-random-session-secret-here
PORT=5000
SERVER_HOST=YOUR_SERVER_IP
```

## 4. PM2 Process Manager Setup

```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
```

## 5. Database Setup

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE redteam_collab;
CREATE USER redteam_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE redteam_collab TO redteam_user;
\q

# Update your DATABASE_URL in .env.production
```

## 6. Firewall Configuration

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Check status
sudo ufw status
```

## 7. Application Deployment

```bash
# Install dependencies
npm install --production

# Build the application
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

## 8. Certificate Management (Self-Signed)

For self-signed certificates, renewal is only needed if they expire (365 days). To renew:

```bash
# Regenerate certificate when needed
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/redteam-collab/server.key \
    -out /etc/ssl/redteam-collab/server.crt \
    -subj "/C=US/ST=Local/L=Local/O=RedTeam/OU=Security/CN=YOUR_SERVER_IP"

# Restart Nginx to use new certificate
sudo systemctl restart nginx
```

## Security Considerations

1. **Database Security**: Use strong passwords and limit database access
2. **Session Security**: Use a strong SESSION_SECRET (32+ characters)
3. **Firewall**: Only open necessary ports
4. **Updates**: Keep system and dependencies updated
5. **Backups**: Regular database backups
6. **Monitoring**: Set up log monitoring and alerts

## Troubleshooting

### Check application logs:
```bash
pm2 logs redteam-collab
```

### Check Nginx logs:
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Check SSL certificate:
```bash
openssl x509 -in /etc/letsencrypt/live/your-domain.com/fullchain.pem -text -noout
```