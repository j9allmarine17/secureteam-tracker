import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { User as SelectUser } from "@shared/schema";
import createMemoryStore from "memorystore";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

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

// Create a simple SQL execution interface
async function executeSQL(query: string, params: any[] = []): Promise<any[]> {
  // This will be implemented using the execute_sql_tool interface
  // For now, we'll create a mock interface that can be replaced
  console.log('SQL Query:', query, 'Params:', params);
  return [];
}

export function setupSQLAuth(app: Express) {
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

  app.set('trust proxy', 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "username", passwordField: "password" },
      async (username, password, done) => {
        try {
          console.log(`Authenticating user: ${username}`);
          
          // Direct SQL query to find user
          const users = await executeSQL('SELECT * FROM users WHERE username = $1', [username]);
          const user = users[0];
          
          if (!user) {
            console.log(`User not found: ${username}`);
            return done(null, false, { message: "Invalid username or password" });
          }
          
          if (!user.password) {
            console.log(`User ${username} has no password set`);
            return done(null, false, { message: "Invalid username or password" });
          }

          console.log(`Verifying password for user: ${username}`);
          const isValid = await comparePasswords(password, user.password);
          
          if (!isValid) {
            console.log(`Authentication failed for user: ${username}`);
            return done(null, false, { message: "Invalid username or password" });
          }

          console.log(`Authentication successful for user: ${username}`);
          return done(null, user);
        } catch (error) {
          console.log("Authentication strategy error:", error);
          return done(error);
        }
      },
    ),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const users = await executeSQL('SELECT * FROM users WHERE id = $1', [id]);
      const user = users[0];
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, firstName, lastName, email } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Check if user exists
      const existingUsers = await executeSQL('SELECT * FROM users WHERE username = $1', [username]);
      if (existingUsers.length > 0) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(password);
      const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create user
      const newUsers = await executeSQL(`
        INSERT INTO users (id, username, password, first_name, last_name, email, role, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `, [id, username, hashedPassword, firstName || "", lastName || "", email || "", "user", "active"]);
      
      const user = newUsers[0];

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration error", error: error.message });
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}

export const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};