# Local PostgreSQL Setup - Complete Guide

## Your Current Status ✓
- PostgreSQL database created: `redteam_collab`
- Collation issues fixed
- Password set for postgres user

## Complete the Setup

### 1. Start PostgreSQL Service
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Verify Database Connection
```bash
psql postgresql://postgres:password123@localhost:5432/redteam_collab -c "SELECT version();"
```

### 3. Create Admin User in Local Database
```bash
node scripts/create-admin.js
```

### 4. Configure Application Environment
Your `.env` file is already created with:
```
DATABASE_URL=postgresql://postgres:password123@localhost:5432/redteam_collab
SESSION_SECRET=redteam-collab-secure-session-key-change-in-production
NODE_ENV=development
PORT=5000
```

### 5. Test Application
```bash
npm run dev
```

## Production Deployment on Ubuntu Server

### System Requirements
- Ubuntu 20.04+ or Debian 11+
- PostgreSQL 13+
- Node.js 18+
- 2GB RAM minimum

### Production Setup
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres createdb redteam_collab
sudo -u postgres psql -c "CREATE USER redteam WITH PASSWORD 'secure_password_here';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE redteam_collab TO redteam;"

# Production environment
DATABASE_URL=postgresql://redteam:secure_password_here@localhost:5432/redteam_collab
SESSION_SECRET=generate-strong-random-key-for-production
NODE_ENV=production
PORT=3000
```

### Security Configuration
1. Change default passwords
2. Configure PostgreSQL authentication (pg_hba.conf)
3. Set up firewall rules
4. Enable SSL/TLS
5. Use process manager (PM2 or systemd)

## Default Admin Access
- Username: `admin`
- Password: `admin123`
- Role: `admin`

Change the admin password after first login in production.

## User Management Features
- Admin and Team Lead: Full user management access
- Analyst: Limited access, no team management
- Role-based navigation and permissions