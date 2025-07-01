# Production Server PDF Generation - Complete Solution

## Issue Analysis
Your production Ubuntu server generates HTML files instead of PDFs because Chromium browser is missing. The logs show:
- Replit server: Generates `.pdf` files successfully 
- Production server: Falls back to `.html` files

## Quick Fix for Your Production Server

### Option 1: Automated Script (Recommended)
Upload and run the complete fix script on your production server:

```bash
# Upload fix-production-pdf.sh to your production server
# Then run:
chmod +x fix-production-pdf.sh
./fix-production-pdf.sh
```

This script will:
- Install Chromium browser
- Add required environment variables
- Install all dependencies for headless operation
- Restart your application service
- Test the installation

### Option 2: Manual Installation
If you prefer manual steps:

```bash
# Install Chromium
sudo apt update
sudo apt install -y chromium-browser

# Add to your .env file
echo "CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser" >> .env

# Install additional dependencies
sudo apt install -y fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libnspr4 libnss3 libxcomposite1 libxdamage1 libxrandr2 xdg-utils

# Restart your application
sudo systemctl restart redteam-collab
```

## Code Improvements Made

Enhanced the report generator with:
- Environment variable support (`CHROMIUM_EXECUTABLE_PATH`)
- Better path detection for Ubuntu systems
- Comprehensive logging to identify browser location
- Production-specific error messages

## Verification

After installation, test PDF generation:
1. Create a new report with format "pdf"
2. Check response filename ends with `.pdf` (not `.html`)
3. Download and verify it's a proper PDF file
4. Check application logs for Chromium detection messages

## Expected Results

Post-installation your production server will:
- Generate actual PDF files (~80KB+) in 3-5 seconds
- Match Replit environment PDF capabilities
- Show Chromium path detection in logs
- Only fallback to HTML if Chromium fails to launch

The HTML fallback remains as a safety mechanism but shouldn't be needed once Chromium is properly installed.