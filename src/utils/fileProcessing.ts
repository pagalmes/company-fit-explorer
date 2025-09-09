import { UserCMF } from '../types';

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

export const createUserProfileFromFiles = async (
  resumeFile: File, 
  cmfFile: File, 
  baseId: string = 'user'
): Promise<UserCMF> => {
  // TODO: Replace with sophisticated extraction logic in future
  // For now, return empty profile regardless of file content
  console.log(`📁 Files received for processing: ${resumeFile.name}, ${cmfFile.name}`);
  console.log('🔧 Simple extraction disabled - returning empty profile (will be replaced with sophisticated logic)');
  
  // Extract just the name from resume filename for personalization
  const fileName = resumeFile.name.split('.')[0];
  const name = fileName.charAt(0).toUpperCase() + fileName.slice(1).replace(/[_-]/g, ' ');
  
  // Return completely empty CMF profile
  return {
    id: baseId,
    name: name || 'User',
    targetRole: '',
    mustHaves: [],
    wantToHave: [],
    experience: [],
    targetCompanies: ''
  };
};