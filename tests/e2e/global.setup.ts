import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env.local') });

/**
 * Global E2E test setup — runs once before all browser tests.
 *
 * Responsibility: ensure the test user's Supabase data is in the correct
 * state for tests to run against. Uses the service role key (bypasses RLS)
 * so tests are self-sufficient and don't depend on manual DB seeding.
 *
 * Test user: test@example.com (credentials from E2E_TEST_EMAIL / E2E_TEST_PASSWORD)
 */

const TEST_COMPANIES = [
  {
    id: 1, name: 'Acme Corp',
    logo: 'https://img.logo.dev/acme.com?token=pk_test',
    careerUrl: 'https://acme.com/careers',
    matchScore: 92, industry: 'Software', stage: 'Series B',
    location: 'San Francisco, CA', employees: '200-500', remote: 'Hybrid',
    openRoles: 5, connections: [2, 3],
    connectionTypes: { '2': 'industry', '3': 'stage' },
    matchReasons: ['Great culture fit', 'Strong engineering team'],
    color: '#3B82F6', angle: 0, distance: 200,
  },
  {
    id: 2, name: 'Beta Inc',
    logo: 'https://img.logo.dev/beta.com?token=pk_test',
    careerUrl: 'https://beta.com/careers',
    matchScore: 85, industry: 'Software', stage: 'Series A',
    location: 'New York, NY', employees: '50-200', remote: 'Remote',
    openRoles: 3, connections: [1, 4],
    connectionTypes: { '1': 'industry', '4': 'industry' },
    matchReasons: ['Remote friendly', 'Fast growth'],
    color: '#10B981', angle: 72, distance: 200,
  },
  {
    id: 3, name: 'Gamma Ltd',
    logo: 'https://img.logo.dev/gamma.com?token=pk_test',
    careerUrl: 'https://gamma.com/careers',
    matchScore: 78, industry: 'Fintech', stage: 'Series C',
    location: 'Austin, TX', employees: '500-1000', remote: 'On-site',
    openRoles: 8, connections: [1, 5],
    connectionTypes: { '1': 'stage', '5': 'industry' },
    matchReasons: ['Interesting domain', 'Competitive pay'],
    color: '#F59E0B', angle: 144, distance: 200,
  },
  {
    id: 4, name: 'Delta Systems',
    logo: 'https://img.logo.dev/delta.com?token=pk_test',
    careerUrl: 'https://delta.com/careers',
    matchScore: 71, industry: 'Healthcare', stage: 'Series B',
    location: 'Boston, MA', employees: '200-500', remote: 'Hybrid',
    openRoles: 2, connections: [2],
    connectionTypes: { '2': 'location' },
    matchReasons: ['Mission driven', 'Good benefits'],
    color: '#EF4444', angle: 216, distance: 200,
  },
  {
    id: 5, name: 'Epsilon AI',
    logo: 'https://img.logo.dev/epsilon.com?token=pk_test',
    careerUrl: 'https://epsilon.com/careers',
    matchScore: 88, industry: 'AI/ML', stage: 'Series A',
    location: 'Seattle, WA', employees: '50-200', remote: 'Remote',
    openRoles: 6, connections: [3],
    connectionTypes: { '3': 'stage' },
    matchReasons: ['Cutting edge AI', 'Top talent'],
    color: '#8B5CF6', angle: 288, distance: 200,
  },
];

async function globalSetup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const testEmail = process.env.E2E_TEST_EMAIL ?? 'test@example.com';

  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local. ' +
      'These are required for E2E global setup to seed test data.'
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Resolve the test user ID from their email
  const { data: users, error: listError } = await admin.auth.admin.listUsers();
  if (listError) throw new Error(`Failed to list users: ${listError.message}`);

  const testUser = users.users.find((u) => u.email === testEmail);
  if (!testUser) {
    throw new Error(
      `Test user '${testEmail}' not found in auth.users. ` +
      'Run the 004_seed_test_user.sql migration first to create the account.'
    );
  }

  const userId = testUser.id;
  console.log(`[global.setup] Seeding test data for ${testEmail} (${userId})`);

  // Upsert user_company_data with sample companies.
  // Uses service role key — bypasses RLS.
  // Only sets baseCompanies if currently empty so we never clobber real exploration data.
  const { data: existing } = await admin
    .from('user_company_data')
    .select('user_profile')
    .eq('user_id', userId)
    .single();

  const existingCompanies = existing?.user_profile?.baseCompanies ?? [];
  if (existingCompanies.length === 0) {
    const baseProfile = existing?.user_profile ?? {
      id: 'test-user',
      name: 'Test User',
      mustHaves: [],
      wantToHave: [],
      experience: [],
      targetRole: 'Software Engineer',
      targetCompanies: 'Technology companies',
    };

    const { error: upsertError } = await admin
      .from('user_company_data')
      .upsert({
        user_id: userId,
        user_profile: { ...baseProfile, baseCompanies: TEST_COMPANIES },
        companies: [],
      });

    if (upsertError) {
      throw new Error(`Failed to seed user_company_data: ${upsertError.message}`);
    }
    console.log(`[global.setup] Seeded ${TEST_COMPANIES.length} test companies for ${testEmail}`);
  } else {
    console.log(
      `[global.setup] Test user already has ${existingCompanies.length} companies — skipping seed`
    );
  }

  // Ensure user_preferences row exists with a clean watchlist
  const { error: prefError } = await admin
    .from('user_preferences')
    .upsert({
      user_id: userId,
      watchlist_company_ids: [],
      removed_company_ids: [],
      view_mode: 'explore',
    }, { onConflict: 'user_id', ignoreDuplicates: false });

  if (prefError) {
    throw new Error(`Failed to seed user_preferences: ${prefError.message}`);
  }

  // Ensure profile_status is 'complete' so tests bypass onboarding
  const { error: profileError } = await admin
    .from('profiles')
    .upsert({ id: userId, email: testEmail, profile_status: 'complete' }, {
      onConflict: 'id',
      ignoreDuplicates: false,
    });

  if (profileError) {
    throw new Error(`Failed to update profile: ${profileError.message}`);
  }

  console.log('[global.setup] Test data seed complete.');
}

export default globalSetup;
