import type { UserCMF, Company, UserExplorationState } from '../types';
import { getCMFCombinedText } from '../types';

// ---------------------------------------------------------------------------
// Response-shape interfaces for fetch calls
// ---------------------------------------------------------------------------

interface ExtractProfileCMF {
  name?: string;
  targetRole?: string;
  mustHaves: (string | import('../types').CMFItem)[];
  wantToHave: (string | import('../types').CMFItem)[];
  experience: string[];
  targetCompanies?: string;
}

interface ExtractProfileResponse {
  success: boolean;
  error?: string;
  cmf: ExtractProfileCMF;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
  };
}

/** The company list shape returned inside DiscoverCompaniesResponse.data */
export interface DiscoveryResult {
  baseCompanies: Company[];
  [key: string]: unknown;
}

interface DiscoverCompaniesResponse {
  success: boolean;
  error?: string;
  warning?: string;
  data: DiscoveryResult;
}

/**
 * Read file content as text
 */
async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(text);
    };

    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));

    // For PDFs, this will get binary content, but for text files it works
    reader.readAsText(file);
  });
}

/**
 * Convert file to base64 for API transmission
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const result = e.target?.result as string;
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };

    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/**
 * Extract profile using Claude API
 * Returns structured UserCMF data from resume and career goals documents
 */
async function extractProfileWithClaude(
  resumeFile: File,
  careerGoalsFile: File
): Promise<Partial<UserCMF>> {
  console.log('🤖 Extracting profile with Claude Opus 4.5...');

  // Convert files to base64
  const resumeBase64 = await fileToBase64(resumeFile);
  const careerGoalsBase64 = await fileToBase64(careerGoalsFile);

  const response = await fetch('/api/llm/anthropic/extract-profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      resume: {
        data: resumeBase64,
        type: resumeFile.type,
        name: resumeFile.name
      },
      careerGoals: {
        data: careerGoalsBase64,
        type: careerGoalsFile.type,
        name: careerGoalsFile.name
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(errorData.error || `Profile extraction failed: ${response.status}`);
  }

  const result = await response.json() as ExtractProfileResponse;

  if (!result.success) {
    throw new Error(result.error || 'Profile extraction failed');
  }

  console.log('✅ Profile extracted successfully');
  console.log(`   Name: ${result.cmf.name}`);
  console.log(`   Target Role: ${result.cmf.targetRole}`);
  console.log(`   Must-Haves: ${result.cmf.mustHaves.length} items`);
  console.log(`   Want-to-Have: ${result.cmf.wantToHave.length} items`);
  console.log(`   Experience: ${result.cmf.experience.length} items`);

  if (result.usage) {
    console.log(`   Tokens: ${result.usage.inputTokens} in / ${result.usage.outputTokens} out`);
    console.log(`   Cost: $${result.usage.totalCost.toFixed(4)}`);
  }

  return result.cmf;
}

/**
 * Call Perplexity API to discover companies based on extracted CMF profile
 * @internal Currently disabled for debugging - will be re-enabled after profile extraction is verified
 */
export async function discoverCompaniesWithPerplexity(
  extractedCMF: Partial<UserCMF>
): Promise<DiscoveryResult & { _warning?: string }> {
  console.log('🔍 Calling Perplexity company discovery API...');

  // Convert CMFItem arrays to combined "Short: Detailed" format for Perplexity matching
  // This gives Perplexity both the concise label and full context for better company matching
  // Format: "High Velocity of Execution: A dynamic pace of work where we move and learn quickly..."
  const mustHavesForMatching = (extractedCMF.mustHaves || []).map(getCMFCombinedText);
  const wantToHaveForMatching = (extractedCMF.wantToHave || []).map(getCMFCombinedText);

  const response = await fetch('/api/llm/perplexity/discover-companies', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      candidateName: extractedCMF.name || 'User',
      targetRole: extractedCMF.targetRole || 'Professional Role',
      experience: extractedCMF.experience || [],
      targetCompanies: extractedCMF.targetCompanies || 'Growth-oriented companies',
      mustHaves: mustHavesForMatching,
      wantToHave: wantToHaveForMatching
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(errorData.error || `Perplexity API error: ${response.status}`);
  }

  const result = await response.json() as DiscoverCompaniesResponse;

  if (!result.success) {
    throw new Error(result.error || 'Failed to discover companies');
  }

  // Log warning if present (e.g., Perplexity API key not configured)
  if (result.warning) {
    console.warn(`⚠️ ${result.warning}`);
  }

  // Return data with warning attached if present
  return {
    ...result.data,
    _warning: result.warning
  };
}

/**
 * Extract CMF data from text using improved regex patterns
 */
function extractCMFFromText(cmfText: string, resumeText: string): Partial<UserCMF> {
  const combinedText = `${cmfText}\n\n${resumeText}`;

  return {
    name: extractNameFromText(combinedText),
    targetRole: extractRoleFromText(cmfText) || extractRoleFromText(resumeText),
    mustHaves: extractMustHavesFromText(cmfText),
    wantToHave: extractWantToHaveFromText(cmfText),
    experience: extractExperienceFromText(resumeText),
    targetCompanies: extractCompanyTypesFromText(cmfText)
  };
}

/**
 * Extract candidate name from text
 */
function extractNameFromText(text: string): string | undefined {
  // Look for common name patterns at the start of resumes/CVs
  const namePatterns = [
    /^([A-Z][a-z]+\s+[A-Z][a-z]+)/m, // "John Doe" at start
    /Name:\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    /([A-Z][A-Z\s]+)\s*\n/m // ALL CAPS name
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      if (name.length > 3 && name.length < 50) {
        return name;
      }
    }
  }

  return undefined;
}

// Simple text analysis to extract information from files
const extractExperienceFromText = (text: string): string[] => {
  const experiencePatterns = [
    /\b(\d+)\+?\s*years?\s+(?:of\s+)?experience/gi,
    /\b(senior|lead|principal|staff|director|vp|ceo|cto)\b/gi,
    /worked\s+(?:at|for)\s+([A-Za-z0-9\s&,.-]+?)(?:\n|\.|\s{2,})/gi,
    /experience\s+(?:at|with|in)\s+([A-Za-z0-9\s&,.-]+?)(?:\n|\.|\s{2,})/gi
  ];
  
  const experience = new Set<string>();
  experiencePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleaned = match.replace(/\s{2,}/g, ' ').trim();
        if (cleaned.length > 3 && cleaned.length < 100) {
          experience.add(cleaned);
        }
      });
    }
  });
  
  return Array.from(experience).slice(0, 8);
};

const extractRoleFromText = (text: string): string => {
  const rolePatterns = [
    /(?:target|seeking|looking for|interested in)\s+(?:role|position|job)?\s*:?\s*([^\n.]{10,80})/gi,
    /(?:^|\n)\s*(?:role|position|title)\s*:?\s*([^\n.]{5,50})/gi,
    /(product manager|software engineer|data scientist|designer|director|vp)/gi
  ];
  
  for (const pattern of rolePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return 'Professional Role';
};

const extractMustHavesFromText = (text: string): string[] => {
  const mustHavePatterns = [
    /(?:must[\s-]*haves?|requirements?|non[\s-]*negotiables?)\s*:?\s*([^#]*?)(?=\n\s*(?:want|nice|plus)|$)/gi,
    /(?:^|\n)\s*[-•*]\s*([^\n]{10,100})/gim,
    /(remote|flexible|high growth|good culture|competitive salary)/gi
  ];
  
  const mustHaves = new Set<string>();
  mustHavePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Clean up bullet points and extract meaningful requirements
        const lines = match.split('\n');
        lines.forEach(line => {
          const cleaned = line.replace(/^[-•*]\s*/, '').trim();
          if (cleaned.length > 5 && cleaned.length < 120) {
            mustHaves.add(cleaned);
          }
        });
      });
    }
  });
  
  return Array.from(mustHaves).slice(0, 8);
};

const extractWantToHaveFromText = (text: string): string[] => {
  const wantToHavePatterns = [
    /(?:want[\s-]*to[\s-]*haves?|nice[\s-]*to[\s-]*haves?|plus|bonus|preferred)\s*:?\s*([^#]*?)(?=\n\s*(?:must|requirements)|$)/gi,
    /(?:would\s+like|hoping\s+for|interested\s+in)\s+([^\n]{10,80})/gi,
    /(ai\/ml|platform strategy|innovation|startup environment|equity)/gi
  ];
  
  const wantToHave = new Set<string>();
  wantToHavePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const lines = match.split('\n');
        lines.forEach(line => {
          const cleaned = line.replace(/^[-•*]\s*/, '').trim();
          if (cleaned.length > 5 && cleaned.length < 120) {
            wantToHave.add(cleaned);
          }
        });
      });
    }
  });
  
  return Array.from(wantToHave).slice(0, 8);
};

const extractCompanyTypesFromText = (text: string): string => {
  const companyPatterns = [
    /(startup|scale-up|enterprise|public company|late stage|early stage|series [a-z])/gi,
    /(?:target|interested in|looking at)\s+companies?\s*:?\s*([^\n.]{10,100})/gi
  ];
  
  for (const pattern of companyPatterns) {
    const match = text.match(pattern);
    if (match && match[0]) {
      return match[0].trim();
    }
  }
  
  return 'Growth-oriented companies';
};

export const processResumeFile = async (file: File): Promise<Partial<UserCMF>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lowerText = text.toLowerCase();
        
        // Extract information from resume
        const experience = extractExperienceFromText(text);
        const targetRole = extractRoleFromText(lowerText);
        
        // Generate name from filename or use default
        const fileName = file.name.split('.')[0];
        const name = fileName.charAt(0).toUpperCase() + fileName.slice(1).replace(/[_-]/g, ' ');
        
        resolve({
          name,
          experience: experience.length > 0 ? experience : ['Professional experience'],
          targetRole: targetRole || 'Professional Role'
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read resume file'));
    
    // For PDFs, we'll get binary content, but for simplicity we'll read as text
    // In a real implementation, you'd use pdf-parse or similar library
    reader.readAsText(file);
  });
};

export const processCMFFile = async (file: File): Promise<Partial<UserCMF>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        
        // Extract CMF information
        const mustHaves = extractMustHavesFromText(text);
        const wantToHave = extractWantToHaveFromText(text);
        const targetRole = extractRoleFromText(text);
        const targetCompanies = extractCompanyTypesFromText(text);
        
        resolve({
          mustHaves: mustHaves.length > 0 ? mustHaves : ['High-quality team culture', 'Growth opportunities', 'Competitive compensation'],
          wantToHave: wantToHave.length > 0 ? wantToHave : ['Remote flexibility', 'Innovation focus', 'Professional development'],
          targetRole: targetRole || 'Professional Role',
          targetCompanies: targetCompanies || 'Growth-oriented companies'
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read CMF file'));
    reader.readAsText(file);
  });
};

/**
 * Create user profile and discover companies
 *
 * Two-phase architecture:
 * 1. Claude Opus 4.5 extracts structured profile from resume + career goals (PDF support)
 * 2. Perplexity discovers matching companies based on extracted profile
 *
 * Returns the full discovery data (CMF + companies)
 */
export const createUserProfileFromFiles = async (
  resumeFile: File,
  cmfFile: File,
  baseId: string = 'user'
): Promise<UserExplorationState> => {
  console.log(`📁 Files received for processing: ${resumeFile.name}, ${cmfFile.name}`);

  try {
    // Phase 1: Extract profile using Claude Opus 4.5
    // This supports PDFs and provides much better extraction than regex
    console.log('📋 Phase 1: Extracting profile with Claude...');
    let extractedCMF: Partial<UserCMF>;

    try {
      extractedCMF = await extractProfileWithClaude(resumeFile, cmfFile);
    } catch (extractError) {
      console.error('❌ Claude extraction failed, falling back to regex:', extractError);

      // Fallback to regex-based extraction if Claude fails
      const resumeText = await readFileAsText(resumeFile);
      const cmfText = await readFileAsText(cmfFile);
      extractedCMF = extractCMFFromText(cmfText, resumeText);

      // Extract name from filename for fallback
      if (!extractedCMF.name) {
        const fileName = resumeFile.name.split('.')[0];
        extractedCMF.name = fileName.charAt(0).toUpperCase() + fileName.slice(1).replace(/[_-]/g, ' ');
      }
    }

    // DEBUG MODE: Skip Perplexity call, just return profile with empty companies
    // TODO: Re-enable Phase 2 after profile extraction is working
    console.log('⚠️ DEBUG MODE: Skipping Perplexity company discovery');
    console.log(`   Profile: ${extractedCMF.name}`);
    console.log(`   Target Role: ${extractedCMF.targetRole}`);
    console.log(`   Target Companies: ${extractedCMF.targetCompanies}`);
    console.log(`   Must-Haves: ${extractedCMF.mustHaves?.length || 0} items`);
    console.log(`   Want-to-Have: ${extractedCMF.wantToHave?.length || 0} items`);
    console.log(`   Experience: ${extractedCMF.experience?.length || 0} items`);

    // Return profile with empty company list
    return {
      id: baseId,
      name: extractedCMF.name || 'User',
      cmf: {
        id: baseId,
        name: extractedCMF.name || 'User',
        targetRole: extractedCMF.targetRole || '',
        mustHaves: extractedCMF.mustHaves ?? [],
        wantToHave: extractedCMF.wantToHave ?? [],
        experience: extractedCMF.experience ?? [],
        targetCompanies: extractedCMF.targetCompanies ?? ''
      },
      baseCompanies: [],
      addedCompanies: [],
      removedCompanyIds: [],
      watchlistCompanyIds: [],
      viewMode: 'explore' as const,
      _warning: 'DEBUG MODE: Company discovery skipped'
    };

    /* Phase 2: Discover companies using Perplexity (disabled for debugging)
    console.log('🚀 Phase 2: Discovering companies with Perplexity...');

    const discoveryData = await discoverCompaniesWithPerplexity(extractedCMF);

    // Log warning if Perplexity was not available
    if (discoveryData._warning) {
      console.warn(`⚠️ Discovery warning: ${discoveryData._warning}`);
      console.log(`   Profile created with empty company list`);
    } else {
      console.log(`✅ Discovery complete!`);
      console.log(`   Companies discovered: ${discoveryData.baseCompanies?.length || 0}`);
    }

    // Combine Claude's CMF (source of truth) with Perplexity's discovered companies
    return {
      id: baseId,
      name: extractedCMF.name || 'User',
      cmf: {
        id: baseId,
        ...extractedCMF
      },
      baseCompanies: discoveryData.baseCompanies || [],
      addedCompanies: [],
      removedCompanyIds: [],
      watchlistCompanyIds: [],
      viewMode: 'explore' as const,
      _warning: discoveryData._warning
    };
    */

  } catch (error) {
    console.error('❌ Error in profile extraction/company discovery:', error);

    // Throw error with descriptive message instead of silently falling back
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Profile extraction or company discovery failed: ${errorMessage}`);
  }
};