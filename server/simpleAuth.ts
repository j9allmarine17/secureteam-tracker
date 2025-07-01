import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import createMemoryStore from "memorystore";
import { storage } from "./directStorage";
import { validatePassword } from "./passwordValidator";
import { emailService, emailTemplates } from "./emailService";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupSimpleAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000,
    }),
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  };

  app.use(session(sessionSettings));

  // Simple login endpoint
  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
      }

      // Check database for user authentication
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      if (!user.password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isValidPassword = await comparePasswords(password, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check if user account is approved
      if (user.status === 'pending') {
        return res.status(403).json({ message: 'Your account is pending admin approval. Please wait for approval before logging in.' });
      }

      if (user.status !== 'active' && user.status !== 'approved') {
        return res.status(403).json({ message: 'Your account is not active. Please contact an administrator.' });
      }

      // Set session
      (req.session as any).user = {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status
      };

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status
      });
      
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Simple logout endpoint
  app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  // Registration endpoint
  app.post('/api/register', async (req, res) => {
    try {
      const { username, password, firstName, lastName, email } = req.body;
      
      if (!username || !password || !firstName || !lastName || !email) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      // Validate password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ 
          message: 'Password does not meet security requirements',
          errors: passwordValidation.errors
        });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      // Create new user with 'pending' status requiring admin approval
      const newUser = await storage.createUser({
        username,
        password,
        firstName,
        lastName,
        email,
        role: 'user',
        status: 'pending'
      });

      // Send email notification to administrators about new registration
      if (process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true') {
        const adminEmails = process.env.EMAIL_ADMIN_RECIPIENTS?.split(',') || [];
        if (adminEmails.length > 0) {
          const template = emailTemplates.userRegistration({
            firstName: newUser.firstName || '',
            lastName: newUser.lastName || '',
            username: newUser.username || ''
          });
          await emailService.sendEmail({
            to: adminEmails,
            subject: template.subject,
            html: template.html
          });
        }
      }

      // Do NOT set session - user must wait for approval
      res.status(201).json({
        message: 'Registration successful. Your account is pending approval by an administrator.',
        username: newUser.username,
        status: 'pending'
      });
      
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  // Get current user endpoint
  app.get('/api/user', (req, res) => {
    const user = (req.session as any).user;
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    res.json(user);
  });
}

export const isAuthenticated = (req: any, res: any, next: any) => {
  const user = (req.session as any).user;
  if (!user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  req.user = user;
  next();
};