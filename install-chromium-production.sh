#!/bin/bash

# Production Server Chromium Installation Script
# This script installs Chromium browser for PDF report generation

echo "=== Installing Chromium for PDF Report Generation ==="

# Update package lists
echo "Updating package lists..."
sudo apt update

# Install Chromium browser
echo "Installing Chromium browser..."
sudo apt install -y chromium-browser

# Verify installation
CHROMIUM_PATH=$(which chromium-browser)
if [ -n "$CHROMIUM_PATH" ]; then
    echo "✅ Chromium installed successfully at: $CHROMIUM_PATH"
    
    # Add to environment file if it exists
    if [ -f ".env" ]; then
        echo "Adding CHROMIUM_EXECUTABLE_PATH to .env file..."
        
        # Remove existing entry if present
        sed -i '/^CHROMIUM_EXECUTABLE_PATH=/d' .env
        
        # Add new entry
        echo "CHROMIUM_EXECUTABLE_PATH=$CHROMIUM_PATH" >> .env
        echo "✅ Environment variable added to .env"
    else
        echo "⚠️  .env file not found. Add this to your environment:"
        echo "CHROMIUM_EXECUTABLE_PATH=$CHROMIUM_PATH"
    fi
    
    # Test Chromium
    echo "Testing Chromium installation..."
    if $CHROMIUM_PATH --version > /dev/null 2>&1; then
        echo "✅ Chromium test successful"
        echo "Version: $($CHROMIUM_PATH --version)"
    else
        echo "⚠️  Chromium installed but may have issues"
    fi
    
    echo ""
    echo "=== Installation Complete ==="
    echo "Restart your application to enable PDF generation:"
    echo "sudo systemctl restart redteam-collab"
    echo ""
    echo "Test PDF generation through your application interface."
    
else
    echo "❌ Chromium installation failed"
    echo "Try manual installation:"
    echo "sudo apt install chromium-browser"
    exit 1
fi