/**
 * Cleanup Script: Remove LinkedIn/Glassdoor/Crunchbase from Supabase
 *
 * This script removes the linkedin, glassdoor, and crunchbase fields from
 * externalLinks in all companies, keeping only the website field.
 * These links will be generated on-the-fly in the UI instead.
 *
 * Usage: npm run cleanup:supabase-links
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface Company {
  id: number;
  name: string;
  externalLinks?: {
    website?: string;
    linkedin?: string;
    glassdoor?: string;
    crunchbase?: string;
  };
  [key: string]: any;
}

interface UserCompanyData {
  id: string;
  user_id: string;
  companies: Company[];
  [key: string]: any;
}

async function cleanupSupabaseLinks() {
  console.log('🧹 Cleaning up Supabase external links...\n');

  // Fetch all user company data
  const { data: allUserData, error: fetchError } = await supabase
    .from('user_company_data')
    .select('*');

  if (fetchError) {
    console.error('❌ Error fetching user data:', fetchError);
    process.exit(1);
  }

  if (!allUserData || allUserData.length === 0) {
    console.log('📭 No user data found in database');
    return;
  }

  console.log(`📊 Found ${allUserData.length} users with company data\n`);

  let usersUpdated = 0;
  let companiesProcessed = 0;
  let companiesCleaned = 0;

  // Process each user's data
  for (const userData of allUserData as UserCompanyData[]) {
    console.log(`👤 Processing user: ${userData.user_id}`);

    if (!userData.companies || !Array.isArray(userData.companies)) {
      console.log('  ⏭️  No companies found for this user\n');
      continue;
    }

    let userHasChanges = false;

    // Clean each company's externalLinks
    for (const company of userData.companies) {
      companiesProcessed++;

      if (company.externalLinks) {
        const hasLinkedIn = !!company.externalLinks.linkedin;
        const hasGlassdoor = !!company.externalLinks.glassdoor;
        const hasCrunchbase = !!company.externalLinks.crunchbase;

        if (hasLinkedIn || hasGlassdoor || hasCrunchbase) {
          // Keep only website
          company.externalLinks = {
            website: company.externalLinks.website
          };
          userHasChanges = true;
          companiesCleaned++;
          console.log(`  🧹 ${company.name}: Removed LinkedIn/Glassdoor/Crunchbase`);
        }
      }
    }

    // Update database if any changes
    if (userHasChanges) {
      const { error: updateError } = await supabase
        .from('user_company_data')
        .update({ companies: userData.companies })
        .eq('id', userData.id);

      if (updateError) {
        console.error(`  ❌ Failed to update database:`, updateError);
      } else {
        console.log(`  ✅ Database updated successfully`);
        usersUpdated++;
      }
    } else {
      console.log(`  ℹ️  No changes needed`);
    }

    console.log('');
  }

  console.log('✨ Cleanup complete!');
  console.log(`  👥 Users updated: ${usersUpdated}`);
  console.log(`  🏢 Companies processed: ${companiesProcessed}`);
  console.log(`  🧹 Companies cleaned: ${companiesCleaned}`);
}

// Run cleanup
cleanupSupabaseLinks().catch(error => {
  console.error('❌ Cleanup failed:', error);
  process.exit(1);
});
