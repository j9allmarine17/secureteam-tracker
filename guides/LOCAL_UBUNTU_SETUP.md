# Local Ubuntu Server Setup Guide

## Quick Setup

Run this single command to set up everything:

```bash
chmod +x setup-ubuntu.sh && ./setup-ubuntu.sh
```

This will:
1. Install dependencies
2. Create PostgreSQL database and user
3. Set up all required tables
4. Create admin user
5. Start the application

## Manual Setup (if automatic setup fails)

### 1. Fix PostgreSQL Authentication

If you get "password authentication failed" errors:

```bash
# Test database diagnosis
node scripts/diagnose-db.js

# Check PostgreSQL service
sudo systemctl status postgresql

# Reset postgres user password
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"

# Create database and user manually
sudo -u postgres createdb redteam_collab
sudo -u postgres psql -c "CREATE USER redteam_user WITH ENCRYPTED PASSWORD 'redteam_secure_2024';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE redteam_collab TO redteam_user;"
sudo -u postgres psql -c "ALTER USER redteam_user CREATEDB;"
```

### 2. Setup Application Schema

```bash
node scripts/fix-db-setup.js
```

### 3. Start Application

```bash
npm run dev
```

## Login Credentials

After setup is complete, log in with:
- Username: `admin`
- Password: `admin123`

## Troubleshooting

### ES Module Errors
All scripts are now ES module compatible.

### Database Connection Issues
1. Check if PostgreSQL is running: `sudo systemctl status postgresql`
2. Verify your .env file contains the correct DATABASE_URL
3. Run diagnosis script: `node scripts/diagnose-db.js`

### Port Issues
The application runs on port 5000 by default. Make sure this port is available or change it in your .env file.

## Environment Configuration

Your `.env` file should contain:
```
NODE_ENV=development
DATABASE_URL=postgresql://redteam_user:redteam_secure_2024@localhost:5432/redteam_collab
SESSION_SECRET=production-secret-key-ultra-secure
PORT=5000
SERVER_HOST=10.0.2.8
```

## Success Indicators

When setup is successful, you should see:
- "Database setup complete!"
- "Admin user created"
- "Express serving on port 5000"
- Login page accessible at your server IP:5000