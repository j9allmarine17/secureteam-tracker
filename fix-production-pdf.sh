#!/bin/bash

# Complete Production PDF Fix Script
# Installs Chromium and configures environment for PDF generation

set -e

echo "=== Production Server PDF Generation Fix ==="
echo "This script will install Chromium and configure PDF generation"
echo ""

# Check if running as root (for apt commands)
if [ "$EUID" -eq 0 ]; then
    APT_CMD="apt"
else
    APT_CMD="sudo apt"
fi

# Step 1: Install Chromium
echo "Step 1: Installing Chromium browser..."
$APT_CMD update
$APT_CMD install -y chromium-browser

# Step 2: Verify installation and find path
CHROMIUM_PATH=$(which chromium-browser 2>/dev/null || echo "")
if [ -z "$CHROMIUM_PATH" ]; then
    # Try alternative locations
    for path in /usr/bin/chromium-browser /usr/bin/chromium /snap/bin/chromium; do
        if [ -x "$path" ]; then
            CHROMIUM_PATH="$path"
            break
        fi
    done
fi

if [ -z "$CHROMIUM_PATH" ]; then
    echo "❌ Error: Chromium installation failed or not found"
    exit 1
fi

echo "✅ Chromium found at: $CHROMIUM_PATH"

# Step 3: Update environment configuration
if [ -f ".env" ]; then
    echo "Step 2: Updating .env configuration..."
    
    # Backup existing .env
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    
    # Remove any existing CHROMIUM_EXECUTABLE_PATH
    grep -v "^CHROMIUM_EXECUTABLE_PATH=" .env > .env.tmp || true
    mv .env.tmp .env
    
    # Add new path
    echo "CHROMIUM_EXECUTABLE_PATH=$CHROMIUM_PATH" >> .env
    echo "✅ Environment variable added to .env"
else
    echo "⚠️ No .env file found. Creating one..."
    echo "CHROMIUM_EXECUTABLE_PATH=$CHROMIUM_PATH" > .env
fi

# Step 4: Test Chromium
echo "Step 3: Testing Chromium installation..."
if "$CHROMIUM_PATH" --version >/dev/null 2>&1; then
    VERSION=$("$CHROMIUM_PATH" --version)
    echo "✅ Chromium test successful: $VERSION"
else
    echo "⚠️ Warning: Chromium may have issues but is installed"
fi

# Step 5: Check for additional dependencies
echo "Step 4: Installing additional dependencies for headless operation..."
$APT_CMD install -y \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatspi2.0-0 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends

# Step 6: Service restart
echo "Step 5: Application restart..."
if systemctl is-active --quiet redteam-collab 2>/dev/null; then
    echo "Restarting redteam-collab service..."
    sudo systemctl restart redteam-collab
    echo "✅ Service restarted"
elif [ -f "package.json" ]; then
    echo "Service not found. You can restart manually with:"
    echo "npm run dev  # for development"
    echo "or restart your production process"
fi

echo ""
echo "=== PDF Fix Complete ==="
echo "✅ Chromium installed: $CHROMIUM_PATH"
echo "✅ Environment configured"
echo "✅ Dependencies installed"
echo ""
echo "Your production server should now generate PDFs instead of HTML."
echo "Test by creating a new report with PDF format."
echo ""
echo "If issues persist, check the application logs for Chromium-related errors."