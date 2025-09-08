import { Company, UserExplorationState } from '../types';

// Base company dataset - original data without user modifications
const baseCompanies: Company[] = [];

// User profiles with complete exploration state
const teeKProfile: UserExplorationState = {
  id: "template-user",
  name: "New User",
  cmf: {
  "id": "template-user",
  "name": "New User",
  "targetRole": "",
  "mustHaves": [],
  "wantToHave": [],
  "experience": [],
  "targetCompanies": ""
},
  baseCompanies: baseCompanies,
  addedCompanies: [],
  removedCompanyIds: [],
  watchlistCompanyIds: [],
  lastSelectedCompanyId: undefined,
  viewMode: 'watchlist'
};

// Export the current active user (manually switch by changing this line)
export const activeUserProfile = teeKProfile;

// Legacy exports for compatibility
export const sampleUserCMF = activeUserProfile.cmf;
export const sampleCompanies = activeUserProfile.baseCompanies;
