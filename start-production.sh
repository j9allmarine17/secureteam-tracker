#!/bin/bash

# Production startup script for Node.js v20+
# Fixes the tsx loader compatibility issue

set -e  # Exit on any error

# Set working directory to the script's directory
cd "$(dirname "$0")"

# Set environment
export NODE_ENV=production

# Log startup attempt
echo "Starting RedTeam Collaboration Platform..."
echo "Working directory: $(pwd)"
echo "Node version: $(node --version)"
echo "Environment: $NODE_ENV"

# Check if required files exist
if [ ! -f "server/index.ts" ]; then
    echo "ERROR: server/index.ts not found"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "ERROR: .env file not found"
    exit 1
fi

# Use the new --import flag for Node.js v20+
exec node --import tsx/esm server/index.ts