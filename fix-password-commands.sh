#!/bin/bash

echo "Fixing PostgreSQL redteam_user password..."

# Method 1: Direct SQL commands
sudo -u postgres psql -c "ALTER USER redteam_user WITH ENCRYPTED PASSWORD 'redteam_secure_2024';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE redteam_collab TO redteam_user;"
sudo -u postgres psql -c "ALTER USER redteam_user CREATEDB;"

# Method 2: Connect to the specific database and grant schema permissions
sudo -u postgres psql -d redteam_collab -c "GRANT ALL ON SCHEMA public TO redteam_user;"
sudo -u postgres psql -d redteam_collab -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO redteam_user;"
sudo -u postgres psql -d redteam_collab -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO redteam_user;"

echo "Testing connection..."
# Test the connection
sudo -u postgres psql -c "SELECT 'Connection test successful' as status;" -h localhost -U redteam_user -d redteam_collab

echo "Password fix complete!"
echo "Now run: npm run dev"