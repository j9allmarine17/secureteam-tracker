import { neon } from '@neondatabase/serverless';

// Ensure environment is loaded first
import "./env";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const sql = neon(process.env.DATABASE_URL);

// Create a working pool interface for authentication
export const pool = {
  query: async (text: string, params: any[] = []) => {
    try {
      // Execute query with Neon directly using proper parameter substitution
      let query = text;
      if (params && params.length > 0) {
        // Replace $1, $2, etc. with actual values for Neon
        params.forEach((param, index) => {
          const placeholder = `$${index + 1}`;
          const value = typeof param === 'string' ? `'${param.replace(/'/g, "''")}'` : param;
          query = query.replace(placeholder, value);
        });
      }
      
      console.log('Executing query:', query);
      const result = await sql(query);
      console.log('Query result:', result);
      
      // Ensure we always return an array of rows
      if (!result) {
        return { rows: [] };
      }
      
      if (Array.isArray(result)) {
        return { rows: result };
      }
      
      // If result is not an array, wrap it
      return { rows: [result] };
    } catch (error) {
      console.error('Database query error:', text, params, error);
      throw error;
    }
  },
  end: () => Promise.resolve()
};

// Simple db export for compatibility (not using Drizzle for now)
export const db = { pool };