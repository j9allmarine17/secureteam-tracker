#!/bin/bash

# Database backup script for RedTeam Collaboration Platform
# This script creates compressed backups of the PostgreSQL database

set -e

# Configuration
DB_NAME="redteam_collab"
DB_USER="redteam_user"
BACKUP_DIR="/opt/redteam-collab/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/redteam_collab_backup_$DATE.sql.gz"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup
print_status "Creating database backup..."
if pg_dump -U "$DB_USER" -h localhost "$DB_NAME" | gzip > "$BACKUP_FILE"; then
    print_status "Backup created successfully: $BACKUP_FILE"
    
    # Get file size
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    print_status "Backup size: $SIZE"
    
    # Clean up old backups (keep last 30 days)
    find "$BACKUP_DIR" -name "redteam_collab_backup_*.sql.gz" -mtime +30 -delete
    print_status "Old backups cleaned up (kept last 30 days)"
else
    print_error "Backup failed!"
    exit 1
fi