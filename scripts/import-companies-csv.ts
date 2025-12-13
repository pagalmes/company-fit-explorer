/**
 * Import Companies from CSV
 *
 * Reads corrected company data from CSV and updates Supabase
 *
 * Usage: npm run import:companies-csv
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

interface CSVRow {
  user_id: string;
  db_id: string;
  company_id: number;
  company_name: string;
  career_url: string;
  website_current: string;
  website_corrected: string;
}

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

function parseCSV(content: string): CSVRow[] {
  const lines = content.split('\n');
  // Skip header line
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parsing (handles quoted fields)
    const values: string[] = [];
    let currentValue = '';
    let insideQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];

      if (char === '"') {
        if (insideQuotes && line[j + 1] === '"') {
          // Escaped quote
          currentValue += '"';
          j++;
        } else {
          // Toggle quote state
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue); // Push last value

    if (values.length >= 7) {
      rows.push({
        user_id: values[0],
        db_id: values[1],
        company_id: parseInt(values[2]),
        company_name: values[3],
        career_url: values[4],
        website_current: values[5],
        website_corrected: values[6]
      });
    }
  }

  return rows;
}

async function importCompaniesFromCSV() {
  console.log('🔄 Importing companies from CSV...\n');

  // Read CSV file
  const csvPath = path.join(__dirname, '..', 'companies-export.csv');

  if (!fs.existsSync(csvPath)) {
    console.error('❌ CSV file not found:', csvPath);
    console.error('💡 Please run: npm run export:companies-csv first');
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(csvContent);

  console.log(`📊 Found ${rows.length} companies in CSV\n`);

  // Group by user
  const updatesByUser = new Map<string, Map<number, string>>();

  let correctionCount = 0;

  for (const row of rows) {
    // Only process if website_corrected is filled in
    if (row.website_corrected && row.website_corrected.trim()) {
      if (!updatesByUser.has(row.db_id)) {
        updatesByUser.set(row.db_id, new Map());
      }
      updatesByUser.get(row.db_id)!.set(row.company_id, row.website_corrected.trim());
      correctionCount++;
    }
  }

  console.log(`✏️  Found ${correctionCount} corrections to apply across ${updatesByUser.size} users\n`);

  if (correctionCount === 0) {
    console.log('ℹ️  No corrections found in website_corrected column');
    console.log('💡 Fill in the "website_corrected" column with corrected URLs and try again');
    return;
  }

  // Fetch and update each user's data
  let usersUpdated = 0;
  let companiesUpdated = 0;

  for (const [dbId, corrections] of updatesByUser) {
    console.log(`👤 Processing updates for db_id: ${dbId}`);

    // Fetch user's current data
    const { data: userData, error: fetchError } = await supabase
      .from('user_company_data')
      .select('*')
      .eq('id', dbId)
      .single();

    if (fetchError || !userData) {
      console.error(`  ❌ Error fetching user data:`, fetchError);
      continue;
    }

    const typedUserData = userData as UserCompanyData;

    if (!typedUserData.companies || !Array.isArray(typedUserData.companies)) {
      console.log(`  ⏭️  No companies found for this user`);
      continue;
    }

    let userHasUpdates = false;

    // Apply corrections
    for (const company of typedUserData.companies) {
      const correctedWebsite = corrections.get(company.id);

      if (correctedWebsite) {
        if (!company.externalLinks) {
          company.externalLinks = {};
        }

        const oldWebsite = company.externalLinks.website || '(none)';
        company.externalLinks.website = correctedWebsite;
        userHasUpdates = true;
        companiesUpdated++;

        console.log(`  ✏️  ${company.name}: ${oldWebsite} → ${correctedWebsite}`);
      }
    }

    // Update database
    if (userHasUpdates) {
      const { error: updateError } = await supabase
        .from('user_company_data')
        .update({ companies: typedUserData.companies })
        .eq('id', dbId);

      if (updateError) {
        console.error(`  ❌ Failed to update database:`, updateError);
      } else {
        console.log(`  ✅ Database updated successfully`);
        usersUpdated++;
      }
    }

    console.log('');
  }

  console.log('✨ Import complete!');
  console.log(`  👥 Users updated: ${usersUpdated}`);
  console.log(`  🏢 Companies updated: ${companiesUpdated}`);
}

// Run import
importCompaniesFromCSV().catch(error => {
  console.error('❌ Import failed:', error);
  process.exit(1);
});
