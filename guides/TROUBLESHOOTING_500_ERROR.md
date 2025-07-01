# Fix 500 Login Error - Local PostgreSQL

## Run This Command on Your Kali System

```bash
# Fix authentication and recreate admin user
DATABASE_URL=postgresql://postgres:password123@localhost:5432/redteam_collab node scripts/fix-local-auth.js
```

## Common 500 Error Causes & Solutions

### 1. PostgreSQL Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Start if not running
sudo systemctl start postgresql

# Test connection
psql postgresql://postgres:password123@localhost:5432/redteam_collab -c "SELECT version();"
```

### 2. Database Schema Mismatch
The error likely occurs because the local database schema differs from expected. Run:
```bash
node scripts/fix-local-auth.js
```
This recreates the admin user with correct schema mapping.

### 3. Session Store Issues
Clear corrupted sessions:
```bash
psql postgresql://postgres:password123@localhost:5432/redteam_collab -c "DELETE FROM sessions;"
```

### 4. Environment Variables
Ensure proper environment loading:
```bash
# Use the start script with explicit environment
export DATABASE_URL="postgresql://postgres:password123@localhost:5432/redteam_collab"
export SESSION_SECRET="redteam-collab-secure-session-key"
npm run dev
```

### 5. Check Server Logs
When starting the application, watch for these error patterns:
- Database connection errors
- Authentication strategy errors  
- Session creation errors
- Schema/column not found errors

### 6. Verify Admin User
After running fix script, confirm:
```bash
psql postgresql://postgres:password123@localhost:5432/redteam_collab -c "SELECT username, role FROM users WHERE username='admin';"
```

## Expected Working State
- PostgreSQL running on port 5432
- Database `redteam_collab` exists
- Admin user created with correct password hash
- Sessions table properly configured
- Application starts without database connection errors

## Login Credentials After Fix
- Username: `admin`
- Password: `admin123`
- Role: `admin`

The fix script addresses schema mismatches between expected column names (`firstName`/`lastName` vs `first_name`/`last_name`) and ensures proper password hashing.