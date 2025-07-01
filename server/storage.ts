import {
  users,
  findings,
  comments,
  reports,
  messages,
  type User,
  type UpsertUser,
  type Finding,
  type InsertFinding,
  type FindingWithDetails,
  type Comment,
  type InsertComment,
  type CommentWithUser,
  type Report,
  type InsertReport,
  type Message,
  type InsertMessage,
  type MessageWithUser,
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, desc, and, or, like, inArray, sql } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

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
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.firstName);
  }

  async updateUserRole(id: string, role: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Local auth operations
  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0];
  }

  async createUser(userData: { username: string; password: string; firstName: string; lastName: string; email: string; role: string; status?: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        username: userData.username,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        role: userData.role,
        status: (userData as any).status || "pending",
      })
      .returning();
    return user;
  }

  // Profile management
  async updateUserProfile(id: string, updates: { firstName?: string; lastName?: string; email?: string }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        ...updates,
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserPassword(id: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.getUser(id);
    if (!user || !user.password) {
      return false;
    }

    // Import crypto functions for password comparison
    const crypto = require('crypto');
    const { promisify } = require('util');
    const scryptAsync = promisify(crypto.scrypt);

    const comparePasswords = async (supplied: string, stored: string) => {
      const parts = stored.split(".");
      if (parts.length !== 2) {
        return false;
      }
      const [hashed, salt] = parts;
      const hashedBuf = Buffer.from(hashed, "hex");
      const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
      return crypto.timingSafeEqual(hashedBuf, suppliedBuf);
    };

    const hashPassword = async (password: string) => {
      const salt = crypto.randomBytes(16).toString("hex");
      const buf = (await scryptAsync(password, salt, 64)) as Buffer;
      return `${buf.toString("hex")}.${salt}`;
    };

    // Verify current password
    const isCurrentPasswordValid = await comparePasswords(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return false;
    }

    // Hash new password and update
    const hashedNewPassword = await hashPassword(newPassword);
    const [updatedUser] = await db
      .update(users)
      .set({ 
        password: hashedNewPassword,
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();

    return !!updatedUser;
  }

  async updateUserStatus(id: string, status: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        status,
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      const result = await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async resetUserPassword(id: string, newPassword: string): Promise<boolean> {
    try {
      const scryptAsync = promisify(scrypt);

      const hashPassword = async (password: string) => {
        const salt = randomBytes(16).toString("hex");
        const buf = (await scryptAsync(password, salt, 64)) as Buffer;
        return `${buf.toString("hex")}.${salt}`;
      };

      const hashedPassword = await hashPassword(newPassword);
      
      const [updatedUser] = await db
        .update(users)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date() 
        })
        .where(eq(users.id, id))
        .returning();

      return !!updatedUser;
    } catch (error) {
      console.error('Error resetting password:', error);
      return false;
    }
  }

  async createUserByAdmin(userData: { username: string; password: string; firstName: string; lastName: string; email: string; role: string }): Promise<User> {
    const crypto = require('crypto');
    const { promisify } = require('util');
    const scryptAsync = promisify(crypto.scrypt);

    const hashPassword = async (password: string) => {
      const salt = crypto.randomBytes(16).toString("hex");
      const buf = (await scryptAsync(password, salt, 64)) as Buffer;
      return `${buf.toString("hex")}.${salt}`;
    };

    const hashedPassword = await hashPassword(userData.password);
    
    const [user] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        ...userData,
        password: hashedPassword,
        status: 'approved', // Admin-created users are auto-approved
      })
      .returning();
    return user;
  }

  // Finding operations
  async createFinding(finding: InsertFinding): Promise<Finding> {
    const [newFinding] = await db
      .insert(findings)
      .values(finding)
      .returning();
    return newFinding;
  }

  async getFinding(id: number): Promise<FindingWithDetails | undefined> {
    const result = await db
      .select({
        finding: findings,
        reportedBy: users,
      })
      .from(findings)
      .leftJoin(users, eq(findings.reportedById, users.id))
      .where(eq(findings.id, id));

    if (!result.length) return undefined;

    const { finding, reportedBy } = result[0];
    
    // Get assigned users if any
    let assignedUsers: User[] = [];
    if (finding.assignedTo && Array.isArray(finding.assignedTo) && finding.assignedTo.length > 0) {
      assignedUsers = await db
        .select()
        .from(users)
        .where(inArray(users.id, finding.assignedTo as string[]));
    }

    // Get comments count
    const [commentsCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(eq(comments.findingId, id));

    return {
      ...finding,
      reportedBy: reportedBy!,
      assignedUsers,
      commentsCount: commentsCountResult.count,
    };
  }

  async getAllFindings(filters?: {
    severity?: string[];
    status?: string;
    category?: string;
    search?: string;
  }): Promise<FindingWithDetails[]> {
    let query = db
      .select({
        finding: findings,
        reportedBy: users,
      })
      .from(findings)
      .leftJoin(users, eq(findings.reportedById, users.id));

    const conditions = [];

    if (filters?.severity && filters.severity.length > 0) {
      conditions.push(inArray(findings.severity, filters.severity));
    }

    if (filters?.status) {
      conditions.push(eq(findings.status, filters.status));
    }

    if (filters?.category) {
      conditions.push(eq(findings.category, filters.category));
    }

    if (filters?.search) {
      conditions.push(
        or(
          like(findings.title, `%${filters.search}%`),
          like(findings.description, `%${filters.search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const result = await query.orderBy(desc(findings.createdAt));

    // Get comments count for each finding
    const findingIds = result.map(r => r.finding.id);
    const commentsCounts = findingIds.length > 0 ? await db
      .select({
        findingId: comments.findingId,
        count: sql<number>`count(*)`,
      })
      .from(comments)
      .where(inArray(comments.findingId, findingIds))
      .groupBy(comments.findingId) : [];

    const commentsCountMap = new Map(commentsCounts.map(c => [c.findingId, c.count]));

    return result.map(({ finding, reportedBy }) => ({
      ...finding,
      reportedBy: reportedBy!,
      commentsCount: commentsCountMap.get(finding.id) || 0,
    }));
  }

  async updateFinding(id: number, updates: Partial<InsertFinding>): Promise<Finding | undefined> {
    const [finding] = await db
      .update(findings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(findings.id, id))
      .returning();
    return finding;
  }

  async deleteFinding(id: number): Promise<boolean> {
    const result = await db.delete(findings).where(eq(findings.id, id));
    return result.rowCount > 0;
  }

  // Comment operations
  async createComment(comment: InsertComment): Promise<CommentWithUser> {
    const [newComment] = await db
      .insert(comments)
      .values(comment)
      .returning();

    const user = await this.getUser(comment.userId);
    return {
      ...newComment,
      user: user!,
    };
  }

  async getCommentsByFinding(findingId: number): Promise<CommentWithUser[]> {
    const result = await db
      .select({
        comment: comments,
        user: users,
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.findingId, findingId))
      .orderBy(comments.createdAt);

    return result.map(({ comment, user }) => ({
      ...comment,
      user: user!,
    }));
  }

  // Report operations
  async createReport(report: any): Promise<Report> {
    console.log('Storage: Inserting report with data:', report);
    
    // Use raw SQL to bypass Drizzle field mapping issues
    const result = await db.execute(sql`
      INSERT INTO reports (title, description, findings, generated_by_id, format, filename, file_path)
      VALUES (${report.title}, ${report.description}, ${JSON.stringify(report.findings)}, ${report.generatedById}, ${report.format}, ${report.filename}, ${report.filePath})
      RETURNING *
    `);
    
    console.log('Storage: Raw SQL result:', result);
    
    // Get the inserted report
    const [insertedReport] = await db.select().from(reports).where(eq(reports.title, report.title)).orderBy(desc(reports.createdAt)).limit(1);
    console.log('Storage: Retrieved inserted report:', insertedReport);
    
    return insertedReport;
  }

  async getAllReports(): Promise<Report[]> {
    return await db.select().from(reports).orderBy(desc(reports.createdAt));
  }

  async getReport(id: number): Promise<Report | undefined> {
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    return report;
  }

  async deleteReport(id: number): Promise<boolean> {
    try {
      // Get the report to find the file path
      const report = await this.getReport(id);
      
      if (report && report.filePath) {
        // Delete the physical file
        const fs = require('fs');
        const path = require('path');
        const fullPath = path.join(process.cwd(), 'server', report.filePath);
        
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          console.log('Deleted file:', fullPath);
        }
      }
      
      // Delete from database
      const result = await db.delete(reports).where(eq(reports.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting report:', error);
      return false;
    }
  }

  // Statistics
  async getStats(): Promise<{
    total: number;
    critical: number;
    high: number;
    resolved: number;
  }> {
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(findings);

    const [criticalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(findings)
      .where(eq(findings.severity, "critical"));

    const [highResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(findings)
      .where(eq(findings.severity, "high"));

    const [resolvedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(findings)
      .where(eq(findings.status, "resolved"));

    return {
      total: totalResult.count,
      critical: criticalResult.count,
      high: highResult.count,
      resolved: resolvedResult.count,
    };
  }

  // Message operations
  async createMessage(messageData: InsertMessage): Promise<MessageWithUser> {
    try {
      const [message] = await db
        .insert(messages)
        .values(messageData)
        .returning();

      const messageWithUser = await db
        .select({
          id: messages.id,
          content: messages.content,
          userId: messages.userId,
          channel: messages.channel,
          replyTo: messages.replyTo,
          edited: messages.edited,
          createdAt: messages.createdAt,
          updatedAt: messages.updatedAt,
          user: {
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            role: users.role,
            status: users.status,
            profileImageUrl: users.profileImageUrl,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          }
        })
        .from(messages)
        .innerJoin(users, eq(messages.userId, users.id))
        .where(eq(messages.id, message.id));

      return messageWithUser[0] as MessageWithUser;
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }

  async getMessages(channel: string, limit: number = 50, offset: number = 0): Promise<MessageWithUser[]> {
    try {
      const result = await db
        .select({
          id: messages.id,
          content: messages.content,
          userId: messages.userId,
          channel: messages.channel,
          replyTo: messages.replyTo,
          edited: messages.edited,
          createdAt: messages.createdAt,
          updatedAt: messages.updatedAt,
          user: {
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            role: users.role,
            status: users.status,
            profileImageUrl: users.profileImageUrl,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          }
        })
        .from(messages)
        .innerJoin(users, eq(messages.userId, users.id))
        .where(eq(messages.channel, channel))
        .orderBy(desc(messages.createdAt))
        .limit(limit)
        .offset(offset);

      return result as MessageWithUser[];
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }

  async updateMessage(id: number, content: string): Promise<Message | undefined> {
    try {
      const [updatedMessage] = await db
        .update(messages)
        .set({ 
          content, 
          edited: true,
          updatedAt: new Date() 
        })
        .where(eq(messages.id, id))
        .returning();

      return updatedMessage;
    } catch (error) {
      console.error('Error updating message:', error);
      return undefined;
    }
  }

  async deleteMessage(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(messages)
        .where(eq(messages.id, id));

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  }

  async getChannels(): Promise<string[]> {
    try {
      const result = await db
        .selectDistinct({ channel: messages.channel })
        .from(messages);

      return result.map(r => r.channel);
    } catch (error) {
      console.error('Error getting channels:', error);
      return ['general'];
    }
  }
}

export const storage = new DatabaseStorage();
