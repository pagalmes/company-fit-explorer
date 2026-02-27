import { describe, it, expect } from 'vitest'
import {
  Contact,
  ContactRecord,
  contactFromRecord,
  contactToRecord,
  deriveCompanyHealth,
} from '../contacts'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeRecord(overrides: Partial<ContactRecord> = {}): ContactRecord {
  return {
    id: 'rec-1',
    user_id: 'user-abc',
    company_id: 42,
    name: 'Jane Smith',
    role: 'Engineering Manager',
    linkedin_url: 'https://linkedin.com/in/janesmith',
    source: 'alumni',
    stage: 'identified',
    type: 'unknown',
    is_active: true,
    emailed_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 'rec-1',
    userId: 'user-abc',
    companyId: 42,
    name: 'Jane Smith',
    role: 'Engineering Manager',
    linkedinUrl: 'https://linkedin.com/in/janesmith',
    source: 'alumni',
    stage: 'identified',
    type: 'unknown',
    isActive: true,
    emailedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// ─── contactFromRecord ────────────────────────────────────────────────────────

describe('contactFromRecord', () => {
  it('maps all snake_case fields to camelCase correctly', () => {
    const record = makeRecord()
    const contact = contactFromRecord(record)

    expect(contact.id).toBe(record.id)
    expect(contact.userId).toBe(record.user_id)
    expect(contact.companyId).toBe(record.company_id)
    expect(contact.name).toBe(record.name)
    expect(contact.role).toBe(record.role)
    expect(contact.linkedinUrl).toBe(record.linkedin_url)
    expect(contact.source).toBe(record.source)
    expect(contact.stage).toBe(record.stage)
    expect(contact.type).toBe(record.type)
    expect(contact.isActive).toBe(record.is_active)
    expect(contact.emailedAt).toBe(record.emailed_at)
    expect(contact.createdAt).toBe(record.created_at)
    expect(contact.updatedAt).toBe(record.updated_at)
  })

  it('preserves null optional fields', () => {
    const record = makeRecord({ role: null, linkedin_url: null, emailed_at: null })
    const contact = contactFromRecord(record)

    expect(contact.role).toBeNull()
    expect(contact.linkedinUrl).toBeNull()
    expect(contact.emailedAt).toBeNull()
  })

  it('preserves non-null optional fields', () => {
    const record = makeRecord({
      role: 'VP of Engineering',
      linkedin_url: 'https://linkedin.com/in/someone',
      emailed_at: '2026-02-01T09:00:00Z',
    })
    const contact = contactFromRecord(record)

    expect(contact.role).toBe('VP of Engineering')
    expect(contact.linkedinUrl).toBe('https://linkedin.com/in/someone')
    expect(contact.emailedAt).toBe('2026-02-01T09:00:00Z')
  })
})

// ─── contactToRecord ────────────────────────────────────────────────────────

describe('contactToRecord', () => {
  it('maps all camelCase fields to snake_case correctly', () => {
    const contact = makeContact()
    const record = contactToRecord(contact)

    expect(record.id).toBe(contact.id)
    expect(record.user_id).toBe(contact.userId)
    expect(record.company_id).toBe(contact.companyId)
    expect(record.name).toBe(contact.name)
    expect(record.role).toBe(contact.role)
    expect(record.linkedin_url).toBe(contact.linkedinUrl)
    expect(record.source).toBe(contact.source)
    expect(record.stage).toBe(contact.stage)
    expect(record.type).toBe(contact.type)
    expect(record.is_active).toBe(contact.isActive)
    expect(record.emailed_at).toBe(contact.emailedAt)
    expect(record.created_at).toBe(contact.createdAt)
    expect(record.updated_at).toBe(contact.updatedAt)
  })

  it('preserves null optional fields', () => {
    const contact = makeContact({ role: null, linkedinUrl: null, emailedAt: null })
    const record = contactToRecord(contact)

    expect(record.role).toBeNull()
    expect(record.linkedin_url).toBeNull()
    expect(record.emailed_at).toBeNull()
  })
})

// ─── round-trip ──────────────────────────────────────────────────────────────

describe('contactFromRecord / contactToRecord round-trip', () => {
  it('record → contact → record produces identical output', () => {
    const original = makeRecord()
    expect(contactToRecord(contactFromRecord(original))).toEqual(original)
  })

  it('contact → record → contact produces identical output', () => {
    const original = makeContact()
    expect(contactFromRecord(contactToRecord(original))).toEqual(original)
  })
})

// ─── deriveCompanyHealth ──────────────────────────────────────────────────────

describe('deriveCompanyHealth', () => {
  it('returns "none" when there are no contacts', () => {
    expect(deriveCompanyHealth([])).toBe('none')
  })

  it('returns "booster" when any contact is typed as booster', () => {
    const contacts = [
      makeContact({ type: 'booster', isActive: true }),
      makeContact({ id: 'rec-2', type: 'curmudgeon', isActive: false }),
    ]
    expect(deriveCompanyHealth(contacts)).toBe('booster')
  })

  it('booster takes priority over informational_scheduled stage', () => {
    const contacts = [
      makeContact({ type: 'booster', stage: 'emailed' }),
      makeContact({ id: 'rec-2', type: 'unknown', stage: 'informational_scheduled' }),
    ]
    expect(deriveCompanyHealth(contacts)).toBe('booster')
  })

  it('returns "informational" when any contact has informational_scheduled stage and no booster', () => {
    const contacts = [
      makeContact({ type: 'unknown', stage: 'informational_scheduled', isActive: true }),
    ]
    expect(deriveCompanyHealth(contacts)).toBe('informational')
  })

  it('returns "in_progress" when there is an active contact and no booster or informational', () => {
    const contacts = [
      makeContact({ type: 'unknown', stage: 'emailed', isActive: true }),
    ]
    expect(deriveCompanyHealth(contacts)).toBe('in_progress')
  })

  it('returns "stalled" when no contact is active', () => {
    const contacts = [
      makeContact({ isActive: false, stage: 'identified' }),
      makeContact({ id: 'rec-2', isActive: false, stage: 'emailed' }),
    ]
    expect(deriveCompanyHealth(contacts)).toBe('stalled')
  })

  it('returns "stalled" when all contacts are curmudgeons', () => {
    const contacts = [
      makeContact({ type: 'curmudgeon', isActive: true }),
      makeContact({ id: 'rec-2', type: 'curmudgeon', isActive: false }),
    ]
    expect(deriveCompanyHealth(contacts)).toBe('stalled')
  })

  it('returns "stalled" when active contact is a curmudgeon but another is not', () => {
    // All contacts must be curmudgeons for "stalled" — if even one is not, it's in_progress
    const contacts = [
      makeContact({ type: 'curmudgeon', isActive: true }),
      makeContact({ id: 'rec-2', type: 'obligate', isActive: false }),
    ]
    // allCurmudgeons is false, hasActive is true → in_progress
    expect(deriveCompanyHealth(contacts)).toBe('in_progress')
  })

  it('returns "in_progress" with a mix of obligates and unknowns when active', () => {
    const contacts = [
      makeContact({ type: 'obligate', isActive: true }),
      makeContact({ id: 'rec-2', type: 'unknown', isActive: false }),
    ]
    expect(deriveCompanyHealth(contacts)).toBe('in_progress')
  })

  it('single identified contact with no active flag returns stalled', () => {
    expect(deriveCompanyHealth([makeContact({ isActive: false, stage: 'identified' })])).toBe('stalled')
  })

  it('single active identified contact returns in_progress', () => {
    expect(deriveCompanyHealth([makeContact({ isActive: true, stage: 'identified' })])).toBe('in_progress')
  })
})
