# Exchange Server Email Troubleshooting Guide

## Current Configuration Status

✅ **Configuration Loaded Successfully**
- SMTP Host: smtp.company.local
- SMTP Port: 25
- Authentication: Enabled (jamesga@company.com)
- TLS: Disabled (appropriate for internal Exchange)
- Admin Recipients: jamesga@company.com, alexl@company.com

⚠️ **Action Required**
- Update SMTP_PASS in .env file with actual password

## Testing Steps

### 1. Network Connectivity Test
```bash
# Test if Exchange server is reachable
telnet smtp.company.local 25

# Expected response:
# 220 exchange-server Microsoft ESMTP MAIL Service ready
```

### 2. SMTP Authentication Test
```bash
# Manual SMTP test (after telnet connection)
EHLO secureteamtracker
AUTH LOGIN
# Enter base64 encoded username and password
```

### 3. Application Email Test
1. Log in as admin user
2. Navigate to Settings > Email Configuration
3. Click "Send Test Email"
4. Check console logs for detailed error messages

## Common Exchange Server Issues

### Authentication Failures
**Symptoms:** EAUTH errors, 535 authentication failed
**Solutions:**
- Verify service account password is correct
- Check if account is locked or disabled in Active Directory
- Ensure account has necessary Exchange permissions

### Connection Refused
**Symptoms:** ECONNREFUSED, connection timeout
**Solutions:**
- Verify Exchange server is running
- Check network firewall rules
- Test from server: `telnet smtp.company.local 25`

### Relay Restrictions
**Symptoms:** 550 or 553 relay denied errors
**Solutions:**
- Configure Exchange receive connector for anonymous relay
- Add application server IP to allowed relay list
- Check Exchange Hub Transport settings

## Exchange Server Configuration

### Required Receive Connector Settings
```powershell
# Create or modify receive connector for application relay
New-ReceiveConnector -Name "SecureTeam Tracker Relay" `
  -Usage Custom -Bindings 0.0.0.0:25 `
  -RemoteIPRanges [APPLICATION_SERVER_IP] `
  -AuthMechanism None -PermissionGroups AnonymousUsers
```

### Enable Anonymous Relay
```powershell
Get-ReceiveConnector "SecureTeam Tracker Relay" | 
  Add-ADPermission -User "NT AUTHORITY\ANONYMOUS LOGON" `
  -ExtendedRights "ms-Exch-SMTP-Submit","ms-Exch-SMTP-Accept-Any-Recipient"
```

## Monitoring and Logs

### Application Logs
Monitor console output for:
```
Email service transporter created
Testing email connection with config: {...}
Email connection test successful
Email sent successfully: <message-id>
```

### Exchange Server Logs
Check these locations:
- **Event Viewer:** Applications and Services Logs > Microsoft > Exchange
- **Message Tracking:** `Get-MessageTrackingLog -Sender "jamesga@company.com"`
- **Transport Logs:** Exchange Management Shell commands

### Network Troubleshooting
```bash
# Test DNS resolution
nslookup smtp.company.local

# Test port connectivity
nc -zv smtp.company.local 25

# Check if port is filtered
nmap -p 25 smtp.company.local
```

## Security Considerations

### Service Account Security
- Use dedicated service account for SMTP relay
- Strong password with regular rotation
- Principle of least privilege
- Monitor for unauthorized access attempts

### Network Security
- Restrict SMTP relay to specific IP ranges
- Use internal network for Exchange communication
- Monitor for relay abuse
- Implement rate limiting if needed

## Next Steps

1. **Update Password:** Replace REDACTED in .env with actual password
2. **Test Connection:** Use admin settings page to test email
3. **Monitor Logs:** Check both application and Exchange logs
4. **Verify Delivery:** Test with actual email recipients

## Alternative Configurations

If authentication continues to fail, consider:

### Anonymous Relay (No Authentication)
```env
SMTP_HOST=smtp.company.local
SMTP_PORT=25
SMTP_SECURE=false
SMTP_TLS_REJECT_UNAUTHORIZED=false
# Remove SMTP_USER and SMTP_PASS for anonymous relay
```

### Different Ports
- Port 587: SMTP submission (may require TLS)
- Port 25: Standard SMTP (usually internal relay)

### TLS Configuration
```env
# If Exchange requires TLS
SMTP_SECURE=true
SMTP_PORT=587
SMTP_TLS_REJECT_UNAUTHORIZED=true
```

## Support Contacts

For Exchange Server issues:
- Exchange Administrator: Review receive connector configuration
- Network Team: Verify firewall rules and connectivity
- Active Directory Team: Check service account permissions