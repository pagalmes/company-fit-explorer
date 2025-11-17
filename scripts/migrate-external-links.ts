/**
 * Migration Script: Add External Links to Existing Companies
 *
 * This script updates companies-test-data-complete.json by calling the LLM
 * to generate external links (website, LinkedIn, Glassdoor, Crunchbase) for
 * companies that don't already have them.
 *
 * Usage: npm run migrate:external-links
 */

import fs from 'fs';
import path from 'path';

const DATA_FILE_PATH = path.join(process.cwd(), 'src/data/companies-test-data-complete.json');

interface Company {
  id: number;
  name: string;
  careerUrl: string;
  externalLinks?: {
    website?: string;
    linkedin?: string;
    glassdoor?: string;
    crunchbase?: string;
  };
  [key: string]: any;
}

interface UserData {
  baseCompanies: Company[];
  [key: string]: any;
}

async function fetchExternalLinks(companyName: string, careerUrl: string) {
  try {
    const response = await fetch('http://localhost:3002/api/llm/perplexity/search-company-urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName })
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      // Extract domain from careerUrl for website
      let websiteUrl: string | undefined;
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

      return {
        ...result.data,
        website: websiteUrl || result.data.website
      };
    }

    return null;
  } catch (error) {
    console.error(`  ❌ Error fetching links for ${companyName}:`, error);
    return null;
  }
}

async function migrateExternalLinks() {
  console.log('🔄 Starting external links migration...\n');

  // Read the data file
  const fileContent = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
  const userData: UserData = JSON.parse(fileContent);

  if (!userData.baseCompanies || !Array.isArray(userData.baseCompanies)) {
    console.error('❌ No baseCompanies found in data file');
    process.exit(1);
  }

  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  console.log(`📊 Found ${userData.baseCompanies.length} companies\n`);

  // Process each company
  for (let i = 0; i < userData.baseCompanies.length; i++) {
    const company = userData.baseCompanies[i];

    // Skip if already has external links
    if (company.externalLinks && Object.keys(company.externalLinks).length > 0) {
      console.log(`⏭️  ${i + 1}/${userData.baseCompanies.length} - ${company.name}: Already has external links`);
      skippedCount++;
      continue;
    }

    console.log(`🔍 ${i + 1}/${userData.baseCompanies.length} - ${company.name}: Fetching external links...`);

    // Fetch external links from API
    const externalLinks = await fetchExternalLinks(company.name, company.careerUrl);

    if (externalLinks) {
      company.externalLinks = externalLinks;
      updatedCount++;
      console.log(`  ✅ Added external links:`, {
        website: externalLinks.website ? '✓' : '✗',
        linkedin: externalLinks.linkedin ? '✓' : '✗',
        glassdoor: externalLinks.glassdoor ? '✓' : '✗',
        crunchbase: externalLinks.crunchbase ? '✓' : '✗'
      });
    } else {
      failedCount++;
      console.log(`  ❌ Failed to fetch links`);
    }

    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Write updated data back to file
  fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(userData, null, 2), 'utf-8');

  console.log('\n✨ Migration complete!');
  console.log(`  📈 Updated: ${updatedCount} companies`);
  console.log(`  ⏭️  Skipped: ${skippedCount} companies (already had links)`);
  console.log(`  ❌ Failed: ${failedCount} companies`);
}

// Run migration
migrateExternalLinks().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
