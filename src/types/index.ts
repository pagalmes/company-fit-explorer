export interface UserCMF {
  id: string;
  name: string;
  mustHaves: string[];
  wantToHave: string[];
  experience: string[];
  targetRole: string;
  targetCompanies: string;
}

export interface Company {
  id: number;
  name: string;
  logo: string;
  careerUrl: string;
  matchScore: number;
  industry: string;
  stage: string;
  location: string;
  employees: string;
  remote: string;
  openRoles: number;
  connections: number[];
  connectionTypes: Record<number, string>;
  matchReasons: string[];
  color: string;
  angle?: number;
  distance?: number;
  externalLinks?: {
    website?: string;
    linkedin?: string;
    glassdoor?: string;
    crunchbase?: string;
  };
}

export interface GraphData {
  nodes: Array<{
    data: {
      id: string;
      label: string;
      type: 'cmf' | 'company' | 'company-label' | 'company-name-label' | 'company-percent-label' | 'zone-excellent' | 'zone-good' | 'zone-fair';
      company?: Company;
      cmf?: UserCMF;
    };
    position?: { x: number; y: number };
  }>;
  edges: Array<{
    data: {
      id: string;
      source: string;
      target: string;
      relationship: string;
    };
  }>;
}

export interface UserExplorationState {
  id: string;
  name: string;
  cmf: UserCMF;
  baseCompanies: Company[];           // Original dataset
  addedCompanies: Company[];          // Manually added companies  
  removedCompanyIds: number[];        // IDs of removed companies
  watchlistCompanyIds: number[];      // IDs of watchlisted companies
  lastSelectedCompanyId?: number;     // Last selected company
  viewMode: 'explore' | 'watchlist';  // Current view mode
}

// CMF Component Props
export interface CMFGraphExplorerProps {
  userCMF: UserCMF;
  companies: Company[];
}

export interface CompanyGraphProps {
  cmf: UserCMF;
  companies: Company[];
  selectedCompany: Company | null;
  hoveredCompany: Company | null;
  onCompanySelect: (company: Company | null) => void;
  onCompanyHover: (company: Company | null) => void;
  onCMFToggle?: () => void;
  watchlistCompanyIds?: Set<number>;
  viewMode?: import('./watchlist').ViewMode;
  hideCenter?: boolean; // Hide center node when modals are open
}

export interface CompanyDetailPanelProps {
  selectedCompany: Company | null;
  allCompanies: Company[];
  onCompanySelect: (company: Company) => void;
  isInWatchlist?: (companyId: number) => boolean;
  onToggleWatchlist?: (companyId: number) => void;
  viewMode?: import('./watchlist').ViewMode;
  watchlistStats?: import('./watchlist').WatchlistStats;
}

// Export watchlist types
export * from './watchlist';

// Export LLM types
export * from '../utils/llm/types';