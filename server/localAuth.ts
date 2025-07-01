import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { simpleStorage } from "./simpleStorage";
import { User as SelectUser } from "@shared/schema";
import createMemoryStore from "memorystore";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const parts = stored.split(".");
  if (parts.length !== 2) {
    return false;
  }
  const [hashed, salt] = parts;
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupLocalAuth(app: Express) {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // Use in-memory store for development to avoid connection issues
  const MemoryStore = createMemoryStore(session);
  const sessionStore = new MemoryStore({
    checkPeriod: 86400000, // prune expired entries every 24h
  });

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "dev-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: false, // Allow client-side access for debugging
      secure: false, // Disable for local HTTP
      maxAge: sessionTtl,
      sameSite: 'lax', // Allow cross-site requests in development
    },
    name: 'connect.sid'
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "username", passwordField: "password" },
      async (username, password, done) => {
        try {
          console.log(`Authenticating user: ${username}`);
          const user = await simpleStorage.getUserByUsername(username);
          
          if (!user) {
            console.log(`User not found: ${username}`);
            return done(null, false, { message: "Invalid username or password" });
          }
          
          if (!user.password) {
            console.log(`User ${username} has no password set`);
            return done(null, false, { message: "Invalid username or password" });
          }
          
          console.log(`Verifying password for user: ${username}`);
          const passwordValid = await comparePasswords(password, user.password as string);
          
          if (!passwordValid) {
            console.log(`Invalid password for user: ${username}`);
            return done(null, false, { message: "Invalid username or password" });
          }
          
          // Check if user is approved before allowing login
          if (user.status !== 'approved') {
            console.log(`User ${username} login denied - status: ${user.status}`);
            return done(null, false, { message: "Account pending approval" });
          }
          
          console.log(`Authentication successful for user: ${username}`);
          return done(null, user);
        } catch (error) {
          console.error("Authentication strategy error:", error);
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await simpleStorage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Register route
  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, firstName, lastName, email } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const existingUser = await simpleStorage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await simpleStorage.createUser({
        username,
        password,
        firstName: firstName || "",
        lastName: lastName || "",
        email: email || "",
        role: "user",
        status: "pending"
      });

      // Don't automatically log in users with pending status
      res.status(201).json({
        message: "Registration successful. Your account is pending approval by an administrator.",
        status: "pending"
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login route
  app.post("/api/login", (req, res, next) => {
    console.log(`Login attempt for: ${req.body.username}`);
    
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Authentication error:", err);
        return res.status(500).json({ message: "Authentication error", error: err.message });
      }
      if (!user) {
        console.log("Authentication failed:", info?.message || "No user returned");
        return res.status(401).json({ message: info?.message || "Invalid username or password" });
      }
      
      console.log(`User authenticated: ${user.username}`);
      req.login(user, (err) => {
        if (err) {
          console.error("Session creation error:", err);
          return res.status(500).json({ message: "Session creation failed", error: err.message });
        }
        
        console.log(`Login successful for: ${user.username}`);
        res.json({
          id: user.id,
          username: user.username,
          firstName: user.first_name || user.firstName,
          lastName: user.last_name || user.lastName,
          email: user.email,
          role: user.role,
        });
      });
    })(req, res, next);
  });

  // Logout route
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Get current user
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = req.user as SelectUser;
    res.json({
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    });
  });
}

export const isAuthenticated = (req: any, res: any, next: any) => {
  console.log(`Auth check for ${req.method} ${req.path}:`, {
    isAuthenticated: req.isAuthenticated(),
    sessionID: req.sessionID,
    hasUser: !!req.user,
    userId: req.user?.id,
    userStatus: req.user?.status
  });
  
  if (!req.isAuthenticated()) {
    console.log("Authentication failed - no valid session");
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Check if user is approved
  const user = req.user;
  console.log('User object in auth middleware:', {
    id: user?.id,
    username: user?.username,
    status: user?.status,
    role: user?.role,
    hasStatus: user?.hasOwnProperty('status'),
    statusType: typeof user?.status
  });
  
  if (!user || user.status !== 'approved') {
    console.log(`Access denied - user status: "${user?.status}"`);
    return res.status(403).json({ 
      message: "Account pending approval", 
      status: user?.status || "unknown" 
    });
  }
  
  console.log("Authentication successful for user:", req.user?.username);
  next();
};