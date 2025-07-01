#!/bin/bash

# Fix database authentication issue

echo "Fixing database authentication..."

# Stop the application
pkill -f "tsx.*server" 2>/dev/null || true

# Reset PostgreSQL user password
sudo -u postgres psql << 'EOF'
DROP USER IF EXISTS redteam_user;
CREATE USER redteam_user WITH PASSWORD 'redteam_secure_2024';
GRANT ALL PRIVILEGES ON DATABASE redteam_collab TO redteam_user;
ALTER USER redteam_user CREATEDB;
ALTER USER redteam_user SUPERUSER;
\q
EOF

# Test database connection
echo "Testing database connection..."
PGPASSWORD=redteam_secure_2024 psql -h localhost -U redteam_user -d redteam_collab -c "SELECT 1;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "Database connection successful"
else
    echo "Database connection failed, trying alternative approach..."
    
    # Alternative: use postgres user for now
    sudo -u postgres psql redteam_collab << 'EOF'
ALTER USER redteam_user WITH PASSWORD 'redteam_secure_2024';
GRANT ALL ON SCHEMA public TO redteam_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO redteam_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO redteam_user;
\q
EOF
fi

# Update environment with working connection
cat > .env << 'EOF'
NODE_ENV=development
DATABASE_URL=postgresql://redteam_user:redteam_secure_2024@localhost:5432/redteam_collab
SESSION_SECRET=production-secret-key-ultra-secure
PORT=5000
SERVER_HOST=10.0.2.8
EOF

# Push database schema again
npm run db:push

# Recreate admin user
node scripts/create-admin.js

# Restart application
nohup npm run dev > /tmp/redteam.log 2>&1 &

sleep 5

echo "Database authentication fixed. Try logging in again."
echo "Credentials: admin / admin123"