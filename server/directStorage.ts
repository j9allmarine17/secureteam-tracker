import { pool } from "./db";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import * as fs from 'fs';
import * as path from 'path';
import {
  User,
  UpsertUser,
  InsertFinding,
  Finding,
  InsertComment,
  Comment,
  InsertReport,
  Report,
  InsertMessage,
  Message,
  InsertAttachment,
  Attachment,
  FindingWithDetails,
  CommentWithUser,
  MessageWithUser,
  AttachmentWithUser
} from "@shared/schema";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split('.');
  const hashedBuf = Buffer.from(hashed, 'hex');
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Additional user operations
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: string, role: string): Promise<User | undefined>;
  updateUserStatus(id: string, status: string): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  resetUserPassword(id: string, newPassword: string): Promise<boolean>;
  
  // Local auth operations
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: { username: string; password: string; firstName: string; lastName: string; email: string; role: string; status?: string }): Promise<User>;
  createUserByAdmin(user: { username: string; password: string; firstName: string; lastName: string; email: string; role: string }): Promise<User>;
  
  // Profile management
  updateUserProfile(id: string, updates: { firstName?: string; lastName?: string; email?: string }): Promise<User | undefined>;
  updateUserPassword(id: string, currentPassword: string, newPassword: string): Promise<boolean>;
  
  // Finding operations
  createFinding(finding: InsertFinding): Promise<Finding>;
  getFinding(id: number): Promise<FindingWithDetails | undefined>;
  getAllFindings(filters?: {
    severity?: string[];
    status?: string;
    category?: string;
    search?: string;
  }): Promise<FindingWithDetails[]>;
  updateFinding(id: number, updates: Partial<InsertFinding>): Promise<Finding | undefined>;
  deleteFinding(id: number): Promise<boolean>;
  
  // Comment operations
  createComment(comment: InsertComment): Promise<CommentWithUser>;
  getCommentsByFinding(findingId: number): Promise<CommentWithUser[]>;
  
  // Report operations
  createReport(report: InsertReport): Promise<Report>;
  getAllReports(): Promise<Report[]>;
  getReport(id: number): Promise<Report | undefined>;
  deleteReport(id: number): Promise<boolean>;
  
  // Statistics
  getStats(): Promise<{
    total: number;
    critical: number;
    high: number;
    resolved: number;
  }>;

  // Message operations
  createMessage(message: InsertMessage): Promise<MessageWithUser>;
  getMessages(channel: string, limit?: number, offset?: number): Promise<MessageWithUser[]>;
  updateMessage(id: number, content: string): Promise<Message | undefined>;
  deleteMessage(id: number): Promise<boolean>;
  getChannels(): Promise<string[]>;

  // Attachment operations
  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
  getAttachment(id: number): Promise<AttachmentWithUser | undefined>;
  getAttachmentsByFinding(findingId: number): Promise<AttachmentWithUser[]>;
  deleteAttachment(id: number): Promise<boolean>;
}

export class DirectStorage implements IStorage {
  constructor() {
    // Using shared database connection from db.ts
  }

  private async query(text: string, params: any[] = []): Promise<any[]> {
    try {
      const result = await pool.query(text, params);
      // Handle Neon serverless database result format
      if (result && result.rows) {
        return result.rows;
      }
      // If result is already an array, return it
      if (Array.isArray(result)) {
        return result;
      }
      // If result is a single object, wrap it in an array
      if (result && typeof result === 'object') {
        return [result];
      }
      return [];
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  private async queryWithRowCount(text: string, params: any[] = []): Promise<{ rows: any[], rowCount: number }> {
    try {
      const result = await pool.query(text, params);
      // Handle Neon serverless database result format
      if (result && result.rows !== undefined) {
        return {
          rows: result.rows,
          rowCount: (result as any).rowCount || result.rows.length
        };
      }
      // If result is already an array, return it
      if (Array.isArray(result)) {
        return {
          rows: result,
          rowCount: result.length
        };
      }
      // If result is a single object, wrap it in an array
      if (result && typeof result === 'object') {
        return {
          rows: [result],
          rowCount: 1
        };
      }
      return { rows: [], rowCount: 0 };
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  private mapUserRow(row: any): User {
    return {
      id: row.id,
      username: row.username,
      password: row.password,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      profileImageUrl: row.profile_image_url,
      role: row.role,
      status: row.status,
      authSource: row.auth_source || 'local',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapFindingRow(row: any): Finding {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      severity: row.severity,
      status: row.status,
      category: row.category,
      cvssScore: row.cvss_score,
      affectedUrl: row.affected_url,
      payload: row.payload,
      evidence: row.evidence,
      reportedById: row.reported_by_id,
      assignedTo: row.assigned_to,
      networkTopology: row.network_topology || null,
      exploitationFlow: row.exploitation_flow || null,
      mitreAttack: row.mitre_attack || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const rows = await this.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] ? this.mapUserRow(rows[0]) : undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Determine auth source based on user ID prefix
    const authSource = userData.id.startsWith('ad_') ? 'ldap' : 
                      userData.id.includes('replit') ? 'replit' : 'local';
    
    const rows = await this.query(`
      INSERT INTO users (id, username, password, email, first_name, last_name, profile_image_url, role, status, auth_source, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        profile_image_url = EXCLUDED.profile_image_url,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        auth_source = EXCLUDED.auth_source,
        updated_at = NOW()
      RETURNING *
    `, [
      userData.id,
      userData.username,
      userData.password,
      userData.email,
      userData.firstName,
      userData.lastName,
      userData.profileImageUrl,
      userData.role || 'analyst',
      userData.status || 'pending',
      authSource
    ]);
    return this.mapUserRow(rows[0]);
  }

  async getAllUsers(): Promise<User[]> {
    const rows = await this.query('SELECT * FROM users ORDER BY created_at DESC');
    return rows.map(row => this.mapUserRow(row));
  }

  async updateUserRole(id: string, role: string): Promise<User | undefined> {
    const rows = await this.query(`
      UPDATE users SET role = $2, updated_at = NOW() 
      WHERE id = $1 RETURNING *
    `, [id, role]);
    return rows[0] ? this.mapUserRow(rows[0]) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const rows = await this.query('SELECT * FROM users WHERE username = $1', [username]);
    return rows[0] ? this.mapUserRow(rows[0]) : undefined;
  }

  async createUser(userData: { username: string; password: string; firstName: string; lastName: string; email: string; role: string; status?: string }): Promise<User> {
    try {
      console.log('Creating user with data:', { ...userData, password: '[REDACTED]' });
      
      const hashedPassword = await hashPassword(userData.password);
      const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const rows = await this.query(`
        INSERT INTO users (id, username, password, first_name, last_name, email, role, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `, [id, userData.username, hashedPassword, userData.firstName, userData.lastName, userData.email, userData.role, userData.status || 'active']);
      
      if (!rows || rows.length === 0) {
        throw new Error('No data returned from database insert');
      }
      
      return this.mapUserRow(rows[0]);
    } catch (error) {
      console.error('Database error in createUser:', error);
      throw error;
    }
  }

  async updateUserProfile(id: string, updates: { firstName?: string; lastName?: string; email?: string }): Promise<User | undefined> {
    const setParts = [];
    const values = [];
    let paramCount = 1;

    if (updates.firstName !== undefined) {
      setParts.push(`first_name = $${paramCount++}`);
      values.push(updates.firstName);
    }
    if (updates.lastName !== undefined) {
      setParts.push(`last_name = $${paramCount++}`);
      values.push(updates.lastName);
    }
    if (updates.email !== undefined) {
      setParts.push(`email = $${paramCount++}`);
      values.push(updates.email);
    }

    if (setParts.length === 0) return this.getUser(id);

    setParts.push(`updated_at = NOW()`);
    values.push(id);

    const rows = await this.query(`
      UPDATE users SET ${setParts.join(', ')} 
      WHERE id = $${paramCount} RETURNING *
    `, values);
    
    return rows[0] ? this.mapUserRow(rows[0]) : undefined;
  }

  async updateUserPassword(id: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.getUser(id);
    if (!user || !user.password) return false;

    const isValid = await comparePasswords(currentPassword, user.password);
    if (!isValid) return false;

    const hashedPassword = await hashPassword(newPassword);
    await this.query(`
      UPDATE users SET password = $2, updated_at = NOW() 
      WHERE id = $1
    `, [id, hashedPassword]);
    
    return true;
  }

  async updateUserStatus(id: string, status: string): Promise<User | undefined> {
    const rows = await this.query(`
      UPDATE users SET status = $2, updated_at = NOW() 
      WHERE id = $1 RETURNING *
    `, [id, status]);
    return rows[0] ? this.mapUserRow(rows[0]) : undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      console.log('Attempting to delete user:', id);
      
      // First check if user exists
      const user = await this.getUser(id);
      if (!user) {
        console.log('User not found for deletion:', id);
        return false;
      }
      
      console.log('Found user for deletion:', user.username);
      
      // Start cascading deletion process
      console.log('Starting cascading deletion process...');
      
      // 1. Update findings first - reassign to admin user
      await this.query('UPDATE findings SET reported_by_id = $1 WHERE reported_by_id = $2', ['admin_user_001', id]);
      console.log('Reassigned findings to admin user');
      
      // 2. Delete user's attachments 
      await this.query('DELETE FROM attachments WHERE uploaded_by_id = $1', [id]);
      console.log('Deleted user attachments');
      
      // 3. Delete user's comments
      await this.query('DELETE FROM comments WHERE user_id = $1', [id]);
      console.log('Deleted user comments');
      
      // 4. Delete user's messages
      await this.query('DELETE FROM messages WHERE user_id = $1', [id]);
      console.log('Deleted user messages');
      
      // 5. Delete reports generated by user (and their files)
      const reports = await this.query('SELECT * FROM reports WHERE generated_by_id = $1', [id]);
      for (const report of reports) {
        if (report.file_path) {
          try {
            const fullPath = path.join(process.cwd(), 'server', report.file_path);
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
              console.log('Deleted report file:', fullPath);
            }
          } catch (fileError) {
            console.warn('Failed to delete report file:', fileError);
          }
        }
      }
      await this.query('DELETE FROM reports WHERE generated_by_id = $1', [id]);
      console.log('Deleted user reports');
      
      // 6. Finally delete the user
      await this.query('DELETE FROM users WHERE id = $1', [id]);
      console.log('Deleted user from database');
      
      // Verify deletion
      const verifyDeleted = await this.getUser(id);
      const success = !verifyDeleted;
      
      if (success) {
        console.log('User deletion successful:', id);
      } else {
        console.error('User deletion failed - still exists:', id);
      }
      
      return success;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async resetUserPassword(id: string, newPassword: string): Promise<boolean> {
    const hashedPassword = await hashPassword(newPassword);
    await this.query(`
      UPDATE users SET password = $2, updated_at = NOW() 
      WHERE id = $1
    `, [id, hashedPassword]);
    return true;
  }

  async createUserByAdmin(userData: { username: string; password: string; firstName: string; lastName: string; email: string; role: string }): Promise<User> {
    return this.createUser({ ...userData, status: 'active' });
  }

  // Finding operations
  async createFinding(finding: InsertFinding): Promise<Finding> {
    try {
      console.log('Creating finding with data:', finding);
      
      const rows = await this.query(`
        INSERT INTO findings (title, description, severity, status, category, cvss_score, affected_url, payload, evidence, reported_by_id, assigned_to, mitre_attack, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING *
      `, [
        finding.title, 
        finding.description, 
        finding.severity, 
        finding.status || 'open', 
        finding.category,
        finding.cvssScore || null, 
        finding.affectedUrl || null, 
        finding.payload || null, 
        JSON.stringify(finding.evidence || []),
        finding.reportedById, 
        JSON.stringify(finding.assignedTo || []),
        JSON.stringify(finding.mitreAttack || {})
      ]);
      
      if (!rows || rows.length === 0) {
        throw new Error('No data returned from database insert');
      }
      
      return this.mapFindingRow(rows[0]);
    } catch (error) {
      console.error('Database error in createFinding:', error);
      throw error;
    }
  }

  async getFinding(id: number): Promise<FindingWithDetails | undefined> {
    const rows = await this.query(`
      SELECT f.*, u.id as reporter_id, u.username as reporter_username, u.first_name as reporter_first_name, u.last_name as reporter_last_name, u.email as reporter_email, u.role as reporter_role, u.status as reporter_status, u.auth_source as reporter_auth_source
      FROM findings f
      LEFT JOIN users u ON f.reported_by_id = u.id
      WHERE f.id = $1
    `, [id]);
    
    if (!rows[0]) return undefined;
    
    const finding = this.mapFindingRow(rows[0]);
    return {
      ...finding,
      reportedBy: {
        id: rows[0].reporter_id,
        username: rows[0].reporter_username,
        firstName: rows[0].reporter_first_name,
        lastName: rows[0].reporter_last_name,
        email: rows[0].reporter_email,
        password: null,
        profileImageUrl: null,
        role: rows[0].user_role || 'analyst',
        status: rows[0].user_status || 'active',
        authSource: rows[0].user_auth_source || 'local',
        createdAt: null,
        updatedAt: null
      }
    };
  }

  async getAllFindings(filters?: { severity?: string[]; status?: string; category?: string; search?: string }): Promise<FindingWithDetails[]> {
    let query = `
      SELECT f.*, u.id as reporter_id, u.username as reporter_username, u.first_name as reporter_first_name, u.last_name as reporter_last_name, u.email as reporter_email
      FROM findings f
      LEFT JOIN users u ON f.reported_by_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.severity && filters.severity.length > 0) {
      query += ` AND f.severity = ANY($${paramCount++})`;
      params.push(filters.severity);
    }

    if (filters?.status) {
      query += ` AND f.status = $${paramCount++}`;
      params.push(filters.status);
    }

    if (filters?.category) {
      query += ` AND f.category = $${paramCount++}`;
      params.push(filters.category);
    }

    if (filters?.search) {
      query += ` AND (f.title ILIKE $${paramCount++} OR f.description ILIKE $${paramCount++})`;
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    query += ' ORDER BY f.created_at DESC';

    const rows = await this.query(query, params);
    return rows.map(row => ({
      ...this.mapFindingRow(row),
      reportedBy: {
        id: row.reporter_id,
        username: row.reporter_username,
        firstName: row.reporter_first_name,
        lastName: row.reporter_last_name,
        email: row.reporter_email,
        password: null,
        profileImageUrl: null,
        role: 'user',
        status: 'active',
        createdAt: null,
        updatedAt: null
      }
    }));
  }

  async updateFinding(id: number, updates: Partial<InsertFinding>): Promise<Finding | undefined> {
    const setParts = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (updates[key as keyof InsertFinding] !== undefined) {
        const dbKey = key === 'reportedById' ? 'reported_by_id' : 
                     key === 'assignedTo' ? 'assigned_to' :
                     key === 'cvssScore' ? 'cvss_score' :
                     key === 'cweId' ? 'cwe_id' :
                     key === 'mitreAttack' ? 'mitre_attack' :
                     key === 'networkTopology' ? 'network_topology' :
                     key === 'exploitationFlow' ? 'exploitation_flow' :
                     key.replace(/([A-Z])/g, '_$1').toLowerCase();
        setParts.push(`${dbKey} = $${paramCount++}`);
        
        // Handle array fields that need JSON stringification
        let value = updates[key as keyof InsertFinding];
        if (key === 'assignedTo' || key === 'evidence' || key === 'mitreAttack' || key === 'networkTopology' || key === 'exploitationFlow') {
          value = JSON.stringify(value || (key === 'assignedTo' || key === 'evidence' ? [] : {}));
        }
        values.push(value);
      }
    });

    if (setParts.length === 0) {
      const rows = await this.query('SELECT * FROM findings WHERE id = $1', [id]);
      return rows[0] ? this.mapFindingRow(rows[0]) : undefined;
    }

    setParts.push(`updated_at = NOW()`);
    values.push(id);

    const rows = await this.query(`
      UPDATE findings SET ${setParts.join(', ')} 
      WHERE id = $${paramCount} RETURNING *
    `, values);
    
    return rows[0] ? this.mapFindingRow(rows[0]) : undefined;
  }

  async deleteFinding(id: number): Promise<boolean> {
    try {
      // First check if the finding exists
      const existing = await this.query('SELECT id FROM findings WHERE id = $1', [id]);
      if (existing.length === 0) {
        return false;
      }
      
      // Delete the finding
      await this.query('DELETE FROM findings WHERE id = $1', [id]);
      
      // Verify deletion by checking if it still exists
      const verifyDeleted = await this.query('SELECT id FROM findings WHERE id = $1', [id]);
      const success = verifyDeleted.length === 0;
      
      console.log(`Finding ${id} deletion ${success ? 'successful' : 'failed'}`);
      return success;
    } catch (error) {
      console.error('Error deleting finding:', error);
      return false;
    }
  }

  // Comment operations
  async createComment(comment: InsertComment): Promise<CommentWithUser> {
    const rows = await this.query(`
      INSERT INTO comments (content, finding_id, user_id, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `, [comment.content, comment.findingId, comment.userId]);
    
    const user = await this.getUser(comment.userId);
    return {
      id: rows[0].id,
      content: rows[0].content,
      findingId: rows[0].finding_id,
      userId: rows[0].user_id,
      createdAt: rows[0].created_at,
      user: user!
    };
  }

  async getCommentsByFinding(findingId: number): Promise<CommentWithUser[]> {
    const rows = await this.query(`
      SELECT c.*, u.id as user_id, u.username, u.first_name, u.last_name, u.email, u.role as user_role, u.status as user_status, u.auth_source as user_auth_source
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.finding_id = $1
      ORDER BY c.created_at ASC
    `, [findingId]);
    
    return rows.map(row => ({
      id: row.id,
      content: row.content,
      findingId: row.finding_id,
      userId: row.user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      user: {
        id: row.user_id,
        username: row.username,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        password: null,
        profileImageUrl: null,
        role: 'user',
        status: 'active',
        createdAt: null,
        updatedAt: null
      }
    }));
  }

  // Report operations
  async createReport(report: any): Promise<Report> {
    const rows = await this.query(`
      INSERT INTO reports (title, description, findings, generated_by_id, format, filename, file_path, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `, [report.title, report.description, JSON.stringify(report.findings), report.generatedById, report.format || 'pdf', report.filename, report.filePath]);
    
    return {
      id: rows[0].id,
      title: rows[0].title,
      description: rows[0].description,
      findings: rows[0].findings,
      generatedById: rows[0].generated_by_id,
      format: rows[0].format,
      filename: rows[0].filename,
      filePath: rows[0].file_path,
      createdAt: rows[0].created_at
    };
  }

  async getAllReports(): Promise<Report[]> {
    const rows = await this.query('SELECT * FROM reports ORDER BY created_at DESC');
    return rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      findings: row.findings,
      generatedById: row.generated_by_id,
      format: row.format,
      filename: row.filename,
      filePath: row.file_path,
      createdAt: row.created_at
    }));
  }

  async getReport(id: number): Promise<Report | undefined> {
    const rows = await this.query('SELECT * FROM reports WHERE id = $1', [id]);
    if (!rows[0]) return undefined;
    
    return {
      id: rows[0].id,
      title: rows[0].title,
      description: rows[0].description,
      findings: rows[0].findings,
      generatedById: rows[0].generated_by_id,
      format: rows[0].format,
      filename: rows[0].filename,
      filePath: rows[0].file_path,
      createdAt: rows[0].created_at
    };
  }

  async deleteReport(id: number): Promise<boolean> {
    try {
      console.log('Attempting to delete report:', id);
      
      // First get the report to check if it exists
      const report = await this.getReport(id);
      
      if (!report) {
        console.log('Report not found for deletion:', id);
        return false;
      }
      
      console.log('Found report for deletion:', report.title);
      
      // Delete the physical file if it exists
      if (report.filePath) {
        try {
          const fullPath = path.join(process.cwd(), 'server', report.filePath);
          
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            console.log('Deleted report file:', fullPath);
          } else {
            console.log('Report file not found on disk:', fullPath);
          }
        } catch (fileError) {
          console.warn('Failed to delete file, continuing with database deletion:', fileError);
        }
      }
      
      // Delete from database
      console.log('Deleting report from database...');
      await this.query('DELETE FROM reports WHERE id = $1', [id]);
      
      // Verify deletion
      const verifyDeleted = await this.getReport(id);
      const success = !verifyDeleted;
      
      if (success) {
        console.log('Report deletion successful:', id);
      } else {
        console.error('Report deletion failed - still exists:', id);
      }
      
      return success;
    } catch (error) {
      console.error('Error deleting report:', error);
      return false;
    }
  }

  // Statistics
  async getStats(): Promise<{ total: number; critical: number; high: number; resolved: number }> {
    const rows = await this.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN severity = 'Critical' THEN 1 END) as critical,
        COUNT(CASE WHEN severity = 'High' THEN 1 END) as high,
        COUNT(CASE WHEN status = 'Resolved' THEN 1 END) as resolved
      FROM findings
    `);
    
    return {
      total: parseInt(rows[0].total) || 0,
      critical: parseInt(rows[0].critical) || 0,
      high: parseInt(rows[0].high) || 0,
      resolved: parseInt(rows[0].resolved) || 0
    };
  }

  // Message operations
  async createMessage(messageData: InsertMessage): Promise<MessageWithUser> {
    const rows = await this.query(`
      INSERT INTO messages (content, channel, user_id, reply_to, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `, [messageData.content, messageData.channel, messageData.userId, messageData.replyTo || null]);
    
    const user = await this.getUser(messageData.userId);
    return {
      id: rows[0].id,
      content: rows[0].content,
      channel: rows[0].channel,
      userId: rows[0].user_id,
      replyTo: rows[0].reply_to,
      edited: rows[0].edited || false,
      createdAt: rows[0].created_at,
      updatedAt: rows[0].updated_at,
      user: user!
    };
  }

  async getMessages(channel: string, limit: number = 50, offset: number = 0): Promise<MessageWithUser[]> {
    const rows = await this.query(`
      SELECT m.*, u.id as user_id, u.username, u.first_name, u.last_name, u.email, u.role as user_role, u.status as user_status, u.auth_source as user_auth_source
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.channel = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `, [channel, limit, offset]);
    
    return rows.map(row => ({
      id: row.id,
      content: row.content,
      channel: row.channel,
      userId: row.user_id,
      replyTo: row.reply_to,
      edited: row.edited || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      user: {
        id: row.user_id,
        username: row.username,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        password: null,
        profileImageUrl: null,
        role: 'user',
        status: 'active',
        createdAt: null,
        updatedAt: null
      }
    }));
  }

  async updateMessage(id: number, content: string): Promise<Message | undefined> {
    const rows = await this.query(`
      UPDATE messages SET content = $2, updated_at = NOW() 
      WHERE id = $1 RETURNING *
    `, [id, content]);
    
    if (!rows[0]) return undefined;
    
    return {
      id: rows[0].id,
      content: rows[0].content,
      channel: rows[0].channel,
      userId: rows[0].user_id,
      replyTo: rows[0].reply_to,
      edited: rows[0].edited || false,
      createdAt: rows[0].created_at,
      updatedAt: rows[0].updated_at
    };
  }

  async deleteMessage(id: number): Promise<boolean> {
    const rows = await this.query('DELETE FROM messages WHERE id = $1', [id]);
    return rows.length > 0;
  }

  async getChannels(): Promise<string[]> {
    const rows = await this.query('SELECT DISTINCT channel FROM messages ORDER BY channel');
    return rows.map(row => row.channel);
  }

  // Attachment operations
  async getAttachment(id: number): Promise<AttachmentWithUser | undefined> {
    const rows = await this.query(`
      SELECT 
        a.*,
        u.id as user_id,
        u.username,
        u.first_name,
        u.last_name,
        u.email,
        u.role
      FROM attachments a
      LEFT JOIN users u ON a.uploaded_by_id = u.id
      WHERE a.id = $1
    `, [id]);

    if (!rows[0]) return undefined;

    const row = rows[0];
    return {
      id: row.id,
      findingId: row.finding_id,
      filename: row.filename,
      originalName: row.original_name,
      filePath: row.file_path,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      uploadedById: row.uploaded_by_id,
      createdAt: row.created_at,
      uploadedBy: {
        id: row.user_id,
        username: row.username,
        password: null,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        profileImageUrl: null,
        role: row.role,
        status: 'approved',
        createdAt: null,
        updatedAt: null
      }
    };
  }

  async createAttachment(attachment: InsertAttachment): Promise<Attachment> {
    const rows = await this.query(`
      INSERT INTO attachments (finding_id, filename, original_name, file_path, file_size, mime_type, uploaded_by_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `, [
      attachment.findingId,
      attachment.filename,
      attachment.originalName,
      attachment.filePath,
      attachment.fileSize,
      attachment.mimeType,
      attachment.uploadedById
    ]);

    return {
      id: rows[0].id,
      findingId: rows[0].finding_id,
      filename: rows[0].filename,
      originalName: rows[0].original_name,
      filePath: rows[0].file_path,
      fileSize: rows[0].file_size,
      mimeType: rows[0].mime_type,
      uploadedById: rows[0].uploaded_by_id,
      createdAt: rows[0].created_at
    };
  }

  async getAttachmentsByFinding(findingId: number): Promise<AttachmentWithUser[]> {
    const rows = await this.query(`
      SELECT 
        a.*,
        u.id as user_id,
        u.username,
        u.first_name,
        u.last_name,
        u.email,
        u.role
      FROM attachments a
      LEFT JOIN users u ON a.uploaded_by_id = u.id
      WHERE a.finding_id = $1
      ORDER BY a.created_at DESC
    `, [findingId]);

    return rows.map((row: any) => ({
      id: row.id,
      findingId: row.finding_id,
      filename: row.filename,
      originalName: row.original_name,
      filePath: row.file_path,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      uploadedById: row.uploaded_by_id,
      createdAt: row.created_at,
      uploadedBy: {
        id: row.user_id,
        username: row.username,
        password: null,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        profileImageUrl: null,
        role: row.role,
        status: 'approved',
        createdAt: null,
        updatedAt: null
      }
    }));
  }

  async deleteAttachment(id: number): Promise<boolean> {
    const rows = await this.query('DELETE FROM attachments WHERE id = $1', [id]);
    return rows.length > 0;
  }
}

export const storage = new DirectStorage();