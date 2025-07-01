import { neon } from '@neondatabase/serverless';
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

// Ensure environment is loaded first
import "./env";

const scryptAsync = promisify(scrypt);

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const sql = neon(process.env.DATABASE_URL);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split('.');
  const hashedBuf = Buffer.from(hashed, 'hex');
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return hashedBuf.equals(suppliedBuf);
}

export class SimpleStorage {
  async getUserByUsername(username: string) {
    try {
      const result = await sql`SELECT * FROM users WHERE username = ${username}`;
      return result[0];
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async getUser(id: string) {
    try {
      const result = await sql`SELECT * FROM users WHERE id = ${id}`;
      return result[0];
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async createUser(userData: {
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    status?: string;
  }) {
    try {
      const hashedPassword = await hashPassword(userData.password);
      const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const result = await sql`
        INSERT INTO users (id, username, password, first_name, last_name, email, role, status, created_at, updated_at)
        VALUES (${id}, ${userData.username}, ${hashedPassword}, ${userData.firstName}, ${userData.lastName}, ${userData.email}, ${userData.role}, ${userData.status || 'active'}, NOW(), NOW())
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('Database insert error:', error);
      throw error;
    }
  }

  async validatePassword(username: string, password: string) {
    try {
      const user = await this.getUserByUsername(username);
      if (!user || !user.password) {
        return null;
      }
      const isValid = await comparePasswords(password, user.password);
      return isValid ? user : null;
    } catch (error) {
      console.error('Password validation error:', error);
      return null;
    }
  }
}

export const simpleStorage = new SimpleStorage();