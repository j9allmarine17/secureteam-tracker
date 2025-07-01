import nodemailer from 'nodemailer';
import { loadEnvironment } from './env';

loadEnvironment();

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  tls?: {
    rejectUnauthorized: boolean;
  };
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig;

  constructor() {
    this.config = this.getEmailConfig();
    this.initializeTransporter();
  }

  private getEmailConfig(): EmailConfig {
    const config: EmailConfig = {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '25'),
      secure: process.env.SMTP_SECURE === 'true',
      tls: {
        rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false'
      }
    };

    // Add authentication if credentials are provided
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      config.auth = {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      };
    }

    return config;
  }

  private initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport(this.config);
      console.log('Email service transporter created');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.transporter = null;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email transporter not initialized');
      return false;
    }

    try {
      const mailOptions = {
        from: options.from || process.env.SMTP_FROM || `"SecureTeam Tracker" <noreply@${this.config.host}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  // Test email configuration
  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    if (!this.transporter) {
      return { 
        success: false, 
        error: 'Email transporter not initialized',
        details: { config: this.config }
      };
    }

    try {
      console.log('Testing email connection with config:', {
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        hasAuth: !!this.config.auth,
        tls: this.config.tls
      });
      
      await this.transporter.verify();
      console.log('Email connection test successful');
      return { success: true };
    } catch (error: any) {
      console.error('Email connection test failed:', {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode
      });
      
      return { 
        success: false, 
        error: error.message || 'Unknown connection error',
        details: {
          code: error.code,
          command: error.command,
          response: error.response,
          responseCode: error.responseCode,
          config: this.config
        }
      };
    }
  }
}

export const emailService = new EmailService();

// Email templates
export const emailTemplates = {
  userRegistration: (user: { firstName: string; lastName: string; username: string }) => ({
    subject: 'New User Registration - SecureTeam Tracker',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">New User Registration</h2>
        <p>A new user has registered and is pending approval:</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Name:</strong> ${user.firstName} ${user.lastName}</p>
          <p><strong>Username:</strong> ${user.username}</p>
        </div>
        <p>Please log in to the admin panel to approve or reject this registration.</p>
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message from SecureTeam Tracker.</p>
      </div>
    `
  }),

  userApproved: (user: { firstName: string; lastName: string; email: string }) => ({
    subject: 'Account Approved - SecureTeam Tracker',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Account Approved</h2>
        <p>Hello ${user.firstName} ${user.lastName},</p>
        <p>Your SecureTeam Tracker account has been approved! You can now log in and access the platform.</p>
        <div style="background: #f0fdf4; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #16a34a;">
          <p><strong>Next Steps:</strong></p>
          <ul>
            <li>Log in to the platform using your credentials</li>
            <li>Complete your profile information</li>
            <li>Start collaborating with your team</li>
          </ul>
        </div>
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message from SecureTeam Tracker.</p>
      </div>
    `
  }),

  newFinding: (finding: { title: string; severity: string; category: string; assignedTo?: string }) => ({
    subject: `New ${finding.severity.toUpperCase()} Finding - ${finding.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">New Security Finding</h2>
        <p>A new security finding has been created:</p>
        <div style="background: #fef2f2; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #dc2626;">
          <p><strong>Title:</strong> ${finding.title}</p>
          <p><strong>Severity:</strong> <span style="color: ${getSeverityColor(finding.severity)}; font-weight: bold;">${finding.severity.toUpperCase()}</span></p>
          <p><strong>Category:</strong> ${finding.category}</p>
          ${finding.assignedTo ? `<p><strong>Assigned To:</strong> ${finding.assignedTo}</p>` : ''}
        </div>
        <p>Please review this finding in the SecureTeam Tracker platform.</p>
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message from SecureTeam Tracker.</p>
      </div>
    `
  }),

  findingAssigned: (finding: { id: number; title: string; severity: string; category: string; description: string; reportedBy: string }, assignee: { firstName: string; lastName: string; email: string }) => ({
    subject: `[${finding.severity.toUpperCase()}] Finding Assigned - ${finding.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 20px; border-radius: 8px;">
        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 20px; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px;">
          <h2 style="color: #ffffff; margin: 0; text-align: center;">🎯 Security Finding Assignment</h2>
        </div>
        
        <p style="font-size: 16px; color: #374151;">Hello <strong>${assignee.firstName} ${assignee.lastName}</strong>,</p>
        <p style="color: #6b7280;">A security finding has been assigned to you for investigation and remediation:</p>
        
        <div style="background: ${finding.severity === 'critical' ? '#fef2f2' : finding.severity === 'high' ? '#fef3c7' : finding.severity === 'medium' ? '#f0f9ff' : '#f9fafb'}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${getSeverityColor(finding.severity)};">
          <h3 style="margin: 0 0 15px 0; color: #111827;">${finding.title}</h3>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
            <div>
              <p style="margin: 0; color: #6b7280; font-size: 14px;"><strong>Severity:</strong></p>
              <span style="color: ${getSeverityColor(finding.severity)}; font-weight: bold; font-size: 16px;">${finding.severity.toUpperCase()}</span>
            </div>
            <div>
              <p style="margin: 0; color: #6b7280; font-size: 14px;"><strong>Category:</strong></p>
              <span style="color: #374151; font-weight: 500;">${finding.category}</span>
            </div>
          </div>
          
          <div style="margin-bottom: 15px;">
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;"><strong>Reported By:</strong></p>
            <span style="color: #374151;">${finding.reportedBy}</span>
          </div>
          
          <div>
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;"><strong>Description:</strong></p>
            <p style="color: #374151; line-height: 1.6; margin: 0;">${finding.description}</p>
          </div>
        </div>
        
        <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin: 0 0 10px 0; color: #374151;">📋 Next Steps:</h4>
          <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
            <li>Review the finding details in SecureTeam Tracker</li>
            <li>Investigate the security issue</li>
            <li>Document your findings and remediation steps</li>
            <li>Update the finding status as you progress</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="${process.env.APP_URL || 'http://localhost:5000'}/?finding=${finding.id}" style="background: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">View Finding in Platform</a>
        </div>
        
        <hr style="margin: 25px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          This is an automated notification from SecureTeam Tracker<br>
          Assignment Date: ${new Date().toLocaleString()}
        </p>
      </div>
    `
  }),

  findingStatusChanged: (finding: { id: number; title: string; severity: string; category: string; oldStatus: string; newStatus: string; changedBy: string }, assignee: { firstName: string; lastName: string; email: string }) => ({
    subject: `Finding Status Update - ${finding.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 20px; border-radius: 8px;">
        <div style="background: linear-gradient(135deg, #059669, #047857); padding: 20px; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px;">
          <h2 style="color: #ffffff; margin: 0; text-align: center;">📊 Finding Status Update</h2>
        </div>
        
        <p style="font-size: 16px; color: #374151;">Hello <strong>${assignee.firstName} ${assignee.lastName}</strong>,</p>
        <p style="color: #6b7280;">The status of a finding assigned to you has been updated:</p>
        
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
          <h3 style="margin: 0 0 15px 0; color: #111827;">${finding.title}</h3>
          
          <div style="background: #ffffff; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="text-align: center; flex: 1;">
                <p style="margin: 0; color: #6b7280; font-size: 12px;">Previous Status</p>
                <span style="color: #ef4444; font-weight: 600; text-transform: uppercase;">${finding.oldStatus.replace('_', ' ')}</span>
              </div>
              <div style="color: #0ea5e9; font-size: 24px;">→</div>
              <div style="text-align: center; flex: 1;">
                <p style="margin: 0; color: #6b7280; font-size: 12px;">New Status</p>
                <span style="color: #059669; font-weight: 600; text-transform: uppercase;">${finding.newStatus.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
          
          <div style="margin-top: 15px;">
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;"><strong>Updated By:</strong></p>
            <span style="color: #374151;">${finding.changedBy}</span>
          </div>
        </div>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="${process.env.APP_URL || 'http://localhost:5000'}/?finding=${finding.id}" style="background: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">View Finding Details</a>
        </div>
        
        <hr style="margin: 25px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          This is an automated notification from SecureTeam Tracker<br>
          Update Date: ${new Date().toLocaleString()}
        </p>
      </div>
    `
  }),

  findingComment: (finding: { id: number; title: string; severity: string }, comment: { content: string; author: string }, assignee: { firstName: string; lastName: string; email: string }) => ({
    subject: `New Comment - ${finding.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 20px; border-radius: 8px;">
        <div style="background: linear-gradient(135deg, #7c3aed, #6d28d9); padding: 20px; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px;">
          <h2 style="color: #ffffff; margin: 0; text-align: center;">💬 New Comment Added</h2>
        </div>
        
        <p style="font-size: 16px; color: #374151;">Hello <strong>${assignee.firstName} ${assignee.lastName}</strong>,</p>
        <p style="color: #6b7280;">A new comment has been added to a finding you're assigned to:</p>
        
        <div style="background: #faf5ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
          <h3 style="margin: 0 0 15px 0; color: #111827;">${finding.title}</h3>
          
          <div style="background: #ffffff; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; margin-top: 15px;">
            <div style="margin-bottom: 10px;">
              <span style="color: #7c3aed; font-weight: 600;">${comment.author}</span>
              <span style="color: #6b7280; font-size: 14px;"> commented:</span>
            </div>
            <p style="color: #374151; line-height: 1.6; margin: 0; font-style: italic;">"${comment.content}"</p>
          </div>
        </div>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="${process.env.APP_URL || 'http://localhost:5000'}/?finding=${finding.id}" style="background: #7c3aed; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">View Full Discussion</a>
        </div>
        
        <hr style="margin: 25px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          This is an automated notification from SecureTeam Tracker<br>
          Comment Date: ${new Date().toLocaleString()}
        </p>
      </div>
    `
  }),

  reportGenerated: (report: { title: string; findingsCount: number }, recipient: { firstName: string; lastName: string }) => ({
    subject: `Report Generated - ${report.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">Report Generated</h2>
        <p>Hello ${recipient.firstName} ${recipient.lastName},</p>
        <p>A new security report has been generated:</p>
        <div style="background: #faf5ff; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #7c3aed;">
          <p><strong>Title:</strong> ${report.title}</p>
          <p><strong>Findings Included:</strong> ${report.findingsCount}</p>
        </div>
        <p>The report is now available for download in the SecureTeam Tracker platform.</p>
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message from SecureTeam Tracker.</p>
      </div>
    `
  }),

  passwordReset: (user: { firstName: string; lastName: string; email: string }) => ({
    subject: 'Password Reset - SecureTeam Tracker',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Password Reset</h2>
        <p>Hello ${user.firstName} ${user.lastName},</p>
        <p>Your password has been reset by an administrator.</p>
        <div style="background: #fef2f2; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #dc2626;">
          <p><strong>Important:</strong> Please log in and change your password immediately for security purposes.</p>
        </div>
        <p>If you did not request this password reset, please contact your administrator immediately.</p>
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message from SecureTeam Tracker.</p>
      </div>
    `
  })
};

function getSeverityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'critical': return '#dc2626';
    case 'high': return '#ea580c';
    case 'medium': return '#ca8a04';
    case 'low': return '#16a34a';
    case 'info': return '#2563eb';
    default: return '#6b7280';
  }
}