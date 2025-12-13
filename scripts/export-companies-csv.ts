/**
 * Export Companies to CSV
 *
 * Exports all companies from Supabase with their external links
 * for review and manual correction.
 *
 * Usage: npm run export:companies-csv
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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

function escapeCSV(value: string | undefined): string {
  if (!value) return '';
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

async function exportCompaniesToCSV() {
  console.log('🔄 Exporting companies to CSV...\n');

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

  // Collect all unique companies (deduplicated by name)
  const companiesMap = new Map<string, Company & { user_id: string; db_id: string; company_id: number }>();

  for (const userData of allUserData as UserCompanyData[]) {
    if (!userData.companies || !Array.isArray(userData.companies)) {
      continue;
    }

    for (const company of userData.companies) {
      const key = `${userData.user_id}:${company.id}:${company.name}`;

      // Store each company instance (even duplicates across users)
      if (!companiesMap.has(key)) {
        companiesMap.set(key, {
          ...company,
          user_id: userData.user_id,
          db_id: userData.id,
          company_id: company.id
        });
      }
    }
  }

  console.log(`📝 Found ${companiesMap.size} company entries\n`);

  // Create CSV content - only website URL (LinkedIn/Glassdoor/Crunchbase generated on-the-fly)
  const headers = [
    'user_id',
    'db_id',
    'company_id',
    'company_name',
    'career_url',
    'website_current',
    'website_corrected'
  ];

  const rows: string[] = [headers.join(',')];

  for (const [_, company] of companiesMap) {
    const row = [
      escapeCSV(company.user_id),
      escapeCSV(company.db_id),
      String(company.company_id),
      escapeCSV(company.name),
      escapeCSV(company.careerUrl || ''),
      escapeCSV(company.externalLinks?.website || ''),
      '' // website_corrected - leave empty for user to fill
    ];
    rows.push(row.join(','));
  }

  const csvContent = rows.join('\n');

  // Write to file
  const outputPath = path.join(__dirname, '..', 'companies-export.csv');
  fs.writeFileSync(outputPath, csvContent, 'utf-8');

  console.log(`✅ CSV exported successfully!`);
  console.log(`📁 File location: ${outputPath}`);
  console.log(`📊 Total entries: ${companiesMap.size}`);
  console.log('\n💡 Instructions:');
  console.log('  1. Open companies-export.csv in your spreadsheet app');
  console.log('  2. Review the "website_current" column');
  console.log('  3. Add corrected URLs in the "website_corrected" column');
  console.log('  4. Save the file');
  console.log('  5. Run: npm run import:companies-csv');
}

// Run export
exportCompaniesToCSV().catch(error => {
  console.error('❌ Export failed:', error);
  process.exit(1);
});
