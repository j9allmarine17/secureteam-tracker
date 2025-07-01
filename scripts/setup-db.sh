#!/bin/bash

echo "RedTeam Collab Database Setup"
echo "============================="

# Function to check if PostgreSQL is running
check_postgres() {
    if sudo systemctl is-active --quiet postgresql; then
        echo "✓ PostgreSQL is running"
        return 0
    else
        echo "✗ PostgreSQL is not running"
        return 1
    fi
}

# Function to fix collation issues
fix_collation() {
    echo "Fixing PostgreSQL collation version mismatch..."
    sudo -u postgres psql -c "ALTER DATABASE template1 REFRESH COLLATION VERSION;" 2>/dev/null
    sudo -u postgres psql -c "ALTER DATABASE postgres REFRESH COLLATION VERSION;" 2>/dev/null
    echo "✓ Collation issues fixed"
}

# Function to create database with stable collation
create_database() {
    echo "Creating redteam_collab database..."
    
    # Try creating with stable collation first
    if sudo -u postgres psql -c "CREATE DATABASE redteam_collab WITH ENCODING='UTF8' LC_COLLATE='C' LC_CTYPE='C' TEMPLATE=template0;" 2>/dev/null; then
        echo "✓ Database created successfully with stable collation"
    elif sudo -u postgres createdb redteam_collab 2>/dev/null; then
        echo "✓ Database created successfully"
    else
        echo "✗ Failed to create database"
        echo "Try running: sudo -u postgres psql"
        echo "Then manually run: CREATE DATABASE redteam_collab;"
        return 1
    fi
}

# Function to set password
set_password() {
    echo "Setting postgres user password..."
    sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'password123';" >/dev/null 2>&1
    echo "✓ Password set for postgres user"
}

# Main setup process
echo "Choose setup method:"
echo "1) Fix existing PostgreSQL installation"
echo "2) Use Docker (recommended)"
echo "3) Manual setup guidance"
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        if check_postgres; then
            fix_collation
            create_database
            set_password
            echo ""
            echo "✓ Database setup complete!"
            echo "Database URL: postgresql://postgres:password123@localhost:5432/redteam_collab"
        else
            echo "Please start PostgreSQL first: sudo systemctl start postgresql"
        fi
        ;;
    2)
        echo "Starting PostgreSQL with Docker..."
        docker-compose up -d postgres
        echo "✓ PostgreSQL container started"
        echo "Database URL: postgresql://postgres:password123@localhost:5432/redteam_collab"
        ;;
    3)
        echo ""
        echo "Manual Setup Steps:"
        echo "1. Fix collation: sudo -u postgres psql -c \"ALTER DATABASE template1 REFRESH COLLATION VERSION;\""
        echo "2. Create database: sudo -u postgres psql -c \"CREATE DATABASE redteam_collab WITH ENCODING='UTF8' LC_COLLATE='C' LC_CTYPE='C' TEMPLATE=template0;\""
        echo "3. Set password: sudo -u postgres psql -c \"ALTER USER postgres PASSWORD 'password123';\""
        echo "4. Update .env file with: DATABASE_URL=postgresql://postgres:password123@localhost:5432/redteam_collab"
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env"
echo "2. Run: node scripts/init-db.js"
echo "3. Start application: npm run dev"