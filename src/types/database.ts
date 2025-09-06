// Database entity types for our CMF Explorer
import { UserCMF, Company } from './index';

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  role: 'admin' | 'user'
  created_at: string
  updated_at: string
}

export interface UserCompanyData {
  id: string
  user_id: string
  user_profile: UserCMF
  companies: Company[]
  created_at: string
  updated_at: string
}

export interface UserPreferences {
  id: string
  user_id: string
  watchlist_company_ids: number[]
  removed_company_ids: number[]
  view_mode: 'explore' | 'watchlist'
  created_at: string
  updated_at: string
}

export interface UserInvitation {
  id: string
  email: string
  full_name?: string
  invited_by: string
  invite_token: string
  expires_at: string
  used: boolean
  created_at: string
}

// Re-export existing types from the main types file
export type { Company, UserCMF } from './index'