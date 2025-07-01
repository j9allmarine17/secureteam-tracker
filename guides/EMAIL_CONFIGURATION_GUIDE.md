# Email Configuration Guide - Exchange Server SMTP Relay

This guide will help you configure SecureTeam Tracker to use your local Exchange server as an SMTP relay for email notifications.

## Prerequisites

- Exchange Server 2016/2019/2022 or Office 365 on-premises
- Administrative access to Exchange Management Console/Shell
- Service account in Active Directory
- Network connectivity between application server and Exchange server

## Step 1: Create Service Account

1. **Create AD Service Account:**
   ```powershell
   New-ADUser -Name "SecureTeamTracker-Service" -UserPrincipalName "secureteam@yourdomain.com" -AccountPassword (ConvertTo-SecureString "ComplexPassword123!" -AsPlainText -Force) -Enabled $true -PasswordNeverExpires $true
   ```

2. **Grant necessary permissions:**
   - Add to appropriate security groups
   - Ensure account has mailbox if required
   - Set appropriate password policy exceptions

## Step 2: Configure Exchange SMTP Relay

### Option A: Exchange Management Shell
```powershell
# Create new receive connector for SMTP relay
New-ReceiveConnector -Name "SecureTeam SMTP Relay" -Usage Custom -Bindings "0.0.0.0:587" -RemoteIPRanges "192.168.1.0/24" -Server "EXCHANGE-SERVER"

# Configure authentication
Set-ReceiveConnector "SecureTeam SMTP Relay" -AuthMechanism TLS, BasicAuth, BasicAuthRequireTLS -PermissionGroups AnonymousUsers, ExchangeUsers

# Enable TLS
Set-ReceiveConnector "SecureTeam SMTP Relay" -RequireTLS $true
```

### Option B: Exchange Admin Center (GUI)
1. Navigate to **Mail Flow > Receive Connectors**
2. Click **+** to create new connector
3. Configure:
   - **Name:** SecureTeam SMTP Relay
   - **Role:** Frontend Transport
   - **Type:** Custom
   - **Network adapter bindings:** All available IPs, Port 587
   - **Remote network settings:** Add your application server IP range
   - **Authentication:** Basic authentication over TLS

## Step 3: Configure Application Environment

Create or update your `.env` file with Exchange server settings:

```env
# Email Configuration (Exchange Server SMTP Relay)
SMTP_HOST=your-exchange-server.company.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_TLS_REJECT_UNAUTHORIZED=false
SMTP_USER=secureteam@yourdomain.com
SMTP_PASS=ComplexPassword123!
SMTP_FROM="SecureTeam Tracker <noreply@yourdomain.com>"

# Email Notifications
EMAIL_ADMIN_RECIPIENTS=admin@yourdomain.com,security-team@yourdomain.com
EMAIL_NOTIFICATIONS_ENABLED=true
```

## Step 4: Network Configuration

### Firewall Rules
```bash
# On Exchange Server - Allow SMTP traffic from application server
New-NetFirewallRule -DisplayName "SecureTeam SMTP" -Direction Inbound -Protocol TCP -LocalPort 587 -RemoteAddress "192.168.1.100" -Action Allow

# On Application Server - Allow outbound SMTP
New-NetFirewallRule -DisplayName "SMTP Outbound" -Direction Outbound -Protocol TCP -RemotePort 587 -Action Allow
```

### DNS Configuration
Ensure proper DNS resolution:
```bash
# Test DNS resolution
nslookup your-exchange-server.company.com

# Test SMTP connectivity
telnet your-exchange-server.company.com 587
```

## Step 5: Test Configuration

1. **Access Admin Settings:**
   - Log in as admin user
   - Navigate to Settings > Email tab
   - Enter test email address (optional)
   - Click "Send Test Email"

2. **Manual Testing:**
   ```bash
   # Test SMTP connection with OpenSSL
   openssl s_client -connect your-exchange-server.company.com:587 -starttls smtp
   ```

## Email Notification Types

The system will automatically send notifications for:

### User Management
- **New Registration:** Sent to admin recipients when users register
- **Account Approval:** Sent to user when admin approves their account
- **Password Reset:** Sent to user when admin resets their password

### Security Findings
- **New Critical/High Findings:** Sent to admin recipients
- **Finding Assignment:** Sent to assigned team members
- **Finding Updates:** Sent to stakeholders when findings are modified

### Reports
- **Report Generation:** Sent to report creator and admin recipients
- **Report Completion:** Sent when PDF reports are ready for download

## Troubleshooting

### Common Issues

1. **Authentication Failed:**
   - Verify service account credentials
   - Check account is not locked/disabled
   - Ensure password hasn't expired

2. **Connection Refused:**
   - Verify Exchange server is running
   - Check firewall rules
   - Test network connectivity

3. **TLS/SSL Errors:**
   - Verify certificate validity
   - Check TLS configuration on Exchange
   - Consider setting SMTP_TLS_REJECT_UNAUTHORIZED=false for testing

4. **Permission Denied:**
   - Check receive connector permissions
   - Verify service account has necessary rights
   - Review Exchange logs

### Exchange Server Logs
Check these locations for troubleshooting:
- **Event Viewer:** Applications and Services Logs > Microsoft > Exchange
- **Message Tracking:** Get-MessageTrackingLog
- **SMTP Logs:** %ExchangeInstallPath%TransportRoles\Logs\Hub\SmtpSend

### Application Logs
Monitor application console output for:
- Email service initialization
- SMTP connection status
- Send attempt results

## Security Considerations

1. **Service Account Security:**
   - Use strong, unique password
   - Enable account monitoring
   - Regular password rotation
   - Principle of least privilege

2. **Network Security:**
   - Restrict SMTP relay to specific IP ranges
   - Use TLS encryption for all communications
   - Monitor for unauthorized relay attempts

3. **Email Security:**
   - Configure SPF, DKIM, DMARC records
   - Monitor email delivery logs
   - Implement rate limiting if necessary

## Production Deployment

1. **Environment Separation:**
   ```env
   # Development
   SMTP_HOST=dev-exchange.company.com
   EMAIL_NOTIFICATIONS_ENABLED=false

   # Production
   SMTP_HOST=exchange.company.com
   EMAIL_NOTIFICATIONS_ENABLED=true
   ```

2. **Load Balancing:**
   Consider multiple Exchange servers for high availability:
   ```env
   SMTP_HOST=exchange-vip.company.com  # Virtual IP
   ```

3. **Monitoring:**
   - Set up email delivery monitoring
   - Configure alerting for failed sends
   - Track email volumes and patterns

## Advanced Configuration

### Custom Email Templates
Email templates are defined in `server/emailService.ts` and can be customized:
- HTML styling and branding
- Dynamic content insertion
- Multilingual support

### Notification Rules
Configure notification rules based on:
- Finding severity levels
- User roles and permissions
- Time-based triggers
- Custom business logic

### Integration Options
- **Office 365:** Similar configuration with modern authentication
- **Exchange Online:** Cloud-based Exchange setup
- **Hybrid Environments:** On-premises and cloud integration

## Support

For additional support:
1. Check application logs and Exchange server logs
2. Use the built-in email test functionality
3. Verify network connectivity and DNS resolution
4. Review Exchange server health and configuration

Remember to restart the SecureTeam Tracker application after making configuration changes to the `.env` file.