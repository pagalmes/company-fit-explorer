import { UserCMF, UserExplorationState } from '../types';

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
    // TODO: Add PDF parsing library (pdf-parse) for better PDF support
    reader.readAsText(file);
  });
}

/**
 * Call Perplexity API to discover companies based on CV and CMF files
 */
async function discoverCompaniesWithPerplexity(
  resumeText: string,
  cmfText: string,
  candidateName: string
): Promise<any> {
  console.log('🔍 Calling Perplexity company discovery API...');

  // First, extract basic CMF data from the text files
  const extractedCMF = extractCMFFromText(cmfText, resumeText);

  const response = await fetch('/api/llm/perplexity/discover-companies', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      candidateName: candidateName || extractedCMF.name || 'User',
      targetRole: extractedCMF.targetRole || 'Professional Role',
      experience: extractedCMF.experience || [],
      targetCompanies: extractedCMF.targetCompanies || 'Growth-oriented companies',
      mustHaves: extractedCMF.mustHaves || [],
      wantToHave: extractedCMF.wantToHave || [],
      resumeText,
      cmfText
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Perplexity API error: ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to discover companies');
  }

  return result.data;
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
 * NEW: Create user profile and discover companies using Perplexity API
 * Returns the full discovery data (CMF + companies)
 */
export const createUserProfileFromFiles = async (
  resumeFile: File,
  cmfFile: File,
  baseId: string = 'user'
): Promise<any> => {
  console.log(`📁 Files received for processing: ${resumeFile.name}, ${cmfFile.name}`);

  try {
    // Read file contents
    const resumeText = await readFileAsText(resumeFile);
    const cmfText = await readFileAsText(cmfFile);

    console.log(`📄 Resume text length: ${resumeText.length} characters`);
    console.log(`📄 CMF text length: ${cmfText.length} characters`);

    // Extract name from filename for fallback
    const fileName = resumeFile.name.split('.')[0];
    const candidateName = fileName.charAt(0).toUpperCase() + fileName.slice(1).replace(/[_-]/g, ' ');

    // Call Perplexity API to discover companies
    console.log('🚀 Starting Perplexity company discovery...');
    const discoveryData = await discoverCompaniesWithPerplexity(
      resumeText,
      cmfText,
      candidateName
    );

    console.log(`✅ Discovery complete!`);
    console.log(`   Profile: ${discoveryData.cmf.name}`);
    console.log(`   Target Role: ${discoveryData.cmf.targetRole}`);
    console.log(`   Companies discovered: ${discoveryData.baseCompanies.length}`);
    console.log(`   Must-Haves: ${discoveryData.cmf.mustHaves.length} items`);
    console.log(`   Want-to-Have: ${discoveryData.cmf.wantToHave.length} items`);

    // Return the full discovery data (CMF + companies)
    // The calling code (AppContainer) will handle merging this into UserExplorationState
    return discoveryData;

  } catch (error) {
    console.error('❌ Error in Perplexity company discovery:', error);

    // Throw error with descriptive message instead of silently falling back
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Company discovery failed: ${errorMessage}`);
  }
};