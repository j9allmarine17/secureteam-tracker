# Active Directory Authentication Setup

## Implementation Approach

Your SecureTeam Tracker can integrate with Active Directory using several approaches:

### Option 1: LDAP Integration (Recommended)
- Direct LDAP authentication against your domain controllers
- Automatic user creation and role assignment based on AD groups
- Seamless single sign-on experience

### Option 2: LDAP with Group Sync
- Authenticate users against AD
- Sync group memberships for role-based access control
- Automatic user provisioning and deprovisioning

### Option 3: SAML/SSO Integration
- Enterprise SSO solution using SAML 2.0
- Integration with existing SSO infrastructure
- Advanced security features and audit trails

## Current Implementation Status

I've prepared the foundation for Active Directory integration:

### Database Schema Updates
- Added `authSource` field to users table (local, ldap, replit)
- Updated user creation and management to support multiple auth sources
- Schema changes deployed to your database

### API Endpoints Ready
- `/api/auth/ad` - Active Directory authentication endpoint
- User management enhanced for AD users with `ad_` prefix
- Role assignment based on AD group membership

### Configuration Structure
Environment variables prepared for LDAP configuration:
```env
LDAP_URL=ldap://your-domain-controller.company.com:389
LDAP_BIND_DN=CN=Service Account,CN=Users,DC=company,DC=com
LDAP_BIND_PASSWORD=your-service-account-password
LDAP_SEARCH_BASE=CN=Users,DC=company,DC=com
LDAP_SEARCH_FILTER=(sAMAccountName={{username}})
```

## Implementation Options

### Quick Setup (15 minutes)
1. **Create Service Account in AD**
   - Create dedicated LDAP service account
   - Grant read permissions to user directory
   - Note down credentials

2. **Configure Environment Variables**
   - Add LDAP settings to your .env file
   - Test connectivity to domain controller

3. **Deploy LDAP Library**
   - Install ldapjs or passport-ldapauth
   - Implement authentication logic
   - Test with sample users

### Enterprise Setup (1-2 hours)
1. **Security Group Mapping**
   - Create AD security groups for roles
   - Map groups to application permissions
   - Test role assignment

2. **SSO Integration**
   - Configure SAML identity provider
   - Set up metadata exchange
   - Implement SSO flows

3. **Audit and Monitoring**
   - Enable authentication logging
   - Set up group sync monitoring
   - Configure failure alerts

## Role Mapping Strategy

Your current role system maps perfectly to AD groups:

### Admin Users
- `Security-Admins` → admin role
- `RedTeam-Admins` → admin role
- `Cybersecurity-Managers` → admin role

### Team Leads
- `Security-Leads` → team_lead role
- `Senior-Analysts` → team_lead role

### Analysts
- `Security-Analysts` → analyst role
- `RedTeam-Members` → analyst role
- `Penetration-Testers` → analyst role

## Next Steps

To complete the Active Directory integration:

1. **Provide AD Details**
   - Domain controller hostname/IP
   - Service account credentials
   - Domain structure (DC=company,DC=com)

2. **Test Connectivity**
   - Verify network access to domain controller
   - Test LDAP bind with service account
   - Validate user search functionality

3. **Production Deployment**
   - Configure SSL/TLS for secure LDAP
   - Set up monitoring and alerts
   - Train users on new authentication flow

The foundation is ready - we just need your Active Directory configuration details to complete the integration.