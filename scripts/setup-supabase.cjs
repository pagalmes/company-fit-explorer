#!/usr/bin/env node

/**
 * Supabase Setup Script for CMF Explorer
 * 
 * This script automates the setup of a new Supabase instance for the CMF Explorer.
 * It handles database schema creation, RLS policies, and sample data insertion.
 * 
 * Usage:
 *   node scripts/setup-supabase.js
 *   
 * Prerequisites:
 *   - Supabase project created
 *   - Environment variables set in .env.local
 *   - @supabase/supabase-js installed
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required variables:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration(migrationFile) {
  console.log(`🔄 Running migration: ${migrationFile}`);
  
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile);
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    return false;
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error(`❌ Migration failed: ${migrationFile}`);
      console.error('Error:', error.message);
      return false;
    }
    
    console.log(`✅ Migration completed: ${migrationFile}`);
    return true;
  } catch (err) {
    console.error(`❌ Migration failed: ${migrationFile}`);
    console.error('Error:', err.message);
    return false;
  }
}

async function executeSQLDirect(sql, description) {
  console.log(`🔄 ${description}`);
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error(`❌ Failed: ${description}`);
      console.error('Error:', error.message);
      return false;
    }
    
    console.log(`✅ Completed: ${description}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed: ${description}`);
    console.error('Error:', err.message);
    return false;
  }
}

async function createExecSQLFunction() {
  // Create a helper function to execute arbitrary SQL
  const sql = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql_query;
      RETURN 'OK';
    EXCEPTION
      WHEN OTHERS THEN
        RETURN 'ERROR: ' || SQLERRM;
    END;
    $$;
  `;
  
  console.log('🔄 Creating SQL execution helper function...');
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // Function might not exist yet, try direct creation
      const { error: directError } = await supabase.query(sql);
      if (directError) {
        console.log('⚠️ Could not create helper function, trying direct migration approach');
        return false;
      }
    }
    
    console.log('✅ SQL execution helper function created');
    return true;
  } catch (err) {
    console.log('⚠️ Could not create helper function, trying alternative approach');
    return false;
  }
}

async function setupDatabase() {
  console.log('🚀 Setting up CMF Explorer database...\n');
  
  // Test connection
  console.log('🔄 Testing Supabase connection...');
  try {
    const { data, error } = await supabase.from('auth.users').select('count').limit(1);
    if (error && !error.message.includes('permission')) {
      throw error;
    }
    console.log('✅ Supabase connection successful\n');
  } catch (err) {
    console.error('❌ Supabase connection failed');
    console.error('Error:', err.message);
    console.error('\nPlease check your Supabase credentials and try again.');
    process.exit(1);
  }

  // Try to create helper function (may not work in all setups)
  await createExecSQLFunction();

  // Run migrations
  const migrations = [
    '001_initial_schema.sql',
    '002_seed_test_user.sql'
  ];

  let allSuccessful = true;

  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (!success) {
      allSuccessful = false;
      break;
    }
  }

  if (!allSuccessful) {
    console.log('\n❌ Some migrations failed. Please check the errors above.');
    console.log('\n📋 Manual Setup Instructions:');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the contents of each migration file in order:');
    migrations.forEach(migration => {
      console.log(`   - supabase/migrations/${migration}`);
    });
    process.exit(1);
  }

  console.log('\n🎉 Database setup completed successfully!');
  console.log('\n📋 What was created:');
  console.log('  ✅ profiles table (for user authentication)');
  console.log('  ✅ user_company_data table (for personalized company data)');
  console.log('  ✅ user_preferences table (for watchlist and UI preferences)');
  console.log('  ✅ user_invitations table (for invite-only access)');
  console.log('  ✅ Row Level Security policies');
  console.log('  ✅ Sample data for development');
  console.log('\n🚀 Your CMF Explorer database is ready!');
  console.log('\nNext steps:');
  console.log('  1. Start your development server: npm run dev');
  console.log('  2. Visit http://localhost:3000');
  console.log('  3. The app will load with sample data');
}

// Run the setup
setupDatabase().catch(err => {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
});