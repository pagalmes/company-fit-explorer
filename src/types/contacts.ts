/**
 * Types for the Contact Management & 3B7 Outreach Tracking epic.
 * Based on the LAMP methodology from "The 2-Hour Job Search" by Steve Dalton.
 */

/**
 * Where the user is in the outreach process with a contact.
 * Linear progression — each step unlocks the next.
 */
export type ContactStage =
  | 'identified'        // Found the person, not yet emailed
  | 'emailed'           // First email sent (starts the 3B7 clock)
  | 'day3_check'        // Day 3: no reply yet, try a second contact at same company
  | 'day7_followup'     // Day 7: follow up with original contact
  | 'informational_scheduled' // They agreed to an informational interview
  | 'completed'         // Informational done

/**
 * What the user has learned about a contact over time.
 * Independent from stage — classification can change as the relationship develops.
 */
export type ContactType =
  | 'unknown'           // Default — not yet classified
  | 'booster'           // Genuinely wants to help (~10-20% of contacts)
  | 'obligate'          // Slow, unreliable responder
  | 'curmudgeon'        // Never responds

/**
 * How the user knows this contact (maps to LAMP prioritization order).
 */
export type ContactSource =
  | 'alumni'            // Shared alma mater — highest priority
  | 'first_degree'      // Direct LinkedIn connection
  | 'second_degree'     // Mutual connection
  | 'group'             // Shared LinkedIn group
  | 'cold'              // Cold/fan mail — lowest priority

/**
 * Company-level health derived from the contacts at that company.
 * Visible as a color badge on the graph node.
 *
 * Green  — Booster found
 * Cyan   — Informational interview scheduled
 * Purple — Outreach in progress (no Booster yet)
 * Gray   — Contacts identified but no active outreach, or all Curmudgeons
 * None   — No contacts added
 */
export type CompanyContactHealth = 'booster' | 'informational' | 'in_progress' | 'stalled' | 'none'

/**
 * A single contact at a company.
 */
export interface Contact {
  id: string
  userId: string
  companyId: number
  name: string
  role: string | null
  linkedinUrl: string | null
  source: ContactSource
  stage: ContactStage
  type: ContactType
  isActive: boolean       // Only one contact per company should be active at a time
  emailedAt: string | null  // ISO timestamp — set when stage moves to 'emailed'
  createdAt: string
  updatedAt: string
}

/**
 * Fields required to create a new contact.
 */
export type CreateContactInput = Pick<Contact, 'companyId' | 'name' | 'source'> & {
  role?: string
  linkedinUrl?: string
}

/**
 * Fields that can be updated on an existing contact.
 */
export type UpdateContactInput = Partial<
  Pick<Contact, 'name' | 'role' | 'linkedinUrl' | 'source' | 'stage' | 'type' | 'isActive' | 'emailedAt'>
>

/**
 * localStorage / serialization shape (snake_case to match DB row).
 */
export interface ContactRecord {
  id: string
  user_id: string
  company_id: number
  name: string
  role: string | null
  linkedin_url: string | null
  source: ContactSource
  stage: ContactStage
  type: ContactType
  is_active: boolean
  emailed_at: string | null
  created_at: string
  updated_at: string
}

/** Maps a DB/storage record to the camelCase Contact interface. */
export function contactFromRecord(r: ContactRecord): Contact {
  return {
    id: r.id,
    userId: r.user_id,
    companyId: r.company_id,
    name: r.name,
    role: r.role,
    linkedinUrl: r.linkedin_url,
    source: r.source,
    stage: r.stage,
    type: r.type,
    isActive: r.is_active,
    emailedAt: r.emailed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/** Maps a camelCase Contact back to a DB/storage record. */
export function contactToRecord(c: Contact): ContactRecord {
  return {
    id: c.id,
    user_id: c.userId,
    company_id: c.companyId,
    name: c.name,
    role: c.role,
    linkedin_url: c.linkedinUrl,
    source: c.source,
    stage: c.stage,
    type: c.type,
    is_active: c.isActive,
    emailed_at: c.emailedAt,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  }
}

/**
 * Derives company-level health from its contacts.
 */
export function deriveCompanyHealth(contacts: Contact[]): CompanyContactHealth {
  if (contacts.length === 0) return 'none'

  const hasBooster = contacts.some(c => c.type === 'booster')
  if (hasBooster) return 'booster'

  const hasInformational = contacts.some(c => c.stage === 'informational_scheduled')
  if (hasInformational) return 'informational'

  const allCurmudgeons = contacts.every(c => c.type === 'curmudgeon')
  const hasActive = contacts.some(c => c.isActive)

  if (!hasActive || allCurmudgeons) return 'stalled'

  return 'in_progress'
}
