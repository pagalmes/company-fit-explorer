/**
 * Transform interview output to UserCMF format for cosmos explorer
 */

import { UserCMF, UserExplorationState, Company } from '../types';
import { CandidatePreferences, ParsedResume } from '../types/interview';

/**
 * Convert CandidatePreferences from interview to UserCMF for cosmos explorer
 */
export function candidatePreferencesToCMF(
  preferences: CandidatePreferences,
  resume?: ParsedResume | null,
  userId?: string
): UserCMF {
  // Combine target role level and function
  const targetRole = [
    preferences.targetRoleLevel,
    preferences.targetFunction
  ].filter(Boolean).join(' ');

  // Extract all must-haves into array
  const mustHaves: string[] = [];
  
  if (preferences.mustHaves.velocityOfExecution) {
    mustHaves.push(`High Velocity: ${preferences.mustHaves.velocityOfExecution}`);
  }
  if (preferences.mustHaves.growthEnvironment) {
    mustHaves.push(`Growth: ${preferences.mustHaves.growthEnvironment}`);
  }
  if (preferences.mustHaves.peopleCulture) {
    mustHaves.push(`Culture: ${preferences.mustHaves.peopleCulture}`);
  }
  if (preferences.mustHaves.locationSchedule) {
    mustHaves.push(`Location: ${preferences.mustHaves.locationSchedule}`);
  }
  if (preferences.mustHaves.other?.length) {
    mustHaves.push(...preferences.mustHaves.other);
  }
  
  // Add location preferences as must-haves
  if (preferences.preferredLocations?.length) {
    mustHaves.push(`Location: ${preferences.preferredLocations.join(', ')}`);
  }
  if (preferences.remotePreference && preferences.remotePreference !== 'flexible') {
    mustHaves.push(`Work Style: ${preferences.remotePreference}`);
  }
  
  // Add culture values as must-haves
  if (preferences.cultureValues?.length) {
    mustHaves.push(...preferences.cultureValues);
  }

  // Extract nice-to-haves
  const wantToHave: string[] = [];
  
  if (preferences.niceToHaves.productStrategy) {
    wantToHave.push('Product & Platform Strategy');
  }
  if (preferences.niceToHaves.crossFunctionalCollab) {
    wantToHave.push('Cross-Functional Collaboration');
  }
  if (preferences.niceToHaves.teamBuilding) {
    wantToHave.push('Team Building & Leadership');
  }
  if (preferences.niceToHaves.customerFocus) {
    wantToHave.push('Customer-Obsessed Culture');
  }
  if (preferences.niceToHaves.productExcellence) {
    wantToHave.push('Product Excellence & Craftsmanship');
  }
  if (preferences.niceToHaves.accountability) {
    wantToHave.push('Accountability & Humility');
  }
  if (preferences.niceToHaves.developerSuccess) {
    wantToHave.push('Developer Success Focus');
  }
  if (preferences.niceToHaves.technicalInnovation) {
    wantToHave.push('Technical Innovation');
  }
  if (preferences.niceToHaves.other?.length) {
    wantToHave.push(...preferences.niceToHaves.other);
  }
  
  // Add team dynamics as nice-to-haves
  if (preferences.teamDynamics?.length) {
    wantToHave.push(...preferences.teamDynamics);
  }

  // Combine experience from preferences and resume
  const experience: string[] = [
    ...(preferences.keyExperiences || []),
    ...(preferences.workTypePreferences || []),
  ];
  
  // Add resume skills and experience
  if (resume?.skills?.length) {
    experience.push(...resume.skills.slice(0, 5)); // Top 5 skills
  }
  if (resume?.experience?.length) {
    resume.experience.slice(0, 3).forEach(exp => {
      if (exp.title) experience.push(exp.title);
    });
  }

  // Company stage preferences
  const targetCompanies = preferences.companyStagePreference?.length
    ? preferences.companyStagePreference.join(', ')
    : 'All company stages';

  return {
    id: userId || `interview-${Date.now()}`,
    name: resume?.name || 'Interview User',
    targetRole: targetRole || 'Senior Role',
    mustHaves: [...new Set(mustHaves)].filter(Boolean), // Dedupe and filter empty
    wantToHave: [...new Set(wantToHave)].filter(Boolean),
    experience: [...new Set(experience)].filter(Boolean),
    targetCompanies,
  };
}

/**
 * Create a full UserExplorationState from interview data
 * This can be used to initialize the cosmos explorer
 */
export function createExplorationStateFromInterview(
  preferences: CandidatePreferences,
  resume?: ParsedResume | null,
  matchedCompanies?: Company[],
  userId?: string
): UserExplorationState {
  const cmf = candidatePreferencesToCMF(preferences, resume, userId);
  
  return {
    id: cmf.id,
    name: cmf.name,
    cmf,
    baseCompanies: matchedCompanies || [],
    addedCompanies: [],
    removedCompanyIds: [],
    watchlistCompanyIds: [],
    viewMode: 'explore',
  };
}

/**
 * Extract structured preferences from chat conversation
 * This parses the [READY_FOR_JOB_SEARCH] summary from the AI
 */
export function parseInterviewSummary(summary: string): Partial<CandidatePreferences> {
  const preferences: Partial<CandidatePreferences> = {
    mustHaves: { other: [] },
    niceToHaves: { other: [] },
    keyExperiences: [],
    cultureValues: [],
    teamDynamics: [],
    preferredLocations: [],
    companyStagePreference: [],
    workTypePreferences: [],
    industries: [],
    targetRoles: [],
  };

  // Parse structured format first (new format)
  // **Target Role**: Principal Product Security
  const targetRoleMatch = summary.match(/\*\*Target Role\*\*[:\s]+([^\n*]+)/i);
  if (targetRoleMatch) {
    const roleText = targetRoleMatch[1].trim();
    // Split into level and function (e.g., "Principal Product Security")
    const levelMatch = roleText.match(/^(Senior|Principal|Staff|Lead|Director|VP|Manager)/i);
    if (levelMatch) {
      preferences.targetRoleLevel = levelMatch[1];
      preferences.targetFunction = roleText.replace(levelMatch[1], '').trim();
    } else {
      preferences.targetRoleLevel = roleText;
    }
  } else {
    // Fallback to old format
    const roleMatch = summary.match(/(?:target|seeking|looking for)[:\s]+([^\n.]+)/i);
    if (roleMatch) {
      const roleParts = roleMatch[1].split(/\s+(?:in|at|for)\s+/i);
      preferences.targetRoleLevel = roleParts[0]?.trim();
      if (roleParts[1]) {
        preferences.targetFunction = roleParts[1].trim();
      }
    }
  }

  // Parse location (new format)
  const locationStructured = summary.match(/\*\*Location\*\*[:\s]+([^\n*]+)/i);
  if (locationStructured) {
    const cities = locationStructured[1].match(/(?:San Diego|Los Angeles|San Francisco|New York|Seattle|Austin|Denver|Chicago|Boston|Remote|Flexible)/gi);
    if (cities) {
      preferences.preferredLocations = cities;
    }
  }

  // Parse remote preference (new format)
  const remoteStructured = summary.match(/\*\*Remote\*\*[:\s]+([^\n*]+)/i);
  if (remoteStructured) {
    const remoteText = remoteStructured[1].toLowerCase();
    if (remoteText.includes('remote')) {
      preferences.remotePreference = 'remote';
    } else if (remoteText.includes('hybrid')) {
      preferences.remotePreference = 'hybrid';
    } else if (remoteText.includes('onsite') || remoteText.includes('office')) {
      preferences.remotePreference = 'onsite';
    } else {
      preferences.remotePreference = 'flexible';
    }
  } else {
    // Fallback to old format
    const locationMatch = summary.match(/(?:location|remote|hybrid|onsite)[:\s]+([^\n]+)/i);
    if (locationMatch) {
      const locText = locationMatch[1].toLowerCase();
      if (locText.includes('remote')) {
        preferences.remotePreference = 'remote';
      } else if (locText.includes('hybrid')) {
        preferences.remotePreference = 'hybrid';
      } else if (locText.includes('onsite') || locText.includes('office')) {
        preferences.remotePreference = 'onsite';
      }
      const cities = locationMatch[1].match(/(?:San Diego|Los Angeles|San Francisco|New York|Seattle|Austin|Denver|Chicago|Boston|Remote)/gi);
      if (cities) {
        preferences.preferredLocations = cities;
      }
    }
  }

  // Parse compensation (new format)
  const compStructured = summary.match(/\*\*Compensation\*\*[:\s]+([^\n*]+)/i);
  if (compStructured) {
    preferences.targetCompensation = compStructured[1].trim();
  } else {
    const compMatch = summary.match(/(?:compensation|salary|target)[:\s]*\$?([\d,k\-\s]+)/i);
    if (compMatch) {
      preferences.targetCompensation = compMatch[1].trim();
    }
  }

  // Parse company stage (new format)
  const stageStructured = summary.match(/\*\*Company Stage\*\*[:\s]+([^\n*]+)/i);
  const stageText = stageStructured ? stageStructured[1].toLowerCase() : '';
  
  if (stageText || summary.toLowerCase().includes('company stage')) {
    const textToCheck = stageText || summary.toLowerCase();
    if (textToCheck.includes('startup') || textToCheck.includes('early')) {
      preferences.companyStagePreference?.push('startup');
    }
    if (textToCheck.includes('late') || textToCheck.includes('growth')) {
      preferences.companyStagePreference?.push('late-stage');
    }
    if (textToCheck.includes('public') || textToCheck.includes('enterprise')) {
      preferences.companyStagePreference?.push('public');
    }
    if (textToCheck.includes('any') || textToCheck.includes('all') || textToCheck.includes('open')) {
      preferences.companyStagePreference = ['startup', 'late-stage', 'public'];
    }
  }

  // Parse must-haves section (handles both bullet and structured format)
  const mustHavesMatch = summary.match(/\*\*Must-Haves?\*\*[^:]*[:\s]*\n?([\s\S]*?)(?=\*\*Nice|$)/i) ||
                         summary.match(/must.?have[s]?[:\s]+([^]*?)(?=nice|want|key|$)/i);
  if (mustHavesMatch) {
    const items = mustHavesMatch[1]
      .split(/\n/)
      .map(s => s.replace(/^[-•*]\s*/, '').trim())
      .filter(s => s.length > 2 && !s.startsWith('**') && !s.match(/^\(aim|^\d+\)/i));
    preferences.mustHaves!.other = items.slice(0, 8); // Capture up to 8 must-haves
  }

  // Parse nice-to-haves section
  const niceToHaveMatch = summary.match(/\*\*Nice-to-Haves?\*\*[:\s]*\n?([\s\S]*?)(?=\*\*Key|$)/i) ||
                          summary.match(/(?:nice.?to.?have|want.?to.?have)[s]?[:\s]+([^]*?)(?=must|key|$)/i);
  if (niceToHaveMatch) {
    const items = niceToHaveMatch[1]
      .split(/\n/)
      .map(s => s.replace(/^[-•*]\s*/, '').trim())
      .filter(s => s.length > 2 && !s.startsWith('**'));
    preferences.niceToHaves!.other = items.slice(0, 5);

    // Check for specific nice-to-haves
    const text = niceToHaveMatch[1].toLowerCase();
    if (text.includes('product') && text.includes('strategy')) {
      preferences.niceToHaves!.productStrategy = true;
    }
    if (text.includes('cross-functional') || text.includes('collaboration')) {
      preferences.niceToHaves!.crossFunctionalCollab = true;
    }
    if (text.includes('team') && text.includes('build')) {
      preferences.niceToHaves!.teamBuilding = true;
    }
    if (text.includes('customer')) {
      preferences.niceToHaves!.customerFocus = true;
    }
    if (text.includes('innovation') || text.includes('technical')) {
      preferences.niceToHaves!.technicalInnovation = true;
    }
  }

  // Parse key experience
  const keyExpMatch = summary.match(/\*\*Key Experience\*\*[:\s]+([^\n*]+)/i);
  if (keyExpMatch) {
    preferences.keyExperiences = [keyExpMatch[1].trim()];
  }

  return preferences;
}

/**
 * Storage key for interview-generated CMF
 */
export const INTERVIEW_CMF_STORAGE_KEY = 'company-fit-explorer-interview-cmf';

/**
 * Save interview CMF to localStorage for cosmos to pick up
 */
export function saveInterviewCMFToStorage(state: UserExplorationState): void {
  try {
    localStorage.setItem(INTERVIEW_CMF_STORAGE_KEY, JSON.stringify(state));
    // Also save to main storage key so cosmos picks it up
    localStorage.setItem('company-fit-explorer-state', JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save interview CMF:', error);
  }
}

/**
 * Load interview CMF from localStorage
 */
export function loadInterviewCMFFromStorage(): UserExplorationState | null {
  try {
    const stored = localStorage.getItem(INTERVIEW_CMF_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to load interview CMF:', error);
    return null;
  }
}

