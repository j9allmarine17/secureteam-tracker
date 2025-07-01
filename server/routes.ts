import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./directStorage";
import { setupSimpleAuth, isAuthenticated } from "./simpleAuth";
import { setupADAuth } from "./adAuth";
import { insertFindingSchema, insertCommentSchema, insertReportSchema, insertMessageSchema, insertAttachmentSchema } from "@shared/schema";
import { generateReport } from "./reportGenerator";
import { validatePassword } from "./passwordValidator";
import { emailService, emailTemplates } from "./emailService";
import { liveDataService } from "./liveDataService";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { Pool } from "pg";
import multer from "multer";
import crypto from "crypto";
import { pool } from "./db";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupSimpleAuth(app);
  setupADAuth(app);

  // Add middleware to ensure all API responses are JSON
  app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Production registration diagnostic endpoint
  app.get('/api/debug/registration', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const testData = {
        currentUser: user,
        isAdmin: user?.role === 'admin',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        dbTest: null as any
      };

      // Test database connection with user query
      try {
        const adminUser = await storage.getUserByUsername('admin');
        testData.dbTest = { success: true, adminExists: !!adminUser };
      } catch (error) {
        testData.dbTest = { success: false, error: error instanceof Error ? error.message : String(error) };
      }

      res.json(testData);
    } catch (error) {
      console.error('Registration diagnostic error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Configure multer for file uploads
  const uploadsDir = path.join(process.cwd(), 'server', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadsDir,
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + crypto.randomUUID();
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
      }
    }),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      // Allow images, documents, and common file types
      const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only images, documents, and archive files are allowed!'));
      }
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // For local auth, the user is already available in req.user
      res.json({
        id: req.user.id,
        username: req.user.username,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        role: req.user.role,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User management routes
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/users/:id/role', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'team_lead')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { id } = req.params;
      const { role } = req.body;

      if (!['admin', 'team_lead', 'analyst'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const updatedUser = await storage.updateUserRole(id, role);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const { id } = req.params;
      
      // Users can only update their own profile or admins can update anyone's
      if (currentUser.id !== id && currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { firstName, lastName, email } = req.body;
      const updatedUser = await storage.updateUserProfile(id, { firstName, lastName, email });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        role: updatedUser.role,
      });
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.patch('/api/users/:id/password', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const { id } = req.params;
      
      // Users can only update their own password
      if (currentUser.id !== id) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { currentPassword, newPassword } = req.body;
      
      // Validate new password strength
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ 
          message: 'Password does not meet security requirements',
          errors: passwordValidation.errors
        });
      }
      
      const success = await storage.updateUserPassword(id, currentPassword, newPassword);
      
      if (!success) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  // Admin-only user management routes
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      // Check if user is admin
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/admin/users/:id/role', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const { id } = req.params;
      const { role } = req.body;
      
      // Check if user is admin
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Prevent admin from demoting themselves
      if (currentUser.id === id && role !== 'admin') {
        return res.status(400).json({ message: "Cannot change your own admin role" });
      }

      // Validate role
      if (!['admin', 'user'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be 'admin' or 'user'" });
      }

      const updatedUser = await storage.updateUserRole(id, role);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch('/api/admin/users/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const { id } = req.params;
      const { status } = req.body;
      
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (!['pending', 'approved', 'suspended'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const updatedUser = await storage.updateUserStatus(id, status);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // Get pending users for admin approval
  app.get('/api/admin/pending-users', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const allUsers = await storage.getAllUsers();
      const pendingUsers = allUsers.filter(user => user.status === 'pending');
      
      // Remove password from response
      const sanitizedUsers = pendingUsers.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));

      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching pending users:", error);
      res.status(500).json({ message: "Failed to fetch pending users" });
    }
  });

  // Approve user endpoint
  app.post('/api/admin/users/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const { id } = req.params;
      
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const updatedUser = await storage.updateUserStatus(id, 'approved');
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Send approval email to the user
      if (process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true' && updatedUser.email) {
        const template = emailTemplates.userApproved({
          firstName: updatedUser.firstName || '',
          lastName: updatedUser.lastName || '',
          email: updatedUser.email
        });
        await emailService.sendEmail({
          to: updatedUser.email,
          subject: template.subject,
          html: template.html
        });
      }

      res.json({ message: "User approved successfully", user: updatedUser });
    } catch (error) {
      console.error("Error approving user:", error);
      res.status(500).json({ message: "Failed to approve user" });
    }
  });

  app.delete('/api/admin/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const { id } = req.params;
      
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (currentUser.id === id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.post('/api/admin/users', isAuthenticated, async (req: any, res) => {
    console.log('=== User Registration Request Started ===');
    console.log('Request body:', req.body);
    console.log('Current user:', req.user);
    
    try {
      const currentUser = req.user;
      
      if (!currentUser) {
        console.log('No current user found');
        return res.status(401).json({ message: "Authentication required" });
      }
      
      if (currentUser.role !== 'admin') {
        console.log('User role check failed:', currentUser.role);
        return res.status(403).json({ message: "Admin access required" });
      }

      const { username, password, firstName, lastName, email, role } = req.body;
      console.log('Extracted fields:', { username, firstName, lastName, email, role, hasPassword: !!password });

      // Validate required fields
      if (!username || !password || !firstName || !lastName || !email || !role) {
        console.log('Missing required fields');
        return res.status(400).json({ message: "All fields are required" });
      }

      // Validate password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        console.log('Password validation failed:', passwordValidation.errors);
        return res.status(400).json({ 
          message: 'Password does not meet security requirements',
          errors: passwordValidation.errors
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        console.log('Invalid email format:', email);
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Validate role
      if (!['admin', 'user'].includes(role)) {
        console.log('Invalid role:', role);
        return res.status(400).json({ message: "Invalid role" });
      }

      console.log('Checking for existing user...');
      // Check for existing user
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        console.log('Username already exists:', username);
        return res.status(400).json({ message: "Username already exists" });
      }

      console.log('Creating new user...');
      const newUser = await storage.createUserByAdmin({
        username,
        password,
        firstName,
        lastName,
        email,
        role
      });

      console.log('User created successfully:', newUser.id);
      
      // Remove sensitive data before sending response
      const userResponse = {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        status: newUser.status,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt
      };
      
      res.status(201).json(userResponse);
    } catch (error) {
      console.error("=== ERROR in user registration ===");
      console.error("Error type:", typeof error);
      console.error("Error instance:", error instanceof Error);
      console.error("Error message:", error instanceof Error ? error.message : String(error));
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      
      // Ensure we always return JSON with proper error structure
      const errorResponse = { 
        message: "Failed to create user", 
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
      
      if (!res.headersSent) {
        res.status(500).json(errorResponse);
      } else {
        console.error("Headers already sent, cannot send error response");
      }
    }
  });

  app.patch('/api/admin/users/:id/reset-password', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const { id } = req.params;
      const { newPassword } = req.body;
      
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Validate password strength
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ 
          message: 'Password does not meet security requirements',
          errors: passwordValidation.errors
        });
      }

      const success = await storage.resetUserPassword(id, newPassword);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }

      // Send password reset notification to user
      if (process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true') {
        const user = await storage.getUser(id);
        if (user && user.email) {
          const template = emailTemplates.passwordReset({
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email
          });
          await emailService.sendEmail({
            to: user.email,
            subject: template.subject,
            html: template.html
          });
        }
      }

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Finding routes
  app.post('/api/findings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Ensure required fields are present
      if (!req.body.title || !req.body.description || !req.body.severity) {
        return res.status(400).json({ message: "Title, description, and severity are required" });
      }

      const validatedData = insertFindingSchema.parse({
        ...req.body,
        reportedById: userId,
        evidence: req.body.evidence || [],
        assignedTo: req.body.assignedTo || []
      });

      const finding = await storage.createFinding(validatedData);

      // Send email notifications for new finding
      if (process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true') {
        // Notify assigned users
        if (validatedData.assignedTo && Array.isArray(validatedData.assignedTo) && validatedData.assignedTo.length > 0) {
          for (const assigneeId of validatedData.assignedTo) {
            const assignee = await storage.getUser(assigneeId);
            if (assignee && assignee.email) {
              const reportedBy = await storage.getUser(finding.reportedById);
              const template = emailTemplates.findingAssigned(
                {
                  id: finding.id,
                  title: finding.title,
                  severity: finding.severity,
                  category: finding.category || 'Unknown',
                  description: finding.description,
                  reportedBy: reportedBy ? `${reportedBy.firstName} ${reportedBy.lastName}` : 'Unknown'
                },
                {
                  firstName: assignee.firstName || '',
                  lastName: assignee.lastName || '',
                  email: assignee.email
                }
              );
              
              try {
                await emailService.sendEmail({
                  to: assignee.email,
                  subject: template.subject,
                  html: template.html
                });
                console.log(`New finding assignment notification sent to ${assignee.email} for finding: ${finding.title}`);
              } catch (error) {
                console.error(`Failed to send new finding assignment notification to ${assignee.email}:`, error);
              }
            }
          }
        }

        // Notify admins of new critical/high findings
        if (['critical', 'high'].includes(finding.severity.toLowerCase())) {
          const adminEmails = process.env.EMAIL_ADMIN_RECIPIENTS?.split(',') || [];
          if (adminEmails.length > 0) {
            const template = emailTemplates.newFinding({
              title: finding.title,
              severity: finding.severity,
              category: finding.category || 'Unknown',
              assignedTo: Array.isArray(validatedData.assignedTo) && validatedData.assignedTo.length ? `${validatedData.assignedTo.length} user(s)` : undefined
            });
            await emailService.sendEmail({
              to: adminEmails,
              subject: template.subject,
              html: template.html
            });
          }
        }
      }

      res.status(201).json(finding);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating finding:", error);
      res.status(500).json({ message: "Failed to create finding", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get('/api/findings', isAuthenticated, async (req: any, res) => {
    try {
      const { severity, status, category, search } = req.query;
      
      const filters: any = {};
      if (severity) {
        filters.severity = Array.isArray(severity) ? severity : [severity];
      }
      if (status) filters.status = status;
      if (category) filters.category = category;
      if (search) filters.search = search;

      const findings = await storage.getAllFindings(filters);
      res.json(findings);
    } catch (error) {
      console.error("Error fetching findings:", error);
      res.status(500).json({ message: "Failed to fetch findings" });
    }
  });

  app.get('/api/findings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const finding = await storage.getFinding(id);
      
      if (!finding) {
        return res.status(404).json({ message: "Finding not found" });
      }

      res.json(finding);
    } catch (error) {
      console.error("Error fetching finding:", error);
      res.status(500).json({ message: "Failed to fetch finding" });
    }
  });

  app.patch('/api/findings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const currentUser = req.user;
      
      // Check if user has permission to update (admin, team_lead, or assigned to finding)
      const finding = await storage.getFinding(id);
      if (!finding) {
        return res.status(404).json({ message: "Finding not found" });
      }

      const canUpdate = currentUser?.role === 'admin' || 
                       currentUser?.role === 'team_lead' ||
                       finding.reportedById === currentUser?.id ||
                       (finding.assignedTo && Array.isArray(finding.assignedTo) && finding.assignedTo.includes(currentUser?.id));

      if (!canUpdate) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Store original values for comparison
      const originalAssignees = Array.isArray(finding.assignedTo) ? finding.assignedTo : [];
      const originalStatus = finding.status;
      
      const updatedFinding = await storage.updateFinding(id, req.body);
      
      // Send email notifications for changes
      if (process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true' && updatedFinding) {
        const newAssignees = Array.isArray(req.body.assignedTo) ? req.body.assignedTo : [];
        const addedAssignees = newAssignees.filter((userId: string) => !originalAssignees.includes(userId));
        const newStatus = req.body.status;
        
        // Notify newly assigned users
        for (const assigneeId of addedAssignees) {
          const assignee = await storage.getUser(assigneeId);
          if (assignee && assignee.email) {
            const reportedBy = await storage.getUser(finding.reportedById);
            const template = emailTemplates.findingAssigned(
              {
                id: updatedFinding.id,
                title: updatedFinding.title,
                severity: updatedFinding.severity,
                category: updatedFinding.category || 'Unknown',
                description: updatedFinding.description,
                reportedBy: reportedBy ? `${reportedBy.firstName} ${reportedBy.lastName}` : 'Unknown'
              },
              {
                firstName: assignee.firstName || '',
                lastName: assignee.lastName || '',
                email: assignee.email
              }
            );
            
            try {
              await emailService.sendEmail({
                to: assignee.email,
                subject: template.subject,
                html: template.html
              });
              console.log(`Assignment notification sent to ${assignee.email} for finding: ${updatedFinding.title}`);
            } catch (error) {
              console.error(`Failed to send assignment notification to ${assignee.email}:`, error);
            }
          }
        }
        
        // Notify assigned users of status changes
        if (newStatus && newStatus !== originalStatus) {
          const currentAssignees = Array.isArray(updatedFinding.assignedTo) ? updatedFinding.assignedTo : [];
          
          for (const assigneeId of currentAssignees) {
            const assignee = await storage.getUser(assigneeId);
            if (assignee && assignee.email) {
              const template = emailTemplates.findingStatusChanged(
                {
                  id: updatedFinding.id,
                  title: updatedFinding.title,
                  severity: updatedFinding.severity,
                  category: updatedFinding.category || 'Unknown',
                  oldStatus: originalStatus,
                  newStatus: newStatus,
                  changedBy: `${currentUser.firstName} ${currentUser.lastName}`
                },
                {
                  firstName: assignee.firstName || '',
                  lastName: assignee.lastName || '',
                  email: assignee.email
                }
              );
              
              try {
                await emailService.sendEmail({
                  to: assignee.email,
                  subject: template.subject,
                  html: template.html
                });
                console.log(`Status change notification sent to ${assignee.email} for finding: ${updatedFinding.title}`);
              } catch (error) {
                console.error(`Failed to send status change notification to ${assignee.email}:`, error);
              }
            }
          }
        }
      }
      
      res.json(updatedFinding);
    } catch (error) {
      console.error("Error updating finding:", error);
      res.status(500).json({ message: "Failed to update finding" });
    }
  });

  app.delete('/api/findings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const currentUser = req.user;
      
      // Check if user has permission to delete (admin, team_lead, or finding owner)
      const finding = await storage.getFinding(id);
      if (!finding) {
        return res.status(404).json({ message: "Finding not found" });
      }

      const canDelete = currentUser?.role === 'admin' || 
                       currentUser?.role === 'team_lead' ||
                       finding.reportedById === currentUser?.id;

      if (!canDelete) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const success = await storage.deleteFinding(id);
      if (!success) {
        return res.status(500).json({ message: "Failed to delete finding" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting finding:", error);
      res.status(500).json({ message: "Failed to delete finding" });
    }
  });

  // Attachment routes
  app.post('/api/findings/:id/attachments', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const findingId = parseInt(req.params.id);
      const userId = req.user.id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Check if finding exists
      const finding = await storage.getFinding(findingId);
      if (!finding) {
        return res.status(404).json({ message: "Finding not found" });
      }

      const attachmentData = {
        findingId,
        filename: file.filename,
        originalName: file.originalname,
        filePath: `uploads/${file.filename}`,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedById: userId
      };

      const attachment = await storage.createAttachment(attachmentData);
      res.status(201).json(attachment);
    } catch (error) {
      console.error("Error uploading attachment:", error);
      res.status(500).json({ message: "Failed to upload attachment" });
    }
  });

  app.get('/api/findings/:id/attachments', isAuthenticated, async (req: any, res) => {
    try {
      const findingId = parseInt(req.params.id);
      const attachments = await storage.getAttachmentsByFinding(findingId);
      res.json(attachments);
    } catch (error) {
      console.error("Error fetching attachments:", error);
      res.status(500).json({ message: "Failed to fetch attachments" });
    }
  });

  app.get('/api/attachments/:id/download', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const attachment = await storage.getAttachment(id);
      
      if (!attachment) {
        return res.status(404).json({ message: "Attachment not found" });
      }

      const filePath = path.join(process.cwd(), 'server', attachment.filePath);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
      res.setHeader('Content-Type', attachment.mimeType);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error downloading attachment:", error);
      res.status(500).json({ message: "Failed to download attachment" });
    }
  });

  app.delete('/api/attachments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Check if user can delete (admin, team_lead, or uploader)
      if (req.user.role !== 'admin' && req.user.role !== 'team_lead') {
        // Additional check needed to see if user uploaded the file
        // This would require getting the attachment first
      }

      const success = await storage.deleteAttachment(id);
      if (!success) {
        return res.status(404).json({ message: "Attachment not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting attachment:", error);
      res.status(500).json({ message: "Failed to delete attachment" });
    }
  });

  // Email configuration diagnostic endpoint
  app.get('/api/admin/email-config', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const config = {
        host: process.env.SMTP_HOST || null,
        port: process.env.SMTP_PORT || null,
        secure: process.env.SMTP_SECURE || null,
        user: process.env.SMTP_USER || null,
        hasPassword: !!process.env.SMTP_PASS,
        from: process.env.SMTP_FROM || null,
        tlsRejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED || null,
        adminRecipients: process.env.EMAIL_ADMIN_RECIPIENTS || null,
        notificationsEnabled: process.env.EMAIL_NOTIFICATIONS_ENABLED || null
      };

      // Test connection
      const connectionTest = await emailService.testConnection();

      res.json({
        config,
        connectionTest,
        suggestions: connectionTest.success ? [] : [
          'Verify Exchange server is accessible from this network',
          'Check SMTP relay connector allows anonymous authentication',
          'Ensure port 25 is not blocked by firewall',
          'Consider testing with telnet: telnet ' + config.host + ' ' + config.port,
          'Review Exchange receive connector permissions'
        ]
      });
    } catch (error) {
      console.error("Error getting email config:", error);
      res.status(500).json({ 
        message: "Failed to get email configuration",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Email configuration test endpoint for administrators
  app.post('/api/admin/test-email', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { testEmail } = req.body;
      const targetEmail = testEmail || currentUser.email;

      if (!targetEmail) {
        return res.status(400).json({ message: "Test email address required" });
      }

      // Test email connection first
      const connectionTest = await emailService.testConnection();
      if (!connectionTest.success) {
        return res.status(500).json({ 
          message: "Email service connection failed. Please check SMTP configuration.",
          error: connectionTest.error,
          details: connectionTest.details,
          config: {
            host: process.env.SMTP_HOST || 'Not configured',
            port: process.env.SMTP_PORT || 'Not configured',
            secure: process.env.SMTP_SECURE || 'Not configured',
            user: process.env.SMTP_USER || 'Not configured'
          }
        });
      }

      // Send test email
      const success = await emailService.sendEmail({
        to: targetEmail,
        subject: 'SecureTeam Tracker - Email Configuration Test',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Email Configuration Test Successful</h2>
            <p>Hello ${currentUser.firstName || ''} ${currentUser.lastName || ''},</p>
            <p>This is a test email to verify that your Exchange server SMTP relay is properly configured.</p>
            <div style="background: #f0fdf4; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #16a34a;">
              <p><strong>Configuration Status:</strong> ✅ Working</p>
              <p><strong>Test Date:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Tested By:</strong> ${currentUser.username}</p>
            </div>
            <p>Email notifications are now ready for use in SecureTeam Tracker.</p>
            <hr style="margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">This is a test message from SecureTeam Tracker.</p>
          </div>
        `
      });

      if (success) {
        res.json({ 
          message: "Test email sent successfully",
          sentTo: targetEmail,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({ 
          message: "Failed to send test email. Please check SMTP configuration and logs."
        });
      }
    } catch (error) {
      console.error("Error testing email configuration:", error);
      res.status(500).json({ 
        message: "Email test failed",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Comment routes
  app.post('/api/findings/:findingId/comments', isAuthenticated, async (req: any, res) => {
    try {
      const findingId = parseInt(req.params.findingId);
      const userId = req.user.id;

      const validatedData = insertCommentSchema.parse({
        findingId,
        userId,
        content: req.body.content,
      });

      const comment = await storage.createComment(validatedData);
      
      // Send email notifications to assigned users for new comments
      if (process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true') {
        const finding = await storage.getFinding(findingId);
        if (finding && finding.assignedTo && Array.isArray(finding.assignedTo)) {
          const commenter = await storage.getUser(userId);
          const commenterName = commenter ? `${commenter.firstName} ${commenter.lastName}` : 'Unknown User';
          
          for (const assigneeId of finding.assignedTo) {
            // Don't notify the commenter themselves
            if (assigneeId !== userId) {
              const assignee = await storage.getUser(assigneeId);
              if (assignee && assignee.email) {
                const template = emailTemplates.findingComment(
                  {
                    id: finding.id,
                    title: finding.title,
                    severity: finding.severity
                  },
                  {
                    content: validatedData.content,
                    author: commenterName
                  },
                  {
                    firstName: assignee.firstName || '',
                    lastName: assignee.lastName || '',
                    email: assignee.email
                  }
                );
                
                try {
                  await emailService.sendEmail({
                    to: assignee.email,
                    subject: template.subject,
                    html: template.html
                  });
                  console.log(`Comment notification sent to ${assignee.email} for finding: ${finding.title}`);
                } catch (error) {
                  console.error(`Failed to send comment notification to ${assignee.email}:`, error);
                }
              }
            }
          }
        }
      }
      
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.get('/api/findings/:findingId/comments', isAuthenticated, async (req: any, res) => {
    try {
      const findingId = parseInt(req.params.findingId);
      const comments = await storage.getCommentsByFinding(findingId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Report routes
  app.post('/api/reports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log('Report creation - User ID:', userId, 'User object:', req.user);
      const { title, description, findings, format } = req.body;
      
      // Generate the actual report file
      const { buffer, filename } = await generateReport({
        title,
        description,
        findings,
        format: format || 'pdf',
        generatedById: userId,
      });
      
      // Save file to disk
      const reportsDir = path.join(process.cwd(), 'server', 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      const filePath = path.join(reportsDir, filename);
      fs.writeFileSync(filePath, buffer);
      
      // Save report metadata to database
      const reportData = {
        title,
        description,
        findings,
        generatedById: userId,
        format: format || 'pdf',
        filename,
        filePath: `reports/${filename}`,
      };
      
      console.log('Creating report with data:', reportData);
      const report = await storage.createReport(reportData as any);
      console.log('Report created:', report);

      // Send email notification for report generation
      if (process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true') {
        const user = req.user;
        const adminEmails = process.env.EMAIL_ADMIN_RECIPIENTS?.split(',') || [];
        const recipients = [user.email, ...adminEmails].filter(email => email);
        
        if (recipients.length > 0) {
          const template = emailTemplates.reportGenerated(
            {
              title: report.title,
              findingsCount: findings ? findings.length : 0
            },
            {
              firstName: user.firstName || '',
              lastName: user.lastName || ''
            }
          );
          await emailService.sendEmail({
            to: recipients,
            subject: template.subject,
            html: template.html
          });
        }
      }
      
      res.status(201).json(report);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating report:", error);
      res.status(500).json({ message: "Failed to create report" });
    }
  });

  app.get('/api/reports', isAuthenticated, async (req: any, res) => {
    try {
      const reports = await storage.getAllReports();
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.get('/api/reports/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const report = await storage.getReport(id);
      
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      res.json(report);
    } catch (error) {
      console.error("Error fetching report:", error);
      res.status(500).json({ message: "Failed to fetch report" });
    }
  });

  app.get('/api/reports/:id/download', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log('Download request for report ID:', id);
      
      const report = await storage.getReport(id);
      console.log('Retrieved report:', report);
      
      if (!report) {
        console.log('Report not found in database');
        return res.status(404).json({ message: "Report not found" });
      }

      if (!report.filename || !report.filePath) {
        console.log('Report missing filename or filePath:', { filename: report.filename, filePath: report.filePath });
        return res.status(404).json({ message: "Report file not found" });
      }

      const filePath = path.join(process.cwd(), 'server', report.filePath);
      console.log('Constructed file path:', filePath);
      
      if (!fs.existsSync(filePath)) {
        console.log('File does not exist on disk:', filePath);
        // List files in reports directory for debugging
        const reportsDir = path.join(process.cwd(), 'server', 'reports');
        if (fs.existsSync(reportsDir)) {
          const files = fs.readdirSync(reportsDir);
          console.log('Files in reports directory:', files);
        }
        return res.status(404).json({ message: "Report file not found on disk" });
      }

      const contentType = report.format === 'pdf' ? 'application/pdf' : 'text/html';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error downloading report:", error);
      res.status(500).json({ message: "Failed to download report" });
    }
  });

  app.delete('/api/reports/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteReport(id);
      
      if (success) {
        res.json({ message: "Report deleted successfully" });
      } else {
        res.status(404).json({ message: "Report not found" });
      }
    } catch (error) {
      console.error("Error deleting report:", error);
      res.status(500).json({ message: "Failed to delete report" });
    }
  });

  // Statistics route
  app.get('/api/stats', isAuthenticated, async (req: any, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Message/Chat API routes
  app.get('/api/messages/:channel', isAuthenticated, async (req: any, res) => {
    try {
      const { channel } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      
      const messages = await storage.getMessages(channel, parseInt(limit), parseInt(offset));
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      // Clean the request body to remove undefined values
      const cleanBody = Object.fromEntries(
        Object.entries(req.body).filter(([_, value]) => value !== undefined)
      );
      
      const messageData = insertMessageSchema.parse({
        ...cleanBody,
        userId: req.user.id
      });
      
      const message = await storage.createMessage(messageData);
      
      // Broadcast to WebSocket clients
      broadcastMessage(message);
      
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  app.patch('/api/messages/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { content } = req.body;
      const currentUser = req.user;
      
      // Check if user can edit message (only own messages or admin)
      const originalMessage = await storage.getMessages('general', 1000).then(messages => 
        messages.find(m => m.id === id)
      );
      
      if (!originalMessage) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      if (originalMessage.userId !== currentUser.id && currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Can only edit your own messages" });
      }
      
      const updatedMessage = await storage.updateMessage(id, content);
      if (!updatedMessage) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      res.json(updatedMessage);
    } catch (error) {
      console.error("Error updating message:", error);
      res.status(500).json({ message: "Failed to update message" });
    }
  });

  app.delete('/api/messages/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const currentUser = req.user;
      
      // Check if user can delete message (only own messages or admin)
      const originalMessage = await storage.getMessages('general', 1000).then(messages => 
        messages.find(m => m.id === id)
      );
      
      if (!originalMessage) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      if (originalMessage.userId !== currentUser.id && currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Can only delete your own messages" });
      }
      
      const deleted = await storage.deleteMessage(id);
      if (!deleted) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      res.json({ message: "Message deleted" });
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  app.get('/api/channels', isAuthenticated, async (req: any, res) => {
    try {
      const channels = await storage.getChannels();
      res.json(channels);
    } catch (error) {
      console.error("Error fetching channels:", error);
      res.status(500).json({ message: "Failed to fetch channels" });
    }
  });

  // Live Data Integration API endpoints
  app.get('/api/live/network-nodes', isAuthenticated, async (req: any, res) => {
    try {
      const nodes = liveDataService.getNetworkNodes();
      res.json(nodes);
    } catch (error) {
      console.error("Error fetching network nodes:", error);
      res.status(500).json({ message: "Failed to fetch network nodes" });
    }
  });

  app.get('/api/live/network-connections', isAuthenticated, async (req: any, res) => {
    try {
      const connections = liveDataService.getNetworkConnections();
      res.json(connections);
    } catch (error) {
      console.error("Error fetching network connections:", error);
      res.status(500).json({ message: "Failed to fetch network connections" });
    }
  });

  app.get('/api/live/security-events', isAuthenticated, async (req: any, res) => {
    try {
      const events = liveDataService.getSecurityEvents();
      res.json(events);
    } catch (error) {
      console.error("Error fetching security events:", error);
      res.status(500).json({ message: "Failed to fetch security events" });
    }
  });

  app.post('/api/live/scan-network', isAuthenticated, async (req: any, res) => {
    try {
      const { subnet } = req.body;
      if (!subnet) {
        return res.status(400).json({ message: "Subnet is required" });
      }
      
      const nodes = await liveDataService.scanNetwork(subnet);
      res.json({ message: "Network scan completed", nodes });
    } catch (error) {
      console.error("Error scanning network:", error);
      res.status(500).json({ message: "Failed to scan network" });
    }
  });

  app.post('/api/live/scan-vulnerabilities', isAuthenticated, async (req: any, res) => {
    try {
      const { targets } = req.body;
      if (!targets || !Array.isArray(targets)) {
        return res.status(400).json({ message: "Targets array is required" });
      }
      
      await liveDataService.scanVulnerabilities(targets);
      res.json({ message: "Vulnerability scan initiated" });
    } catch (error) {
      console.error("Error scanning vulnerabilities:", error);
      res.status(500).json({ message: "Failed to scan vulnerabilities" });
    }
  });

  app.post('/api/live/fetch-security-events', isAuthenticated, async (req: any, res) => {
    try {
      const { startTime, endTime } = req.body;
      const timeRange = {
        start: new Date(startTime),
        end: new Date(endTime)
      };
      
      const events = await liveDataService.fetchSecurityEvents(timeRange);
      res.json({ message: "Security events fetched", events });
    } catch (error) {
      console.error("Error fetching security events:", error);
      res.status(500).json({ message: "Failed to fetch security events" });
    }
  });

  app.get('/api/live/openvas-status', isAuthenticated, async (req: any, res) => {
    try {
      const isConnected = await liveDataService.checkOpenVASConnection();
      res.json({ 
        connected: isConnected,
        message: isConnected ? "OpenVAS is accessible" : "OpenVAS is not accessible or not configured"
      });
    } catch (error) {
      console.error("Error checking OpenVAS status:", error);
      res.status(500).json({ message: "Failed to check OpenVAS status" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const connectedClients = new Set<WebSocket>();

  // WebSocket server for live data updates
  const liveDataWss = new WebSocketServer({ server: httpServer, path: '/ws/live-data' });
  
  liveDataWss.on('connection', (ws: WebSocket, req) => {
    console.log('Live data WebSocket client connected');
    liveDataService.subscribe(ws);
    
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'request_update') {
          // Client requesting manual data refresh
          liveDataService.monitorNetworkTraffic();
          liveDataService.updateThreatIntelligence();
        }
      } catch (error) {
        console.error('Live data WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('Live data WebSocket client disconnected');
      liveDataService.unsubscribe(ws);
    });

    ws.on('error', (error) => {
      console.error('Live data WebSocket error:', error);
      liveDataService.unsubscribe(ws);
    });
  });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('WebSocket client connected');
    connectedClients.add(ws);

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      connectedClients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      connectedClients.delete(ws);
    });
  });

  // Function to broadcast messages to all connected clients
  function broadcastMessage(message: any) {
    const messageData = JSON.stringify({
      type: 'new_message',
      data: message
    });

    connectedClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageData);
      }
    });
  }

  return httpServer;
}
