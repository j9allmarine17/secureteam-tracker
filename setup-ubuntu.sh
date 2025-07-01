#!/bin/bash

echo "Setting up local Ubuntu server..."

# Make setup scripts executable
chmod +x scripts/fix-db-setup.js
chmod +x scripts/diagnose-db.js

# Install dependencies if needed
echo "Installing dependencies..."
npm install

# Setup local database schema and admin user
echo "Setting up database schema and admin user..."
node scripts/fix-db-setup.js

echo "Setup complete! Starting application..."
npm run dev