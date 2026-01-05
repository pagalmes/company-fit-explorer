/**
 * Interview system types
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface ParsedResume {
  name: string;
  email?: string;
  phone?: string;
  skills: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  summary?: string;
  rawText: string;
}

export interface ExperienceEntry {
  title: string;
  company: string;
  duration?: string;
  description?: string;
}

export interface EducationEntry {
  degree: string;
  institution: string;
  year?: string;
}

export interface InterviewState {
  stage: 'upload' | 'parsing' | 'chatting' | 'matching' | 'results';
  resume: ParsedResume | null;
  messages: ChatMessage[];
  extractedPreferences: CandidatePreferences | null;
  matchedJobs: MatchedJob[];
  isLoading: boolean;
  error: string | null;
}

export interface CandidatePreferences {
  // Career Goals
  targetRoleLevel: string; // Senior, Principal, Staff, Lead
  targetFunction: string; // Product Security, Engineering, PM, etc.
  workTypePreferences: string[]; // hands-on, leadership, R&D, strategy
  companyStagePreference: string[]; // startup, late-stage, public
  targetCompensation?: string;
  keyExperiences: string[];
  
  // Location & Schedule
  preferredLocations: string[];
  remotePreference: 'remote' | 'hybrid' | 'onsite' | 'flexible';
  scheduleFlexibility?: string;
  
  // Culture
  cultureValues: string[];
  teamDynamics: string[];
  
  // Must-Haves
  mustHaves: {
    velocityOfExecution?: string;
    growthEnvironment?: string;
    peopleCulture?: string;
    locationSchedule?: string;
    other: string[];
  };
  
  // Nice-to-Haves
  niceToHaves: {
    productStrategy?: boolean;
    crossFunctionalCollab?: boolean;
    teamBuilding?: boolean;
    customerFocus?: boolean;
    productExcellence?: boolean;
    accountability?: boolean;
    developerSuccess?: boolean;
    technicalInnovation?: boolean;
    other: string[];
  };
  
  // Legacy fields for backward compatibility
  industries: string[];
  targetRoles: string[];
}

export interface MatchedJob {
  job_id: number;
  company_name: string;
  title: string;
  description: string;
  requirements?: string;
  location: string;
  application_url?: string;
  posted_date?: string;
  scraped_at: string;
  is_active: boolean;
  matchScore?: number;
  matchReasons?: string[];
}

export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    num_predict?: number;
    num_ctx?: number;
  };
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  voiceEnabled: boolean;
  transcript: string;
}

