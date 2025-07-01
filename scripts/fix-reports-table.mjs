import { Pool } from 'pg';

async function fixReportsTable() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:password123@localhost:5432/redteam_collab';
  
  console.log('Fixing reports table schema...');
  const pool = new Pool({ 
    connectionString: databaseUrl,
    ssl: false
  });

  try {
    // Add missing columns to reports table
    console.log('Adding format column...');
    await pool.query(`
      ALTER TABLE reports 
      ADD COLUMN IF NOT EXISTS format VARCHAR NOT NULL DEFAULT 'pdf';
    `);

    console.log('Adding filename column...');
    await pool.query(`
      ALTER TABLE reports 
      ADD COLUMN IF NOT EXISTS filename VARCHAR;
    `);

    console.log('Adding file_path column...');
    await pool.query(`
      ALTER TABLE reports 
      ADD COLUMN IF NOT EXISTS file_path VARCHAR;
    `);

    // Verify the table structure
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'reports'
      ORDER BY ordinal_position;
    `);

    console.log('✓ Reports table schema updated successfully');
    console.log('Current columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

  } catch (error) {
    console.error('Error fixing reports table:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixReportsTable();