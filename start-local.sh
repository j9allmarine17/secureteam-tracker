#!/bin/bash

# Set environment variables for local PostgreSQL
export DATABASE_URL="postgresql://postgres:password123@localhost:5432/redteam_collab"
export SESSION_SECRET="redteam-collab-secure-session-key-change-in-production"
export NODE_ENV="development"
export PORT="5000"

echo "Starting RedTeam Collab with local PostgreSQL..."
echo "Database: $DATABASE_URL"
echo "Environment: $NODE_ENV"
echo ""

# Start the application
npm run dev