#!/bin/bash

echo "Upgrading Node.js to version 20 for Vite compatibility"
echo "======================================================"

# Remove existing Node.js installation
sudo apt-get remove -y nodejs npm

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
echo "Node.js version: $(node -v)"
echo "NPM version: $(npm -v)"

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
npm install

echo ""
echo "✓ Node.js 20 installed successfully"
echo "Now run: npm run dev"