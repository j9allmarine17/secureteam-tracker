import { readFileSync } from "fs";
import { resolve } from "path";

// Load environment variables from .env file
export function loadEnvironment() {
  try {
    const envPath = resolve(process.cwd(), '.env');
    const envFile = readFileSync(envPath, 'utf8');
    const envVars = envFile.split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .reduce((acc, line) => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          acc[key.trim()] = valueParts.join('=').trim();
        }
        return acc;
      }, {} as Record<string, string>);
    
    // Apply .env variables, prioritizing local .env file over system environment
    Object.keys(envVars).forEach(key => {
      process.env[key] = envVars[key];
    });
    
    console.log('Environment variables loaded from .env file');
  } catch (error) {
    console.log('No .env file found, using system environment variables');
  }

  console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':****@') || 'not set');

  // Set default values for local development if not already set
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://postgres:password123@localhost:5432/redteam_collab';
    console.log('Using default local PostgreSQL connection');
  }
  
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = 'redteam-collab-secure-session-key-change-in-production';
    console.log('Using default session secret');
  }
  
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
  }
  
  if (!process.env.PORT) {
    process.env.PORT = '5000';
  }
}

// Load environment immediately when this module is imported
loadEnvironment();