import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - supports both Replit Auth, local auth, and LDAP auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  username: varchar("username").unique(), // For local auth and LDAP
  password: varchar("password"), // For local auth (hashed)
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("analyst"), // admin, team_lead, analyst
  status: varchar("status").notNull().default("pending"), // pending, approved, suspended
  authSource: varchar("auth_source").notNull().default("local"), // local, ldap, replit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Findings table
export const findings = pgTable("findings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: varchar("severity").notNull(), // critical, high, medium, low
  category: varchar("category").notNull(), // web_application, network, infrastructure, social_engineering, indicator_of_compromise, malware, domain, network_traffic
  status: varchar("status").notNull().default("open"), // open, in_progress, resolved, verified
  cvssScore: text("cvss_score"),
  affectedUrl: text("affected_url"),
  payload: text("payload"),
  evidence: jsonb("evidence").default([]), // Array of file URLs/paths
  networkTopology: jsonb("network_topology"), // Network nodes and connections for visualization
  exploitationFlow: jsonb("exploitation_flow"), // Attack steps and timeline for exploitation diagrams
  mitreAttack: jsonb("mitre_attack"), // MITRE ATT&CK framework mapping
  reportedById: varchar("reported_by_id")
    .notNull()
    .references(() => users.id),
  assignedTo: jsonb("assigned_to").default([]), // Array of user IDs
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// File attachments table for findings
export const attachments = pgTable("attachments", {
  id: serial("id").primaryKey(),
  findingId: integer("finding_id")
    .notNull()
    .references(() => findings.id, { onDelete: "cascade" }),
  filename: varchar("filename").notNull(),
  originalName: varchar("original_name").notNull(),
  filePath: varchar("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type").notNull(),
  uploadedById: varchar("uploaded_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Comments table
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  findingId: integer("finding_id")
    .notNull()
    .references(() => findings.id, { onDelete: "cascade" }),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reports table
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  findings: jsonb("findings").notNull(), // Array of finding IDs
  generatedById: varchar("generated_by_id")
    .notNull()
    .references(() => users.id),
  format: varchar("format").notNull().default("pdf"), // pdf, html
  filename: varchar("filename"),
  filePath: varchar("file_path"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages table for chat/message board
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  channel: varchar("channel").notNull().default("general"),
  replyTo: integer("reply_to"),
  edited: boolean("edited").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertFindingSchema = createInsertSchema(findings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAttachmentSchema = createInsertSchema(attachments).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertFinding = z.infer<typeof insertFindingSchema>;
export type Finding = typeof findings.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;
export type Attachment = typeof attachments.$inferSelect;

// Extended types with joins
export type FindingWithDetails = Finding & {
  reportedBy: User;
  assignedUsers?: User[];
  commentsCount?: number;
  attachments?: Attachment[];
};

export type CommentWithUser = Comment & {
  user: User;
};

export type AttachmentWithUser = Attachment & {
  uploadedBy: User;
};

export type MessageWithUser = Message & {
  user: User;
  replyToMessage?: MessageWithUser;
};
