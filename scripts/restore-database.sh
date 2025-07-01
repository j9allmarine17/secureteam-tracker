#!/bin/bash

# Database restore script for RedTeam Collaboration Platform
# This script restores a PostgreSQL database from a backup file

set -e

# Configuration
DB_NAME="redteam_collab"
DB_USER="redteam_user"
BACKUP_DIR="/opt/redteam-collab/backups"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if backup file is provided
if [ $# -eq 0 ]; then
    print_error "Usage: $0 <backup_file>"
    echo "Available backups:"
    ls -la "$BACKUP_DIR"/redteam_collab_backup_*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    print_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

print_warning "This will completely replace the current database!"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_status "Restore cancelled"
    exit 0
fi

# Stop the application
print_status "Stopping application..."
sudo systemctl stop redteam-collab || true

# Drop and recreate database
print_status "Recreating database..."
sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

# Restore from backup
print_status "Restoring database from backup..."
if gunzip -c "$BACKUP_FILE" | psql -U "$DB_USER" -h localhost "$DB_NAME"; then
    print_status "Database restored successfully from: $BACKUP_FILE"
else
    print_error "Database restore failed!"
    exit 1
fi

# Start the application
print_status "Starting application..."
sudo systemctl start redteam-collab

print_status "Restore completed successfully!"