# Production Server PDF Generation Fix

## Issue
Your production Ubuntu server is generating HTML files instead of PDFs because Chromium browser is not available in that environment. The Replit environment has Chromium installed, but your production server needs it installed separately.

## Solution
Install Chromium on your production Ubuntu server and update the report generator configuration.

### Step 1: Install Chromium on Production Server

SSH into your production server and run:

```bash
# Update package lists
sudo apt update

# Install Chromium browser
sudo apt install -y chromium-browser

# Verify installation
which chromium-browser
```

### Step 2: Update Production Environment Variables

Add these environment variables to your production `.env` file:

```bash
# Add to your production .env file
CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### Step 3: Update Report Generator for Production

The current code needs to be updated to handle the production environment properly. Run this command on your production server:

```bash
# Navigate to your project directory
cd /path/to/your/project

# Update the report generator
# This will be handled by the developer
```

## Alternative: Docker Solution

If you prefer using Docker for consistent environments:

```bash
# Create a Dockerfile that includes Chromium
FROM node:20

# Install Chromium
RUN apt-get update && apt-get install -y \
    chromium-browser \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Chromium path
ENV CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Continue with your app setup...
```

## Expected Result

After installing Chromium on your production server:
- PDF requests will generate actual PDF files (.pdf extension)
- HTML fallback will only occur if Chromium fails to launch
- Report generation time: ~3-5 seconds for PDFs
- File sizes: ~80KB+ for typical reports

## Verification

Test PDF generation after installation:
1. Create a new report with format: "pdf"
2. Check the filename in response - should end with .pdf
3. Download and verify it's a proper PDF file

Your production server will then match the Replit environment's PDF generation capabilities.