# Active Directory Integration Guide

## Overview

This guide explains how to integrate your SecureTeam Tracker with Active Directory for centralized user authentication and automatic role assignment based on AD group membership.

## Architecture

The system supports three authentication methods:
1. **Local Authentication**: Username/password stored in application database
2. **LDAP/Active Directory**: Authenticate against your corporate AD
3. **Replit Auth**: OAuth integration (if using Replit deployment)

Users are automatically created in the database upon first LDAP login with roles determined by their AD group membership.

## Configuration Steps

### 1. Environment Variables

Add these variables to your `.env` file:

```env
# LDAP/Active Directory Configuration
LDAP_URL=ldap://your-domain-controller.company.com:389
LDAP_BIND_DN=CN=Service Account,CN=Users,DC=company,DC=com
LDAP_BIND_PASSWORD=your-service-account-password
LDAP_SEARCH_BASE=CN=Users,DC=company,DC=com
LDAP_SEARCH_FILTER=(sAMAccountName={{username}})

# Optional: Enable LDAP for all authentication (default: both local and LDAP available)
LDAP_ONLY_AUTH=false
```

### 2. Active Directory Service Account

Create a dedicated service account in AD with:
- **Purpose**: LDAP bind and user searches
- **Permissions**: Read access to user directory
- **Groups**: Domain Users (minimum required)
- **Password**: Strong, non-expiring password

**PowerShell commands for AD setup:**
```powershell
# Create service account
New-ADUser -Name "SecureTeam-LDAP" -UserPrincipalName "secureteam-ldap@company.com" -SamAccountName "secureteam-ldap" -AccountPassword (ConvertTo-SecureString "YourStrongPassword123!" -AsPlainText -Force) -Enabled $true -PasswordNeverExpires $true

# Grant necessary permissions (run as Domain Admin)
Add-ADGroupMember -Identity "Domain Users" -Members "secureteam-ldap"
```

### 3. Network Configuration

Ensure your server can reach the domain controller:
- **Port 389**: LDAP (unencrypted)
- **Port 636**: LDAPS (encrypted, recommended for production)
- **DNS Resolution**: Domain controller must be resolvable

**Test connectivity:**
```bash
# Test basic connectivity
telnet your-domain-controller.company.com 389

# Test DNS resolution
nslookup your-domain-controller.company.com
```

### 4. Security Group Mapping

The system automatically assigns roles based on AD group membership:

#### Admin Role
Users in these groups become **admin** users:
- `CN=Security-Admins,CN=Groups,DC=company,DC=com`
- `CN=RedTeam-Admins,CN=Groups,DC=company,DC=com`
- `CN=Penetration-Test-Leads,CN=Groups,DC=company,DC=com`
- `CN=Cybersecurity-Managers,CN=Groups,DC=company,DC=com`

#### Team Lead Role
Users in these groups become **team_lead** users:
- `CN=Security-Leads,CN=Groups,DC=company,DC=com`
- `CN=RedTeam-Leads,CN=Groups,DC=company,DC=com`
- `CN=Senior-Analysts,CN=Groups,DC=company,DC=com`

#### Analyst Role (Default)
Users in these groups become **analyst** users:
- `CN=Security-Analysts,CN=Groups,DC=company,DC=com`
- `CN=RedTeam-Members,CN=Groups,DC=company,DC=com`
- `CN=Penetration-Testers,CN=Groups,DC=company,DC=com`
- `CN=Cybersecurity-Team,CN=Groups,DC=company,DC=com`

**Create AD groups if needed:**
```powershell
# Create security groups
New-ADGroup -Name "Security-Analysts" -GroupScope Global -GroupCategory Security -Path "CN=Groups,DC=company,DC=com"
New-ADGroup -Name "Security-Leads" -GroupScope Global -GroupCategory Security -Path "CN=Groups,DC=company,DC=com"
New-ADGroup -Name "Security-Admins" -GroupScope Global -GroupCategory Security -Path "CN=Groups,DC=company,DC=com"

# Add users to groups
Add-ADGroupMember -Identity "Security-Analysts" -Members "username1", "username2"
```

## API Endpoints

### LDAP Authentication
```bash
POST /api/auth/ldap
Content-Type: application/json

{
  "username": "jdoe",
  "password": "user-password"
}
```

**Response (Success):**
```json
{
  "id": "ad_jdoe",
  "username": "jdoe",
  "firstName": "John",
  "lastName": "Doe",
  "email": "jdoe@company.com",
  "role": "analyst",
  "authSource": "ldap"
}
```

### Test LDAP Connection
```bash
GET /api/admin/test-ldap
Authorization: Bearer <admin-token>
```

## Frontend Integration

### Login Form Update

The authentication page automatically detects LDAP configuration and provides both local and AD login options:

```typescript
// Login with Active Directory
const loginWithAD = async (username: string, password: string) => {
  const response = await fetch('/api/auth/ldap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  
  if (response.ok) {
    const user = await response.json();
    // User is now authenticated
  }
};
```

### User Management

AD users are automatically created with:
- **ID Format**: `ad_<username>`
- **Status**: `active` (auto-approved)
- **Role**: Based on group membership
- **Auth Source**: `ldap`

## Testing

### 1. Test LDAP Connection
```bash
curl -X GET "http://localhost:5000/api/admin/test-ldap" \
  -H "Authorization: Bearer <admin-token>"
```

### 2. Test User Authentication
```bash
curl -X POST "http://localhost:5000/api/auth/ldap" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

### 3. Verify User Creation
Check that AD users appear in the user management interface with:
- Correct role assignment
- `ldap` auth source
- Active status

## Troubleshooting

### Common Issues

#### 1. LDAP Connection Failed
**Symptoms**: Connection timeout or bind failures
**Solutions**:
- Verify domain controller IP/hostname
- Check firewall rules (port 389/636)
- Confirm service account credentials
- Test with `ldapsearch` command line tool

#### 2. Authentication Fails for Valid Users
**Symptoms**: Valid AD credentials rejected
**Solutions**:
- Verify LDAP search filter format
- Check user's DN path in search base
- Confirm account is not disabled in AD
- Review LDAP bind permissions

#### 3. Wrong Role Assignment
**Symptoms**: Users get incorrect roles
**Solutions**:
- Verify user's group membership in AD
- Check group name matching in role determination logic
- Confirm groups are in the expected format

#### 4. Email Notifications Not Working
**Symptoms**: AD users don't receive emails
**Solutions**:
- Verify `mail` attribute is populated in AD
- Check email attribute mapping in LDAP search
- Confirm email notifications are enabled

### Debug Commands

```bash
# Test LDAP search manually
ldapsearch -x -H ldap://your-dc.company.com:389 \
  -D "CN=Service Account,CN=Users,DC=company,DC=com" \
  -w "password" \
  -b "CN=Users,DC=company,DC=com" \
  "(sAMAccountName=testuser)"

# Check user groups
ldapsearch -x -H ldap://your-dc.company.com:389 \
  -D "CN=Service Account,CN=Users,DC=company,DC=com" \
  -w "password" \
  -b "CN=Users,DC=company,DC=com" \
  "(sAMAccountName=testuser)" memberOf
```

## Security Considerations

### Best Practices
1. **Service Account Security**
   - Use minimal required permissions
   - Regularly rotate password
   - Monitor account usage

2. **Network Security**
   - Use LDAPS (port 636) for production
   - Implement network segmentation
   - Enable connection logging

3. **Access Control**
   - Regularly review group memberships
   - Implement principle of least privilege
   - Monitor role assignments

### Audit Trail
The system logs all LDAP authentication attempts:
- Successful logins with user details
- Failed authentication attempts
- Role assignments from group membership
- User creation/updates from AD

## Production Deployment

### SSL/TLS Configuration
For production, use encrypted LDAPS:
```env
LDAP_URL=ldaps://your-domain-controller.company.com:636
LDAP_TLS_REJECT_UNAUTHORIZED=true
```

### High Availability
Configure multiple domain controllers:
```env
LDAP_URL=ldaps://dc1.company.com:636,ldaps://dc2.company.com:636
```

### Monitoring
Implement monitoring for:
- LDAP connection health
- Authentication success/failure rates
- User synchronization status
- Role assignment accuracy

## Migration from Local Auth

### Gradual Migration
1. Enable both local and LDAP authentication
2. Test with pilot group of AD users
3. Migrate users gradually by role
4. Disable local auth when ready

### User Account Linking
Link existing local accounts to AD:
```sql
-- Update existing user to link with AD
UPDATE users 
SET auth_source = 'ldap', 
    username = 'ad_username'
WHERE email = 'user@company.com';
```

This integration provides seamless Single Sign-On with your existing Active Directory infrastructure while maintaining role-based access control through AD group membership.