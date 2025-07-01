import passport from "passport";
import { Express } from "express";
import { storage } from "./directStorage";

// Import LDAP strategy using dynamic import to avoid ES module issues
let LdapStrategy: any;

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
      status: string;
      authSource: 'local' | 'ldap';
    }
  }
}

export async function setupLDAPAuth(app: Express) {
  try {
    // Dynamically import LDAP strategy to avoid ES module issues
    const { Strategy: LdapStrategy } = await import('passport-ldapauth');
    
    // LDAP Strategy Configuration
    const ldapOptions = {
      server: {
        url: process.env.LDAP_URL || 'ldap://your-domain-controller.company.com:389',
        bindDN: process.env.LDAP_BIND_DN || 'CN=Service Account,CN=Users,DC=company,DC=com',
        bindCredentials: process.env.LDAP_BIND_PASSWORD || 'service-account-password',
        searchBase: process.env.LDAP_SEARCH_BASE || 'CN=Users,DC=company,DC=com',
        searchFilter: process.env.LDAP_SEARCH_FILTER || '(sAMAccountName={{username}})',
        searchAttributes: ['displayName', 'mail', 'sAMAccountName', 'givenName', 'sn', 'memberOf'],
      },
      usernameField: 'username',
      passwordField: 'password',
    };

    passport.use('ldap', new LdapStrategy(ldapOptions, async (user: any, done: any) => {
    try {
      console.log('LDAP authentication successful for user:', user.sAMAccountName);
      
      // Extract user information from LDAP
      const ldapUser = {
        username: user.sAMAccountName,
        firstName: user.givenName || '',
        lastName: user.sn || '',
        email: user.mail || '',
        displayName: user.displayName || '',
        groups: user.memberOf || []
      };

      // Determine user role based on AD groups
      const role = determineUserRole(ldapUser.groups);
      
      // Create or update user in database
      const dbUser = await storage.upsertUser({
        id: `ad_${ldapUser.username}`,
        username: ldapUser.username,
        firstName: ldapUser.firstName,
        lastName: ldapUser.lastName,
        email: ldapUser.email,
        role: role,
        status: 'active'
      });

      console.log('User synced from AD:', dbUser.username, 'Role:', dbUser.role);
      return done(null, dbUser);
    } catch (error) {
      console.error('Error processing LDAP user:', error);
      return done(error, null);
    }
  }));

  // LDAP Login Route
  app.post('/api/auth/ldap', (req, res, next) => {
    passport.authenticate('ldap', (err: any, user: any, info: any) => {
      if (err) {
        console.error('LDAP authentication error:', err);
        return res.status(500).json({ message: 'LDAP authentication failed', error: err.message });
      }
      
      if (!user) {
        console.log('LDAP authentication failed for user:', req.body.username);
        return res.status(401).json({ message: 'Invalid Active Directory credentials' });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('Login error after LDAP auth:', loginErr);
          return res.status(500).json({ message: 'Login failed after authentication' });
        }
        
        console.log('LDAP login successful for user:', user.username);
        res.json({
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          authSource: 'ldap'
        });
      });
    })(req, res, next);
  });

  // LDAP User Sync Route (for bulk operations)
  app.post('/api/admin/sync-ldap-users', async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      // This would implement bulk user synchronization from AD
      // For now, return a placeholder response
      res.json({ message: 'LDAP user sync functionality available' });
    } catch (error) {
      console.error('LDAP sync error:', error);
      res.status(500).json({ message: 'LDAP sync failed' });
    }
  });
}

// Determine user role based on Active Directory group membership
function determineUserRole(groups: string[]): string {
  if (!groups || !Array.isArray(groups)) {
    return 'analyst';
  }

  // Convert to lowercase for case-insensitive matching
  const groupNames = groups.map(group => group.toLowerCase());

  // Check for admin groups first
  const adminGroups = [
    'cn=security-admins',
    'cn=redteam-admins', 
    'cn=penetration-test-leads',
    'cn=cybersecurity-managers'
  ];

  if (adminGroups.some(adminGroup => 
    groupNames.some(group => group.includes(adminGroup))
  )) {
    return 'admin';
  }

  // Check for lead groups
  const leadGroups = [
    'cn=security-leads',
    'cn=redteam-leads',
    'cn=senior-analysts'
  ];

  if (leadGroups.some(leadGroup => 
    groupNames.some(group => group.includes(leadGroup))
  )) {
    return 'lead';
  }

  // Check for analyst groups
  const analystGroups = [
    'cn=security-analysts',
    'cn=redteam-members',
    'cn=penetration-testers',
    'cn=cybersecurity-team'
  ];

  if (analystGroups.some(analystGroup => 
    groupNames.some(group => group.includes(analystGroup))
  )) {
    return 'analyst';
  }

  // Default role for authenticated AD users
  return 'analyst';
}

// Test LDAP connection
export async function testLDAPConnection(): Promise<boolean> {
  try {
    const ldap = require('ldapjs');
    const client = ldap.createClient({
      url: process.env.LDAP_URL || 'ldap://your-domain-controller.company.com:389',
      timeout: 5000,
      connectTimeout: 5000,
    });

    return new Promise((resolve) => {
      client.bind(
        process.env.LDAP_BIND_DN || 'CN=Service Account,CN=Users,DC=company,DC=com',
        process.env.LDAP_BIND_PASSWORD || 'service-account-password',
        (err: any) => {
          client.unbind();
          if (err) {
            console.error('LDAP connection test failed:', err);
            resolve(false);
          } else {
            console.log('LDAP connection test successful');
            resolve(true);
          }
        }
      );
    });
  } catch (error) {
    console.error('LDAP connection test error:', error);
    return false;
  }
}