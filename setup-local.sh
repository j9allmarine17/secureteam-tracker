#!/bin/bash

echo "Setting up RedTeam Collab for local development"
echo "==============================================="

# Create .env file with local PostgreSQL connection
cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres:password123@localhost:5432/redteam_collab
SESSION_SECRET=redteam-collab-secure-session-key-change-in-production
NODE_ENV=development
PORT=5000
EOF

echo "✓ Created .env file"

# Ensure PostgreSQL is running
if ! systemctl is-active --quiet postgresql; then
    echo "Starting PostgreSQL..."
    sudo systemctl start postgresql
fi

# Test if database exists, create if not
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw redteam_collab; then
    echo "Creating database..."
    sudo -u postgres createdb redteam_collab
    echo "✓ Database created"
else
    echo "✓ Database exists"
fi

# Set postgres user password if needed
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'password123';" 2>/dev/null || true

# Initialize database tables
echo "Setting up database tables..."
node scripts/setup-db.mjs

echo ""
echo "🚀 Local setup complete!"
echo "Start the application with: npm run dev"
echo ""
echo "Admin credentials:"
echo "  Username: admin"
echo "  Password: admin123"
echo "  URL: http://localhost:5000"