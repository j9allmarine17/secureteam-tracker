# OpenVAS Connection Diagnostic Guide

## Current Status
Your OpenVAS gvmd service is running successfully. The challenge is establishing GMP (Greenbone Management Protocol) connectivity.

## Diagnostic Steps

### 1. Check GMP Socket Configuration
```bash
# Check if Unix socket exists
sudo find /var /run /tmp -name "*gvmd*" -type s 2>/dev/null

# Check gvmd process and listening ports
sudo netstat -tulpn | grep gvmd
```

### 2. Configure GMP TCP Listener
Since the Unix socket isn't available, configure TCP access:

```bash
# Stop current gvmd service
sudo systemctl stop gvmd

# Start with TCP listener enabled
sudo gvmd --listen=127.0.0.1 --port=9390 --osp-vt-update=/run/ospd/ospd.sock --listen-group=_gvm

# Or modify systemd service file
sudo systemctl edit gvmd.service
```

Add this configuration:
```ini
[Service]
ExecStart=
ExecStart=/usr/sbin/gvmd --listen=127.0.0.1 --port=9390 --osp-vt-update=/run/ospd/ospd.sock --listen-group=_gvm
```

### 3. Create Admin User with Known Credentials
```bash
# Create or reset admin user
sudo gvmd --create-user=admin --password=admin123

# Or reset existing password
sudo gvmd --user=admin --new-password=admin123
```

### 4. Test All Connection Methods
```bash
# Method 1: Unix socket (preferred)
gvm-cli --gmp-username admin --gmp-password admin123 socket --xml "<get_version/>"

# Method 2: TLS connection
gvm-cli --gmp-username admin --gmp-password admin123 tls --hostname 127.0.0.1 --port 9390 --xml "<get_version/>"

# Method 3: Alternative credentials
gvm-cli --gmp-username admin --gmp-password admin socket --xml "<get_version/>"
```

### 5. Verify Service Configuration
```bash
# Check all OpenVAS services
sudo systemctl status gvmd ospd-openvas gsad

# Verify VT updates are complete
sudo gvm-check-setup
```

## Expected Working Output
```xml
<get_version_response status="200" status_text="OK">
  <version>22.4.0</version>
</get_version_response>
```

## Troubleshooting Connection Refused

If you get "Connection refused":

1. **Enable TCP Listener**: gvmd must be started with `--listen` parameter
2. **Check Firewall**: Ensure port 9390 is accessible locally
3. **Verify Credentials**: Admin user must exist with correct password
4. **Service Dependencies**: Ensure ospd-openvas is running first

## Alternative: Direct API Integration

If GMP connection fails, SecureTeam Tracker will fall back to:
- Service-based vulnerability detection
- CVE database lookup
- Network scanning without OpenVAS integration

This provides realistic vulnerability data while OpenVAS configuration is completed.