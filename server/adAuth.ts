import { Client } from 'ldapjs';
import { Express } from "express";
import { storage } from "./directStorage";
import session from "express-session";

interface ADUser {
  sAMAccountName: string;
  displayName: string;
  mail: string;
  givenName: string;
  sn: string;
  memberOf: string[];
}

export class ActiveDirectoryAuth {
  private ldapUrl: string;
  private bindDN: string;
  private bindPassword: string;
  private searchBase: string;
  private searchFilter: string;

  constructor() {
    this.ldapUrl = process.env.LDAP_URL || 'ldap://localhost:389';
    this.bindDN = process.env.LDAP_BIND_DN || '';
    this.bindPassword = process.env.LDAP_BIND_PASSWORD || '';
    this.searchBase = process.env.LDAP_SEARCH_BASE || 'DC=company,DC=com';
    this.searchFilter = process.env.LDAP_SEARCH_FILTER || '(sAMAccountName={{username}})';
  }

  private createClient(): Client {
    return new Client({
      url: this.ldapUrl,
      timeout: 5000,
      connectTimeout: 5000,
    });
  }

  private mapADGroupsToRole(groups: string[]): string {
    const groupNames = groups.map(dn => {
      const match = dn.match(/CN=([^,]+)/);
      return match ? match[1].toLowerCase() : '';
    });

    if (groupNames.some(g => g.includes('admin') || g.includes('secureteam-admin'))) {
      return 'admin';
    } else if (groupNames.some(g => g.includes('lead') || g.includes('secureteam-lead'))) {
      return 'team_lead';
    } else {
      return 'analyst';
    }
  }

  async authenticateUser(username: string, password: string): Promise<any> {
    if (!this.bindDN || !this.bindPassword) {
      throw new Error('LDAP configuration incomplete');
    }

    const client = this.createClient();

    try {
      // Bind with service account
      await new Promise<void>((resolve, reject) => {
        client.bind(this.bindDN, this.bindPassword, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Search for user
      const searchFilter = this.searchFilter.replace('{{username}}', username);
      const searchResult = await new Promise<any>((resolve, reject) => {
        const opts = {
          filter: searchFilter,
          scope: 'sub',
          attributes: ['sAMAccountName', 'displayName', 'mail', 'givenName', 'sn', 'memberOf']
        };

        client.search(this.searchBase, opts, (err, res) => {
          if (err) return reject(err);

          let user: any = null;
          res.on('searchEntry', (entry) => {
            user = entry.object;
          });

          res.on('error', reject);
          res.on('end', () => {
            if (!user) reject(new Error('User not found'));
            else resolve(user);
          });
        });
      });

      // Authenticate user
      const userDN = searchResult.dn;
      await new Promise<void>((resolve, reject) => {
        const userClient = this.createClient();
        userClient.bind(userDN, password, (err) => {
          userClient.unbind();
          if (err) reject(new Error('Invalid credentials'));
          else resolve();
        });
      });

      // Map user data
      const adUser: ADUser = {
        sAMAccountName: searchResult.sAMAccountName,
        displayName: searchResult.displayName || '',
        mail: searchResult.mail || '',
        givenName: searchResult.givenName || '',
        sn: searchResult.sn || '',
        memberOf: Array.isArray(searchResult.memberOf) ? searchResult.memberOf : [searchResult.memberOf].filter(Boolean)
      };

      return adUser;

    } finally {
      client.unbind();
    }
  }

  async createOrUpdateUser(adUser: ADUser): Promise<any> {
    const userId = `ad_${adUser.sAMAccountName}`;
    const role = this.mapADGroupsToRole(adUser.memberOf);

    // Check if user exists
    let user = await storage.getUser(userId);

    if (user) {
      // Update existing user
      user = await storage.updateUserProfile(userId, {
        firstName: adUser.givenName,
        lastName: adUser.sn,
        email: adUser.mail
      });
      
      // Update role if changed
      if (user && user.role !== role) {
        user = await storage.updateUserRole(userId, role);
      }
    } else {
      // Create new user
      user = await storage.createUser({
        username: userId,
        password: '', // No password for AD users
        firstName: adUser.givenName,
        lastName: adUser.sn,
        email: adUser.mail,
        role: role,
        status: 'active'
      });
    }

    return user;
  }

  async testConnection(): Promise<boolean> {
    if (!this.bindDN || !this.bindPassword) {
      return false;
    }

    const client = this.createClient();

    try {
      await new Promise<void>((resolve, reject) => {
        client.bind(this.bindDN, this.bindPassword, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      return true;
    } catch (error) {
      console.error('LDAP connection test failed:', error);
      return false;
    } finally {
      client.unbind();
    }
  }
}

export const adAuth = new ActiveDirectoryAuth();

export function setupADAuth(app: Express) {
  // Test AD connection endpoint
  app.get('/api/auth/ad/test', async (req, res) => {
    try {
      const isConnected = await adAuth.testConnection();
      res.json({ 
        connected: isConnected,
        configuration: {
          url: process.env.LDAP_URL ? 'configured' : 'missing',
          bindDN: process.env.LDAP_BIND_DN ? 'configured' : 'missing',
          searchBase: process.env.LDAP_SEARCH_BASE ? 'configured' : 'missing'
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Connection test failed' });
    }
  });

  // AD login endpoint
  app.post('/api/auth/ad/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
      }

      // Authenticate with AD
      const adUser = await adAuth.authenticateUser(username, password);
      
      // Create or update user in database
      const user = await adAuth.createOrUpdateUser(adUser);

      // Create session
      (req.session as any).userId = user.id;
      (req.session as any).user = user;

      res.json(user);
    } catch (error: any) {
      console.error('AD authentication error:', error);
      res.status(401).json({ message: error.message || 'Authentication failed' });
    }
  });
}