import { NextRequest, NextResponse } from 'next/server';
import type { MatchedJob, CandidatePreferences } from '@/types/interview';

const CRAWLER_API_URL = process.env.CRAWLER_API_URL || 'http://localhost:8000';
const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';

export async function POST(request: NextRequest) {
  try {
    const { preferences, resumeSkills } = await request.json() as {
      preferences: string;
      resumeSkills?: string[];
    };

    if (!preferences) {
      return NextResponse.json(
        { error: 'Preferences summary is required' },
        { status: 400 }
      );
    }

    // Extract structured preferences using Ollama
    const extractedPreferences = await extractPreferences(preferences);

    // Build search keywords from preferences and skills
    const keywords = buildSearchKeywords(extractedPreferences, resumeSkills);

    // Search for jobs using the crawler API
    const jobs = await searchJobs(keywords, extractedPreferences);

    // Score and rank jobs based on preferences
    const scoredJobs = scoreJobs(jobs, extractedPreferences, resumeSkills || []);

    return NextResponse.json({
      success: true,
      jobs: scoredJobs,
      preferences: extractedPreferences,
      searchKeywords: keywords,
    });
  } catch (error) {
    console.error('Jobs API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to search jobs',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function extractPreferences(preferencesText: string): Promise<CandidatePreferences> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        prompt: `Extract structured job preferences from this interview summary. Return ONLY valid JSON with these fields:
- targetRoles: array of job titles they're looking for
- preferredLocations: array of locations mentioned
- remotePreference: one of "remote", "hybrid", "onsite", or "flexible"
- industries: array of industries mentioned
- mustHaves: array of required criteria
- niceToHaves: array of preferred but not required criteria

Interview summary:
${preferencesText}

Return ONLY the JSON object, no explanation:`,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 1000,
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const jsonMatch = data.response?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]) as CandidatePreferences;
        } catch {
          // Fall through to defaults
        }
      }
    }
  } catch (error) {
    console.warn('Failed to extract preferences with Ollama:', error);
  }

  // Fallback: basic keyword extraction
  return extractPreferencesFallback(preferencesText);
}

function extractPreferencesFallback(text: string): CandidatePreferences {
  const lowerText = text.toLowerCase();
  
  const roles: string[] = [];
  const rolePatterns = [
    'software engineer', 'developer', 'frontend', 'backend', 'full stack',
    'product manager', 'designer', 'data scientist', 'devops', 'sre',
    'manager', 'lead', 'senior', 'junior', 'engineer', 'architect',
    'security', 'product security', 'application security', 'staff', 'principal'
  ];
  
  for (const pattern of rolePatterns) {
    if (lowerText.includes(pattern)) {
      roles.push(pattern);
    }
  }

  let remotePreference: 'remote' | 'hybrid' | 'onsite' | 'flexible' = 'flexible';
  if (lowerText.includes('remote only') || lowerText.includes('fully remote')) {
    remotePreference = 'remote';
  } else if (lowerText.includes('hybrid')) {
    remotePreference = 'hybrid';
  } else if (lowerText.includes('in-office') || lowerText.includes('on-site')) {
    remotePreference = 'onsite';
  }

  // Extract locations
  const locations: string[] = [];
  const locationPatterns = [
    'san diego', 'los angeles', 'san francisco', 'new york', 'seattle',
    'austin', 'denver', 'chicago', 'boston', 'remote'
  ];
  for (const loc of locationPatterns) {
    if (lowerText.includes(loc)) {
      locations.push(loc);
    }
  }

  return {
    targetRoleLevel: roles.find(r => ['senior', 'staff', 'principal', 'lead'].includes(r)) || 'senior',
    targetFunction: roles.find(r => r.includes('security')) || 'engineering',
    workTypePreferences: [],
    companyStagePreference: [],
    keyExperiences: [],
    preferredLocations: locations,
    remotePreference,
    cultureValues: [],
    teamDynamics: [],
    mustHaves: { other: [] },
    niceToHaves: { other: [] },
    industries: [],
    targetRoles: roles.length > 0 ? roles : ['software engineer'],
  };
}

function buildSearchKeywords(
  preferences: CandidatePreferences, 
  skills?: string[]
): string[] {
  const keywords: string[] = [];
  
  // Add target roles as keywords
  keywords.push(...preferences.targetRoles);
  
  // Add top skills
  if (skills && skills.length > 0) {
    keywords.push(...skills.slice(0, 5));
  }
  
  // Add industries
  keywords.push(...preferences.industries);
  
  return [...new Set(keywords)]; // Remove duplicates
}

async function searchJobs(
  keywords: string[], 
  preferences: CandidatePreferences
): Promise<MatchedJob[]> {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    params.append('limit', '50');
    params.append('active_only', 'true');
    
    if (keywords.length > 0) {
      params.append('keywords', keywords.join(','));
    }
    
    if (preferences.preferredLocations.length > 0) {
      params.append('location', preferences.preferredLocations[0]);
    } else if (preferences.remotePreference === 'remote') {
      params.append('location', 'remote');
    }

    const response = await fetch(`${CRAWLER_API_URL}/jobs?${params.toString()}`);
    
    if (!response.ok) {
      console.error('Crawler API error:', response.status);
      return getMockJobs(keywords, preferences);
    }

    const jobs = await response.json();
    return jobs as MatchedJob[];
  } catch (error) {
    console.error('Failed to fetch jobs from crawler:', error);
    // Return mock jobs if crawler is not available
    return getMockJobs(keywords, preferences);
  }
}

function scoreJobs(
  jobs: MatchedJob[], 
  preferences: CandidatePreferences,
  skills: string[]
): MatchedJob[] {
  return jobs.map(job => {
    let score = 50; // Base score
    const reasons: string[] = [];
    
    const titleLower = job.title.toLowerCase();
    const descLower = (job.description || '').toLowerCase();
    
    // Score based on role match
    for (const role of preferences.targetRoles) {
      if (titleLower.includes(role.toLowerCase())) {
        score += 15;
        reasons.push(`Matches your target role: ${role}`);
        break;
      }
    }
    
    // Score based on skills match
    let skillMatches = 0;
    for (const skill of skills) {
      if (descLower.includes(skill.toLowerCase()) || titleLower.includes(skill.toLowerCase())) {
        skillMatches++;
      }
    }
    if (skillMatches > 0) {
      score += Math.min(skillMatches * 5, 20);
      reasons.push(`Matches ${skillMatches} of your skills`);
    }
    
    // Score based on remote preference
    const locationLower = (job.location || '').toLowerCase();
    if (preferences.remotePreference === 'remote' && locationLower.includes('remote')) {
      score += 10;
      reasons.push('Offers remote work');
    }
    
    // Score based on industry
    for (const industry of preferences.industries) {
      if (descLower.includes(industry.toLowerCase())) {
        score += 5;
        reasons.push(`In your preferred industry: ${industry}`);
        break;
      }
    }
    
    // Cap score at 100
    score = Math.min(score, 100);
    
    return {
      ...job,
      matchScore: score,
      matchReasons: reasons.length > 0 ? reasons : ['Good potential match'],
    };
  }).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
}

function getMockJobs(keywords: string[], _preferences: CandidatePreferences): MatchedJob[] {
  // Return mock jobs when crawler is not available
  const mockJobs: MatchedJob[] = [
    {
      job_id: 1,
      company_name: 'TechCorp',
      title: 'Senior Software Engineer',
      description: 'We are looking for a senior software engineer to join our team...',
      requirements: 'JavaScript, TypeScript, React, Node.js',
      location: 'Remote',
      application_url: 'https://example.com/apply/1',
      scraped_at: new Date().toISOString(),
      is_active: true,
    },
    {
      job_id: 2,
      company_name: 'StartupXYZ',
      title: 'Full Stack Developer',
      description: 'Join our fast-paced startup as a full stack developer...',
      requirements: 'Python, Django, React, PostgreSQL',
      location: 'San Francisco, CA (Hybrid)',
      application_url: 'https://example.com/apply/2',
      scraped_at: new Date().toISOString(),
      is_active: true,
    },
    {
      job_id: 3,
      company_name: 'Enterprise Solutions',
      title: 'Product Manager',
      description: 'Lead product development for our enterprise solutions...',
      requirements: '5+ years PM experience, Agile, technical background',
      location: 'New York, NY',
      application_url: 'https://example.com/apply/3',
      scraped_at: new Date().toISOString(),
      is_active: true,
    },
  ];
  
  // Filter based on keywords
  if (keywords.length > 0) {
    return mockJobs.filter(job => {
      const text = `${job.title} ${job.description}`.toLowerCase();
      return keywords.some(kw => text.includes(kw.toLowerCase()));
    });
  }
  
  return mockJobs;
}

// GET endpoint to check crawler status
export async function GET() {
  try {
    const response = await fetch(`${CRAWLER_API_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      return NextResponse.json({
        status: 'connected',
        crawlerUrl: CRAWLER_API_URL,
      });
    }
    
    return NextResponse.json({
      status: 'error',
      message: 'Crawler API not responding',
    }, { status: 503 });
  } catch {
    return NextResponse.json({
      status: 'disconnected',
      message: 'Crawler API not available. Using mock data.',
      crawlerUrl: CRAWLER_API_URL,
    }, { status: 503 });
  }
}

