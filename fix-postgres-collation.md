# Fix PostgreSQL Collation Version Mismatch

## Quick Fix for Collation Error

Run these commands to fix the collation version mismatch:

```bash
# Connect to PostgreSQL as superuser
sudo -u postgres psql

# Fix template1 database
ALTER DATABASE template1 REFRESH COLLATION VERSION;

# Fix postgres database
ALTER DATABASE postgres REFRESH COLLATION VERSION;

# Exit PostgreSQL
\q

# Now create the database
sudo -u postgres createdb redteam_collab
```

## Alternative: Docker Setup (Recommended)

If you continue having issues with local PostgreSQL, use Docker instead:

```bash
# Start PostgreSQL with Docker
docker-compose up -d postgres

# Wait for container to be ready (about 10 seconds)
sleep 10

# Initialize the database
DATABASE_URL=postgresql://postgres:password123@localhost:5432/redteam_collab node scripts/init-db.js
```

## Alternative: Create Database with SQL

```bash
sudo -u postgres psql -c "
CREATE DATABASE redteam_collab 
WITH ENCODING='UTF8' 
LC_COLLATE='C' 
LC_CTYPE='C' 
TEMPLATE=template0;
"
```

This creates the database with a stable collation that won't have version mismatches.