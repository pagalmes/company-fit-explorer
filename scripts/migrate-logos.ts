/**
 * Logo Migration Script
 *
 * Run this script to migrate all logo URLs in the database to the proxy format
 * Usage: npx tsx scripts/migrate-logos.ts
 */

async function migrateLogo() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  console.log('🚀 Starting logo migration...');
  console.log(`Calling ${baseUrl}/api/migrate-logos`);

  try {
    const response = await fetch(`${baseUrl}/api/migrate-logos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Migration failed:', data);
      process.exit(1);
    }

    console.log('✅ Migration completed successfully!');
    console.log(`Total users: ${data.totalUsers}`);
    console.log(`Users updated: ${data.usersUpdated}`);
    console.log('\nResults:');
    data.results.forEach((result: any) => {
      if (result.success) {
        console.log(`  ✓ User ${result.userId}: ${result.companiesUpdated} companies updated`);
      } else {
        console.log(`  ✗ User ${result.userId}: ${result.error}`);
      }
    });

  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

migrateLogo();
