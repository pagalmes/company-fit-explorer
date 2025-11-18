/**
 * Supabase Migration Script: Add External Links to Existing Companies
 *
 * This script updates all companies in the Supabase user_company_data table
 * by calling the LLM to generate external links (website, LinkedIn, Glassdoor,
 * Crunchbase) for companies that don't already have them.
 *
 * Usage: npm run migrate:supabase-links
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
  console.error('Required variables:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface Company {
  id: number;
  name: string;
  careerUrl?: string;
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

async function fetchExternalLinks(companyName: string, careerUrl?: string) {
  try {
    // Determine which port the dev server is running on
    const ports = [3002, 3000];
    let response;

    for (const port of ports) {
      try {
        response = await fetch(`http://localhost:${port}/api/llm/perplexity/search-company-urls`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyName })
        });

        if (response.ok) {
          break;
        }
      } catch (e) {
        // Try next port
        continue;
      }
    }

    if (!response || !response.ok) {
      throw new Error(`API call failed`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      // Extract domain from careerUrl for website if available
      let websiteUrl: string | undefined;
      if (careerUrl) {
        try {
          const url = new URL(careerUrl);
          const hostname = url.hostname;

          // Check if it's a third-party ATS (greenhouse, lever, etc.)
          const atsProviders = ['greenhouse.io', 'lever.co', 'ashbyhq.com', 'workday.com', 'myworkdayjobs.com'];
          const isATS = atsProviders.some(ats => hostname.includes(ats));

          if (!isATS) {
            // Extract root domain from career URL
            const parts = hostname.split('.');
            if (parts.length >= 2) {
              const secondLevel = parts[parts.length - 2];
              // Handle multi-part TLDs
              if (['co', 'com', 'org', 'net', 'gov', 'edu', 'ac'].includes(secondLevel) && parts.length >= 3) {
                websiteUrl = `https://${parts.slice(-3).join('.')}`;
              } else {
                websiteUrl = `https://${parts.slice(-2).join('.')}`;
              }
            }
          }
        } catch (e) {
          // If URL parsing fails, websiteUrl remains undefined
        }
      }

      // Only return website URL - LinkedIn/Glassdoor/Crunchbase generated on-the-fly
      return {
        website: websiteUrl || result.data.website
      };
    }

    return null;
  } catch (error) {
    console.error(`  ❌ Error fetching links for ${companyName}:`, error);
    return null;
  }
}

async function migrateSupabaseExternalLinks() {
  console.log('🔄 Starting Supabase external links migration...\n');

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

  let totalCompaniesProcessed = 0;
  let totalCompaniesUpdated = 0;
  let totalCompaniesSkipped = 0;
  let totalCompaniesFailed = 0;

  // Process each user's data
  for (const userData of allUserData as UserCompanyData[]) {
    console.log(`\n👤 Processing user: ${userData.user_id}`);

    if (!userData.companies || !Array.isArray(userData.companies)) {
      console.log('  ⏭️  No companies found for this user');
      continue;
    }

    let userUpdated = false;

    // Process each company for this user
    for (let i = 0; i < userData.companies.length; i++) {
      const company = userData.companies[i];
      totalCompaniesProcessed++;

      // Skip if already has external links
      if (company.externalLinks && Object.keys(company.externalLinks).length > 0) {
        console.log(`  ⏭️  ${company.name}: Already has external links`);
        totalCompaniesSkipped++;
        continue;
      }

      console.log(`  🔍 ${company.name}: Fetching external links...`);

      // Fetch external links from API
      const externalLinks = await fetchExternalLinks(company.name, company.careerUrl);

      if (externalLinks) {
        company.externalLinks = externalLinks;
        userUpdated = true;
        totalCompaniesUpdated++;
        console.log(`    ✅ Added website: ${externalLinks.website || '(none)'}`);
      } else {
        totalCompaniesFailed++;
        console.log(`    ❌ Failed to fetch links`);
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Update the user's data in Supabase if any companies were updated
    if (userUpdated) {
      console.log(`  💾 Updating database for user ${userData.user_id}...`);

      const { error: updateError } = await supabase
        .from('user_company_data')
        .update({ companies: userData.companies })
        .eq('id', userData.id);

      if (updateError) {
        console.error(`  ❌ Failed to update database:`, updateError);
      } else {
        console.log(`  ✅ Database updated successfully`);
      }
    }
  }

  console.log('\n✨ Migration complete!');
  console.log(`  📊 Total companies processed: ${totalCompaniesProcessed}`);
  console.log(`  📈 Updated: ${totalCompaniesUpdated} companies`);
  console.log(`  ⏭️  Skipped: ${totalCompaniesSkipped} companies (already had links)`);
  console.log(`  ❌ Failed: ${totalCompaniesFailed} companies`);
}

// Run migration
migrateSupabaseExternalLinks().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
