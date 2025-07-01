# OpenVAS Integration Setup Guide

## Prerequisites

You mentioned you've installed OpenVAS. This guide will help you configure it for integration with SecureTeam Tracker.

## 1. Verify OpenVAS Installation

Check if OpenVAS components are installed and running:

```bash
# Check if gvm-cli is available
which gvm-cli

# Check OpenVAS services
sudo systemctl status ospd-openvas
sudo systemctl status gvmd
sudo systemctl status gsad
```

## 2. Initial OpenVAS Setup

If this is a fresh installation, run the setup:

```bash
# Run initial setup
sudo gvm-setup

# Create admin user (if not already done)
sudo gvm-manage-certs -a
sudo gvmd --create-user=admin --password=admin
```

## 3. Configure OpenVAS for SecureTeam Tracker

### Set Admin Password
```bash
# Set a known password for the admin user
sudo gvmd --user=admin --new-password=admin123
```

### Configure GMP Access

OpenVAS requires proper GMP (Greenbone Management Protocol) configuration. First, check if gvmd is listening on TCP:

```bash
# Check gvmd configuration
sudo gvmd --help | grep listen

# Start gvmd with TCP listener (if needed)
sudo systemctl stop gvmd
sudo gvmd --listen=127.0.0.1 --port=9390
```

### Test GMP Connection

Try different connection methods:

```bash
# Method 1: Unix socket (if available)
gvm-cli --gmp-username admin --gmp-password admin123 socket --xml "<get_version/>"

# Method 2: TLS connection
gvm-cli --gmp-username admin --gmp-password admin123 tls --hostname 127.0.0.1 --port 9390 --xml "<get_version/>"

# Method 3: SSH connection (alternative)
gvm-cli --gmp-username admin --gmp-password admin123 ssh --hostname 127.0.0.1 --xml "<get_version/>"
```

### Expected Response
You should see XML output like:
```xml
<get_version_response status="200" status_text="OK">
  <version>22.4</version>
</get_version_response>
```

## 4. Network Configuration

Ensure OpenVAS can access your network targets:

```bash
# Check scanner configuration
gvm-cli --gmp-username admin --gmp-password admin123 socket --xml "<get_scanners/>"

# Verify scan configs are available
gvm-cli --gmp-username admin --gmp-password admin123 socket --xml "<get_configs/>"
```

## 5. Update SecureTeam Tracker Configuration

Update the OpenVAS credentials in the liveDataService if needed:

1. Edit `server/liveDataService.ts`
2. Look for the OpenVAS connection commands
3. Update username/password if different from admin/admin123

## 6. Test OpenVAS Integration

1. Navigate to the Visualizations page
2. Go to the "Live Data Controls" tab
3. Check the OpenVAS Status indicator
4. Click "Test" to verify connection

## 7. Troubleshooting

### Common Issues:

**"gvm-cli not found"**
- Install gvm-tools: `sudo apt install gvm-tools`

**"Connection refused"**
- Start OpenVAS services: `sudo gvm-start`
- Check if gvmd socket is listening: `sudo ss -tulpn | grep gvmd`

**"Authentication failed"**
- Reset admin password: `sudo gvmd --user=admin --new-password=admin123`

**"Permission denied"**
- Add your user to gvm group: `sudo usermod -aG gvm $USER`
- Restart your session

### Service Management:
```bash
# Start all OpenVAS services
sudo gvm-start

# Stop all OpenVAS services  
sudo gvm-stop

# Check service status
sudo gvm-check-setup
```

## 8. Network Discovery with OpenVAS

Once configured, the system will:

1. **Discover Network**: Use nmap-style scanning to find hosts
2. **Vulnerability Assessment**: Automatically run OpenVAS scans on discovered hosts
3. **Real-time Updates**: Stream vulnerability results to the visualization
4. **CVE Mapping**: Extract and display specific CVE identifiers from scan results

## 9. Performance Considerations

- OpenVAS scans can take 10-60 seconds per host
- Limit concurrent scans to avoid overwhelming the scanner
- Consider using faster scan configurations for live discovery

## 10. Security Notes

- Change default passwords before production use
- Restrict OpenVAS access to authorized networks
- Monitor scan logs for suspicious activity
- Keep vulnerability definitions updated

## Configuration Example

Working OpenVAS connection test command:
```bash
gvm-cli --gmp-username admin --gmp-password admin123 socket --xml "<get_version/>"
```

Expected successful output indicates OpenVAS is ready for SecureTeam Tracker integration.