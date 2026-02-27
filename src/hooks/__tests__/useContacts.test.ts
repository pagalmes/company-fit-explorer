import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useContacts } from '../useContacts'

// ─── localStorage mock ────────────────────────────────────────────────────────

const store: Record<string, string> = {}

const mockLocalStorage = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value }),
  removeItem: vi.fn((key: string) => { delete store[key] }),
  clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]) }),
  key: vi.fn(),
  get length() { return Object.keys(store).length },
}

// ─── Supabase mock ────────────────────────────────────────────────────────────
// Fully chainable builder that is also thenable so every await resolves.

function makeBuilder(data: unknown[] = []) {
  const result = { data, error: null }
  // Use an object with explicit method definitions so mockReturnThis works
  const b = {
    select:  vi.fn().mockReturnThis(),
    eq:      vi.fn().mockReturnThis(),
    order:   vi.fn().mockReturnThis(),
    upsert:  vi.fn().mockReturnThis(),
    delete:  vi.fn().mockReturnThis(),
    // thenable — makes `await supabase.from(...).select(...).eq(...)` work
    then: (resolve: (v: { data: unknown[]; error: null }) => void) =>
      Promise.resolve().then(() => resolve(result)),
  }
  return b
}

vi.mock('../../lib/supabase', () => ({
  createClientComponentClient: () => ({
    from: vi.fn(() => makeBuilder()),
  }),
}))

// ─── crypto.randomUUID stub ───────────────────────────────────────────────────

let uuidCounter = 0
const nextUUID = () => `test-uuid-${++uuidCounter}`

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
    configurable: true,
  })
  mockLocalStorage.clear()
  vi.clearAllMocks()
  uuidCounter = 0

  // Stub crypto.randomUUID
  vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(
    nextUUID as () => `${string}-${string}-${string}-${string}-${string}`
  )
})

// ─── Initial state ────────────────────────────────────────────────────────────

describe('initial state', () => {
  it('starts with empty contacts when storage and DB are empty', async () => {
    const { result } = renderHook(() => useContacts({}))

    await act(async () => {})

    expect(result.current.contacts).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('hydrates contacts from localStorage before Supabase resolves', () => {
    const cached = JSON.stringify([{
      id: 'cached-1',
      user_id: 'u1',
      company_id: 10,
      name: 'Cached Person',
      role: null,
      linkedin_url: null,
      source: 'alumni',
      stage: 'identified',
      type: 'unknown',
      is_active: true,
      emailed_at: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }])
    store['cosmos-contacts'] = cached

    const { result } = renderHook(() => useContacts({ userId: 'u1' }))

    // Immediately after render — cache should be visible before async resolves
    expect(result.current.contacts).toHaveLength(1)
    expect(result.current.contacts[0].name).toBe('Cached Person')
  })
})

// ─── addContact ───────────────────────────────────────────────────────────────

describe('addContact', () => {
  it('adds a contact with default stage=identified and type=unknown', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    await act(async () => {
      await result.current.addContact({
        companyId: 1,
        name: 'Alice',
        source: 'alumni',
      })
    })

    expect(result.current.contacts).toHaveLength(1)
    const c = result.current.contacts[0]
    expect(c.name).toBe('Alice')
    expect(c.stage).toBe('identified')
    expect(c.type).toBe('unknown')
    expect(c.companyId).toBe(1)
    expect(c.source).toBe('alumni')
  })

  it('first contact at a company becomes active automatically', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    await act(async () => {
      await result.current.addContact({ companyId: 1, name: 'Alice', source: 'alumni' })
    })

    expect(result.current.contacts[0].isActive).toBe(true)
  })

  it('second contact at same company is NOT active automatically', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    await act(async () => {
      await result.current.addContact({ companyId: 1, name: 'Alice', source: 'alumni' })
    })
    await act(async () => {
      await result.current.addContact({ companyId: 1, name: 'Bob', source: 'first_degree' })
    })

    const companyContacts = result.current.contacts.filter(c => c.companyId === 1)
    expect(companyContacts).toHaveLength(2)
    const activeOnes = companyContacts.filter(c => c.isActive)
    expect(activeOnes).toHaveLength(1)
    expect(activeOnes[0].name).toBe('Alice')
  })

  it('first contact at a different company also becomes active independently', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    await act(async () => {
      await result.current.addContact({ companyId: 1, name: 'Alice', source: 'alumni' })
    })
    await act(async () => {
      await result.current.addContact({ companyId: 2, name: 'Bob', source: 'cold' })
    })

    const company1Active = result.current.contacts.find(c => c.companyId === 1 && c.isActive)
    const company2Active = result.current.contacts.find(c => c.companyId === 2 && c.isActive)
    expect(company1Active?.name).toBe('Alice')
    expect(company2Active?.name).toBe('Bob')
  })

  it('stores optional role and linkedinUrl when provided', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    await act(async () => {
      await result.current.addContact({
        companyId: 1,
        name: 'Alice',
        source: 'group',
        role: 'VP Engineering',
        linkedinUrl: 'https://linkedin.com/in/alice',
      })
    })

    expect(result.current.contacts[0].role).toBe('VP Engineering')
    expect(result.current.contacts[0].linkedinUrl).toBe('https://linkedin.com/in/alice')
  })

  it('returns the newly created Contact object', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    let created: Awaited<ReturnType<typeof result.current.addContact>> | undefined
    await act(async () => {
      created = await result.current.addContact({ companyId: 5, name: 'Charlie', source: 'second_degree' })
    })

    expect(created).toBeDefined()
    expect(created!.name).toBe('Charlie')
    expect(created!.id).toBeTruthy()
  })
})

// ─── updateContact ────────────────────────────────────────────────────────────

describe('updateContact', () => {
  it('updates the name of an existing contact', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    let id = ''
    await act(async () => {
      const c = await result.current.addContact({ companyId: 1, name: 'Alice', source: 'alumni' })
      id = c.id
    })
    await act(async () => {
      await result.current.updateContact(id, { name: 'Alice Updated' })
    })

    expect(result.current.contacts.find(c => c.id === id)?.name).toBe('Alice Updated')
  })

  it('updates the contact type', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    let id = ''
    await act(async () => {
      const c = await result.current.addContact({ companyId: 1, name: 'Alice', source: 'alumni' })
      id = c.id
    })
    await act(async () => {
      await result.current.updateContact(id, { type: 'booster' })
    })

    expect(result.current.contacts.find(c => c.id === id)?.type).toBe('booster')
  })

  it('does not affect other contacts', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    let id1 = '', id2 = ''
    await act(async () => {
      const c1 = await result.current.addContact({ companyId: 1, name: 'Alice', source: 'alumni' })
      id1 = c1.id
      const c2 = await result.current.addContact({ companyId: 1, name: 'Bob', source: 'cold' })
      id2 = c2.id
    })
    await act(async () => {
      await result.current.updateContact(id1, { name: 'Alice Updated' })
    })

    expect(result.current.contacts.find(c => c.id === id2)?.name).toBe('Bob')
  })
})

// ─── removeContact ────────────────────────────────────────────────────────────

describe('removeContact', () => {
  it('removes the contact from the list', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    let id = ''
    await act(async () => {
      const c = await result.current.addContact({ companyId: 1, name: 'Alice', source: 'alumni' })
      id = c.id
    })
    await act(async () => {
      await result.current.removeContact(id)
    })

    expect(result.current.contacts.find(c => c.id === id)).toBeUndefined()
  })

  it('promotes the next contact to active when the active contact is removed', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    let id1 = '', id2 = ''
    await act(async () => { const c = await result.current.addContact({ companyId: 1, name: 'Alice', source: 'alumni' }); id1 = c.id })
    await act(async () => { const c = await result.current.addContact({ companyId: 1, name: 'Bob', source: 'cold' }); id2 = c.id })

    // Alice is active, Bob is not
    expect(result.current.contacts.find(c => c.id === id1)?.isActive).toBe(true)
    expect(result.current.contacts.find(c => c.id === id2)?.isActive).toBe(false)

    await act(async () => {
      await result.current.removeContact(id1)
    })

    // Bob should now be active
    expect(result.current.contacts.find(c => c.id === id2)?.isActive).toBe(true)
  })

  it('does NOT promote when a non-active contact is removed', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    let id1 = '', id2 = ''
    await act(async () => { const c = await result.current.addContact({ companyId: 1, name: 'Alice', source: 'alumni' }); id1 = c.id })
    await act(async () => { const c = await result.current.addContact({ companyId: 1, name: 'Bob', source: 'cold' }); id2 = c.id })

    await act(async () => {
      await result.current.removeContact(id2) // Bob is non-active
    })

    // Alice stays active
    expect(result.current.contacts.find(c => c.id === id1)?.isActive).toBe(true)
  })

  it('does not affect contacts at other companies', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    let id1 = '', id2 = ''
    await act(async () => { const c = await result.current.addContact({ companyId: 1, name: 'Alice', source: 'alumni' }); id1 = c.id })
    await act(async () => { const c = await result.current.addContact({ companyId: 2, name: 'Bob', source: 'cold' }); id2 = c.id })
    await act(async () => { await result.current.removeContact(id1) })

    expect(result.current.contacts.find(c => c.id === id2)).toBeDefined()
  })
})

// ─── setActiveContact ─────────────────────────────────────────────────────────

describe('setActiveContact', () => {
  it('makes the target contact active', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    let id2 = ''
    await act(async () => { await result.current.addContact({ companyId: 1, name: 'Alice', source: 'alumni' }) })
    await act(async () => { const c = await result.current.addContact({ companyId: 1, name: 'Bob', source: 'cold' }); id2 = c.id })
    await act(async () => {
      await result.current.setActiveContact(id2, 1)
    })

    expect(result.current.contacts.find(c => c.id === id2)?.isActive).toBe(true)
  })

  it('deactivates the previously active sibling at the same company', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    let id1 = '', id2 = ''
    await act(async () => {
      const c1 = await result.current.addContact({ companyId: 1, name: 'Alice', source: 'alumni' })
      id1 = c1.id
      const c2 = await result.current.addContact({ companyId: 1, name: 'Bob', source: 'cold' })
      id2 = c2.id
    })
    await act(async () => {
      await result.current.setActiveContact(id2, 1)
    })

    expect(result.current.contacts.find(c => c.id === id1)?.isActive).toBe(false)
  })

  it('does not change active state of contacts at other companies', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    let id1 = '', id2 = '', id3 = ''
    await act(async () => {
      const c1 = await result.current.addContact({ companyId: 1, name: 'Alice', source: 'alumni' })
      id1 = c1.id
      const c2 = await result.current.addContact({ companyId: 1, name: 'Bob', source: 'cold' })
      id2 = c2.id
      const c3 = await result.current.addContact({ companyId: 2, name: 'Carol', source: 'group' })
      id3 = c3.id
    })
    await act(async () => {
      await result.current.setActiveContact(id2, 1)
    })

    // Carol at company 2 should remain active
    expect(result.current.contacts.find(c => c.id === id3)?.isActive).toBe(true)
  })
})

// ─── advanceStage ─────────────────────────────────────────────────────────────

describe('advanceStage', () => {
  it('advances stage from identified to emailed', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    let id = ''
    await act(async () => {
      const c = await result.current.addContact({ companyId: 1, name: 'Alice', source: 'alumni' })
      id = c.id
    })
    await act(async () => {
      await result.current.advanceStage(id)
    })

    expect(result.current.contacts.find(c => c.id === id)?.stage).toBe('emailed')
  })

  it('sets emailedAt when advancing to emailed', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    let id = ''
    await act(async () => {
      const c = await result.current.addContact({ companyId: 1, name: 'Alice', source: 'alumni' })
      id = c.id
    })
    await act(async () => {
      await result.current.advanceStage(id)
    })

    expect(result.current.contacts.find(c => c.id === id)?.emailedAt).not.toBeNull()
  })

  it('does NOT overwrite emailedAt on subsequent advances', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    let id = ''
    await act(async () => {
      const c = await result.current.addContact({ companyId: 1, name: 'Alice', source: 'alumni' })
      id = c.id
    })
    // Advance to emailed
    await act(async () => { await result.current.advanceStage(id) })
    const emailedAt = result.current.contacts.find(c => c.id === id)?.emailedAt

    // Advance to day3_check
    await act(async () => { await result.current.advanceStage(id) })

    expect(result.current.contacts.find(c => c.id === id)?.emailedAt).toBe(emailedAt)
  })

  it('advances through the full stage sequence', async () => {
    const stages = ['identified', 'emailed', 'day3_check', 'day7_followup', 'informational_scheduled', 'completed']
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    let id = ''
    await act(async () => {
      const c = await result.current.addContact({ companyId: 1, name: 'Alice', source: 'alumni' })
      id = c.id
    })

    for (let i = 1; i < stages.length; i++) {
      await act(async () => { await result.current.advanceStage(id) })
      expect(result.current.contacts.find(c => c.id === id)?.stage).toBe(stages[i])
    }
  })

  it('does nothing when contact is already at completed stage', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    let id = ''
    await act(async () => {
      const c = await result.current.addContact({ companyId: 1, name: 'Alice', source: 'alumni' })
      id = c.id
    })

    // Advance all the way to completed (5 advances)
    for (let i = 0; i < 5; i++) {
      await act(async () => { await result.current.advanceStage(id) })
    }
    expect(result.current.contacts.find(c => c.id === id)?.stage).toBe('completed')

    // One more advance — should stay at completed
    await act(async () => { await result.current.advanceStage(id) })
    expect(result.current.contacts.find(c => c.id === id)?.stage).toBe('completed')
  })

  it('does nothing when contact id does not exist', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    await act(async () => {
      await result.current.advanceStage('nonexistent-id')
    })

    expect(result.current.contacts).toHaveLength(0)
  })
})

// ─── getContactsForCompany ────────────────────────────────────────────────────

describe('getContactsForCompany', () => {
  it('returns only contacts for the given company', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    await act(async () => {
      await result.current.addContact({ companyId: 1, name: 'Alice', source: 'alumni' })
      await result.current.addContact({ companyId: 2, name: 'Bob', source: 'cold' })
    })

    const company1 = result.current.getContactsForCompany(1)
    expect(company1).toHaveLength(1)
    expect(company1[0].name).toBe('Alice')
  })

  it('returns empty array when company has no contacts', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    expect(result.current.getContactsForCompany(99)).toEqual([])
  })
})

// ─── getActiveContact ─────────────────────────────────────────────────────────

describe('getActiveContact', () => {
  it('returns the active contact for a company', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    await act(async () => {
      await result.current.addContact({ companyId: 1, name: 'Alice', source: 'alumni' })
      await result.current.addContact({ companyId: 1, name: 'Bob', source: 'cold' })
    })

    expect(result.current.getActiveContact(1)?.name).toBe('Alice')
  })

  it('returns undefined when company has no contacts', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    expect(result.current.getActiveContact(99)).toBeUndefined()
  })
})

// ─── getCompanyHealth ─────────────────────────────────────────────────────────

describe('getCompanyHealth', () => {
  it('returns "none" for a company with no contacts', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    expect(result.current.getCompanyHealth(1)).toBe('none')
  })

  it('returns "in_progress" for a company with an active unknown contact', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    await act(async () => {
      await result.current.addContact({ companyId: 1, name: 'Alice', source: 'alumni' })
    })

    expect(result.current.getCompanyHealth(1)).toBe('in_progress')
  })

  it('returns "booster" after marking a contact as booster', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    let id = ''
    await act(async () => {
      const c = await result.current.addContact({ companyId: 1, name: 'Alice', source: 'alumni' })
      id = c.id
    })
    await act(async () => {
      await result.current.updateContact(id, { type: 'booster' })
    })

    expect(result.current.getCompanyHealth(1)).toBe('booster')
  })

  it('returns "informational" after advancing to informational_scheduled', async () => {
    const { result } = renderHook(() => useContacts({}))
    await act(async () => {})

    let id = ''
    await act(async () => {
      const c = await result.current.addContact({ companyId: 1, name: 'Alice', source: 'alumni' })
      id = c.id
    })

    // Advance through identified → emailed → day3 → day7 → informational_scheduled
    for (let i = 0; i < 4; i++) {
      await act(async () => { await result.current.advanceStage(id) })
    }

    expect(result.current.getCompanyHealth(1)).toBe('informational')
  })
})
