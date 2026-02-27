/**
 * Hook for Contact Management & 3B7 Outreach Tracking (Epic #148).
 * Follows the same three-layer persistence pattern as useWatchlist:
 *   local state → localStorage → Supabase
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClientComponentClient } from '../lib/supabase'
import {
  Contact,
  ContactRecord,
  ContactSource,
  ContactStage,
  ContactType,
  CompanyContactHealth,
  CreateContactInput,
  UpdateContactInput,
  contactFromRecord,
  deriveCompanyHealth,
} from '../types/contacts'

const STORAGE_KEY = 'cosmos-contacts'

// ─── localStorage helpers ────────────────────────────────────────────────────

function loadFromStorage(): ContactRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ContactRecord[]) : []
  } catch {
    return []
  }
}

function saveToStorage(records: ContactRecord[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    console.warn('useContacts: failed to persist to localStorage')
  }
}

// ─── Hook interface ──────────────────────────────────────────────────────────

interface UseContactsOptions {
  userId?: string
}

interface UseContactsReturn {
  contacts: Contact[]
  isLoading: boolean
  error: string | null
  // Queries
  getContactsForCompany: (companyId: number) => Contact[]
  getActiveContact: (companyId: number) => Contact | undefined
  getCompanyHealth: (companyId: number) => CompanyContactHealth
  // Mutations
  addContact: (input: CreateContactInput) => Promise<Contact>
  updateContact: (id: string, updates: UpdateContactInput) => Promise<void>
  removeContact: (id: string) => Promise<void>
  setActiveContact: (id: string, companyId: number) => Promise<void>
  advanceStage: (id: string) => Promise<void>
}

// Ordered stages for advanceStage
const STAGE_ORDER: ContactStage[] = [
  'identified',
  'emailed',
  'day3_check',
  'day7_followup',
  'informational_scheduled',
  'completed',
]

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useContacts({ userId }: UseContactsOptions): UseContactsReturn {
  const [records, setRecords] = useState<ContactRecord[]>([])
  // Keep a ref in sync so mutations always read the latest records without
  // stale closure issues when multiple calls happen before React re-renders.
  const recordsRef = useRef<ContactRecord[]>(records)
  recordsRef.current = records
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Load: localStorage first, then sync from Supabase ──────────────────────
  useEffect(() => {
    const cached = loadFromStorage()
    if (cached.length > 0) {
      setRecords(cached)
      setIsLoading(false)
    }

    if (!userId) {
      setIsLoading(false)
      return
    }

    const supabase = createClientComponentClient()
    if (!supabase) {
      setIsLoading(false)
      return
    }

    supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .then(({ data, error: dbError }) => {
        if (dbError) {
          console.warn('useContacts: Supabase fetch failed, using cache', dbError.message)
          setIsLoading(false)
          return
        }
        const fresh = (data ?? []) as ContactRecord[]
        setRecords(fresh)
        saveToStorage(fresh)
        setIsLoading(false)
      })
  }, [userId])

  // ── Internal helpers ────────────────────────────────────────────────────────

  const persist = useCallback(
    async (next: ContactRecord[]) => {
      recordsRef.current = next
      setRecords(next)
      saveToStorage(next)

      if (!userId) return

      const supabase = createClientComponentClient()
      if (!supabase) return

      // Upsert the full set for this user — simple and correct for this data size
      const { error: dbError } = await supabase
        .from('contacts')
        .upsert(next.filter(r => r.user_id === userId), { onConflict: 'id' })

      if (dbError) {
        console.warn('useContacts: Supabase upsert failed', dbError.message)
        setError('Failed to save contacts to database')
      } else {
        setError(null)
      }
    },
    [userId]
  )

  // ── Queries ─────────────────────────────────────────────────────────────────

  const contacts = useMemo<Contact[]>(() => records.map(contactFromRecord), [records])

  const getContactsForCompany = useCallback(
    (companyId: number) => contacts.filter(c => c.companyId === companyId),
    [contacts]
  )

  const getActiveContact = useCallback(
    (companyId: number) =>
      contacts.find(c => c.companyId === companyId && c.isActive),
    [contacts]
  )

  const getCompanyHealth = useCallback(
    (companyId: number): CompanyContactHealth =>
      deriveCompanyHealth(getContactsForCompany(companyId)),
    [getContactsForCompany]
  )

  // ── Mutations ───────────────────────────────────────────────────────────────

  const addContact = useCallback(
    async (input: CreateContactInput): Promise<Contact> => {
      const current = recordsRef.current
      const now = new Date().toISOString()
      const hasExistingActive = current.some(
        r => r.company_id === input.companyId && r.is_active
      )

      const newRecord: ContactRecord = {
        id: crypto.randomUUID(),
        user_id: userId ?? 'local',
        company_id: input.companyId,
        name: input.name,
        role: input.role ?? null,
        linkedin_url: input.linkedinUrl ?? null,
        source: input.source,
        stage: 'identified',
        type: 'unknown',
        is_active: !hasExistingActive, // first contact becomes active automatically
        emailed_at: null,
        created_at: now,
        updated_at: now,
      }

      await persist([...current, newRecord])
      return contactFromRecord(newRecord)
    },
    [userId, persist]
  )

  const updateContact = useCallback(
    async (id: string, updates: UpdateContactInput): Promise<void> => {
      const now = new Date().toISOString()
      const next = recordsRef.current.map(r => {
        if (r.id !== id) return r
        return {
          ...r,
          ...(updates.name !== undefined && { name: updates.name }),
          ...(updates.role !== undefined && { role: updates.role ?? null }),
          ...(updates.linkedinUrl !== undefined && { linkedin_url: updates.linkedinUrl ?? null }),
          ...(updates.source !== undefined && { source: updates.source as ContactSource }),
          ...(updates.stage !== undefined && { stage: updates.stage as ContactStage }),
          ...(updates.type !== undefined && { type: updates.type as ContactType }),
          ...(updates.isActive !== undefined && { is_active: updates.isActive }),
          ...(updates.emailedAt !== undefined && { emailed_at: updates.emailedAt ?? null }),
          updated_at: now,
        }
      })
      await persist(next)
    },
    [persist]
  )

  const removeContact = useCallback(
    async (id: string): Promise<void> => {
      const current = recordsRef.current
      const removed = current.find(r => r.id === id)
      const next = current.filter(r => r.id !== id)

      // If the removed contact was active, promote the earliest remaining contact
      if (removed?.is_active) {
        const sibling = next.find(r => r.company_id === removed.company_id)
        if (sibling) {
          const idx = next.indexOf(sibling)
          next[idx] = { ...sibling, is_active: true, updated_at: new Date().toISOString() }
        }
      }

      await persist(next)

      // Hard delete from Supabase (upsert won't remove deleted rows)
      if (userId) {
        const supabase = createClientComponentClient()
        if (supabase) {
          await supabase.from('contacts').delete().eq('id', id).eq('user_id', userId)
        }
      }
    },
    [userId, persist]
  )

  const setActiveContact = useCallback(
    async (id: string, companyId: number): Promise<void> => {
      const now = new Date().toISOString()
      const next = recordsRef.current.map(r => {
        if (r.company_id !== companyId) return r
        return { ...r, is_active: r.id === id, updated_at: now }
      })
      await persist(next)
    },
    [persist]
  )

  const advanceStage = useCallback(
    async (id: string): Promise<void> => {
      const current = recordsRef.current
      const record = current.find(r => r.id === id)
      if (!record) return

      const currentIdx = STAGE_ORDER.indexOf(record.stage)
      if (currentIdx === -1 || currentIdx === STAGE_ORDER.length - 1) return

      const nextStage = STAGE_ORDER[currentIdx + 1]
      const now = new Date().toISOString()
      const emailedAt =
        nextStage === 'emailed' ? now : record.emailed_at

      const next = current.map(r =>
        r.id === id
          ? { ...r, stage: nextStage, emailed_at: emailedAt, updated_at: now }
          : r
      )
      await persist(next)
    },
    [persist]
  )

  return {
    contacts,
    isLoading,
    error,
    getContactsForCompany,
    getActiveContact,
    getCompanyHealth,
    addContact,
    updateContact,
    removeContact,
    setActiveContact,
    advanceStage,
  }
}
