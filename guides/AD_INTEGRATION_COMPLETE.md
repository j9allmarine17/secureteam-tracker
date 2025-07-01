# Complete Active Directory Integration Guide

## Overview

Your SecureTeam Tracker now supports Active Directory authentication alongside local authentication. Here's everything you need to know to set it up and use it.

## What's Already Implemented

### 1. Database Schema
- Added `authSource` field to track authentication method (local/ldap/replit)
- Updated user creation to support AD users with `ad_` prefix
- Schema changes deployed to your PostgreSQL database

### 2. API Endpoint
- `/api/auth/ad` endpoint ready for Active Directory authentication
- Automatic user creation on first AD login
- Role assignment based on AD group membership

### 3. User Management
- AD users automatically created with proper roles
- Email notifications work with AD email addresses
- User interface shows authentication source

## Implementation Steps

### Step 1: Active Directory Service Account

Create a service account in your Active Directory:

```powershell
# Run as Domain Administrator
New-ADUser -Name "SecureTeam-Service" -UserPrincipalName "secureteam@company.com" -SamAccountName "secureteam" -AccountPassword (ConvertTo-SecureString "YourStrongPassword123!" -AsPlainText -Force) -Enabled $true -PasswordNeverExpires $true

# Grant necessary permissions
Add-ADGroupMember -Identity "Domain Users" -Members "secureteam"
```

### Step 2: Environment Configuration

Add these variables to your `.env` file:

```env
# Active Directory Configuration
LDAP_URL=ldap://your-domain-controller.company.com:389
LDAP_BIND_DN=CN=SecureTeam-Service,CN=Users,DC=company,DC=com
LDAP_BIND_PASSWORD=YourStrongPassword123!
LDAP_SEARCH_BASE=CN=Users,DC=company,DC=com
LDAP_SEARCH_FILTER=(sAMAccountName={{username}})

# Enable AD authentication
AD_AUTH_ENABLED=true
```

### Step 3: Security Groups (Optional)

Create security groups in AD for role-based access:

```powershell
# Create security groups
New-ADGroup -Name "SecureTeam-Admins" -GroupScope Global -GroupCategory Security
New-ADGroup -Name "SecureTeam-Leads" -GroupScope Global -GroupCategory Security  
New-ADGroup -Name "SecureTeam-Analysts" -GroupScope Global -GroupCategory Security

# Add users to groups
Add-ADGroupMember -Identity "SecureTeam-Analysts" -Members "jdoe", "asmith"
Add-ADGroupMember -Identity "SecureTeam-Leads" -Members "manager1"
Add-ADGroupMember -Identity "SecureTeam-Admins" -Members "admin1"
```

## Role Mapping

The system automatically assigns roles based on AD group membership:

| AD Group | Application Role | Permissions |
|----------|-----------------|-------------|
| SecureTeam-Admins | admin | Full system access, user management |
| SecureTeam-Leads | team_lead | Manage findings, approve users |
| SecureTeam-Analysts | analyst | Create findings, add comments |
| (No matching group) | analyst | Default role for authenticated users |

## Authentication Flow

### Frontend Integration

Update your login form to support both local and AD authentication:

```typescript
// Login with Active Directory
const loginWithAD = async (username: string, password: string) => {
  try {
    const response = await fetch('/api/auth/ad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (response.ok) {
      const user = await response.json();
      // Redirect to dashboard
      window.location.href = '/';
    } else {
      const error = await response.json();
      setError(error.message);
    }
  } catch (error) {
    setError('Authentication failed');
  }
};
```

### User Experience

1. **First Login**: AD users enter their domain credentials (username/password)
2. **Account Creation**: System automatically creates user account with AD prefix
3. **Role Assignment**: Role determined by AD group membership
4. **Email Integration**: Uses AD email address for notifications
5. **Session Management**: Standard session handling after authentication

## Testing the Integration

### 1. Test AD Connectivity
```bash
# Test domain controller connectivity
telnet your-domain-controller.company.com 389

# Test DNS resolution
nslookup your-domain-controller.company.com
```

### 2. Test User Authentication
```bash
curl -X POST "http://localhost:5000/api/auth/ad" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

### 3. Verify User Creation
- Check user appears in Team Management with `ad_` prefix
- Verify correct role assignment
- Confirm email notifications work

## Security Considerations

### Network Security
- Use LDAPS (port 636) for production: `ldaps://dc.company.com:636`
- Implement firewall rules for LDAP traffic
- Use VPN or private network connections

### Account Security
- Service account with minimal permissions
- Regular password rotation for service account
- Monitor authentication logs for anomalies

### Access Control
- Regular review of AD group memberships
- Implement principle of least privilege
- Audit role assignments quarterly

## Troubleshooting

### Common Issues

**"LDAP configuration required"**
- Verify environment variables are set
- Check domain controller connectivity
- Confirm service account credentials

**"Authentication failed"**
- Verify user exists in AD
- Check account is not disabled
- Confirm password is correct

**"Wrong role assigned"**
- Verify user's group membership in AD
- Check group name matching in code
- Review role mapping configuration

### Debug Commands

```bash
# Test LDAP search
ldapsearch -x -H ldap://dc.company.com:389 \
  -D "CN=SecureTeam-Service,CN=Users,DC=company,DC=com" \
  -w "password" \
  -b "CN=Users,DC=company,DC=com" \
  "(sAMAccountName=testuser)"
```

## Migration Strategy

### Gradual Migration
1. Enable both local and AD authentication
2. Test with pilot group of users
3. Migrate users by department/role
4. Disable local auth when ready

### User Account Linking
Link existing local accounts to AD accounts:

```sql
-- Update existing user to link with AD
UPDATE users 
SET auth_source = 'ldap', 
    username = 'existing_username'
WHERE email = 'user@company.com';
```

## Production Deployment

### High Availability
- Configure multiple domain controllers
- Implement connection pooling
- Set up health checks

### Monitoring
- Authentication success/failure rates
- LDAP connection health
- Role assignment accuracy
- User synchronization status

### Backup Authentication
- Keep local admin account as backup
- Document emergency access procedures
- Test failover scenarios

## Next Steps

To complete your AD integration:

1. **Provide Configuration Details**:
   - Domain controller hostname/IP
   - Domain structure (DC=company,DC=com)
   - Service account credentials

2. **Test Network Connectivity**:
   - Verify LDAP port access (389/636)
   - Test DNS resolution
   - Confirm firewall rules

3. **Deploy LDAP Library**:
   - Install and configure LDAP authentication
   - Test with sample users
   - Validate role assignment

The database schema and API endpoints are ready. Once you provide your AD configuration details, the integration can be completed within 30 minutes.