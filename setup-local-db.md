# Local Database Setup Guide

## Quick Setup with Docker (Recommended)

1. **Start PostgreSQL with Docker Compose:**
   ```bash
   docker-compose up -d postgres
   ```

2. **Create your environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Update your `.env` file with local database URL:**
   ```
   DATABASE_URL=postgresql://postgres:password123@localhost:5432/redteam_collab
   SESSION_SECRET=your-super-secret-session-key-change-this-in-production
   ```

4. **Run database migrations:**
   ```bash
   npm run db:push
   ```

5. **Start the application:**
   ```bash
   npm run dev
   ```

## Manual PostgreSQL Installation

### On Ubuntu/Debian:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo -u postgres createdb redteam_collab
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'password123';"
```

### On macOS (with Homebrew):
```bash
brew install postgresql
brew services start postgresql
createdb redteam_collab
psql -d postgres -c "ALTER USER $(whoami) PASSWORD 'password123';"
```

### On Windows:
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Install with default settings
3. Create database named `redteam_collab`
4. Set password for postgres user to `password123`

## Database URL Formats

**Local PostgreSQL:**
```
DATABASE_URL=postgresql://postgres:password123@localhost:5432/redteam_collab
```

**Local with custom user:**
```
DATABASE_URL=postgresql://username:password@localhost:5432/redteam_collab
```

**Remote PostgreSQL:**
```
DATABASE_URL=postgresql://user:pass@host:port/database?sslmode=require
```

## Initial Admin User

After setup, the system will create a default admin user:
- Username: `admin`
- Password: `admin123`
- Role: `admin`

## Troubleshooting

**Connection refused:**
- Ensure PostgreSQL is running: `sudo systemctl status postgresql`
- Check port 5432 is not blocked by firewall

**Authentication failed:**
- Verify username/password in DATABASE_URL
- Check PostgreSQL user permissions

**Database doesn't exist:**
- Create database: `createdb redteam_collab`
- Or connect to PostgreSQL and run: `CREATE DATABASE redteam_collab;`