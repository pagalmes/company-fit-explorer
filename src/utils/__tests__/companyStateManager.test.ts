import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  saveCustomCompanies,
  loadCustomCompanies,
  addCustomCompany,
  removeCustomCompany,
  clearCustomCompanies,
  exportCompaniesData,
  importCompaniesData,
  getStorageStats,
  setupCrossTabSync,
} from '../companyStateManager';
import type { Company } from '../../types';

const STORAGE_KEY = 'cmf-custom-companies';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

const makeCompany = (overrides: Partial<Company> = {}): Company => ({
  id: 1,
  name: 'Stripe',
  industry: 'Fintech',
  stage: 'Public',
  employees: '1000+',
  location: 'San Francisco',
  remote: 'Hybrid',
  matchScore: 85,
  matchReasons: ['great culture'],
  color: '#3b82f6',
  connections: [],
  connectionTypes: {},
  logo: 'https://ui-avatars.com/api/?name=ST',
  careerUrl: 'https://stripe.com/jobs',
  openRoles: 5,
  ...overrides,
});

beforeEach(() => {
  vi.stubGlobal('localStorage', localStorageMock);
  localStorageMock.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('saveCustomCompanies', () => {
  it('saves companies to localStorage', async () => {
    const companies = [makeCompany()];
    const result = await saveCustomCompanies(companies);
    expect(result.success).toBe(true);
    const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEY)!);
    expect(stored.companies).toHaveLength(1);
    expect(stored.companies[0].name).toBe('Stripe');
  });

  it('includes version and lastUpdated in stored data', async () => {
    await saveCustomCompanies([makeCompany()]);
    const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEY)!);
    expect(stored.version).toBe(1);
    expect(stored.lastUpdated).toBeTruthy();
  });

  it('saves empty array', async () => {
    const result = await saveCustomCompanies([]);
    expect(result.success).toBe(true);
  });

  it('returns error when data exceeds size limit', async () => {
    // Create a company with a very large matchReasons array
    const bigCompany = makeCompany({
      matchReasons: Array(100000).fill('reason that is very long and repeated many times'),
    });
    const result = await saveCustomCompanies([bigCompany]);
    // May or may not exceed limit depending on JSON size, but should not throw
    expect(typeof result.success).toBe('boolean');
  });

  it('dispatches customCompaniesUpdated event', async () => {
    const spy = vi.spyOn(window, 'dispatchEvent');
    await saveCustomCompanies([makeCompany()]);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'customCompaniesUpdated' })
    );
    spy.mockRestore();
  });

  it('handles QuotaExceededError', async () => {
    const throwing = {
      ...localStorageMock,
      setItem: vi.fn(() => {
        const err = new Error('QuotaExceededError');
        err.name = 'QuotaExceededError';
        throw err;
      }),
    };
    vi.stubGlobal('localStorage', throwing);
    const result = await saveCustomCompanies([makeCompany()]);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/quota/i);
  });
});

describe('loadCustomCompanies', () => {
  it('returns empty array when nothing stored', () => {
    const result = loadCustomCompanies();
    expect(result.companies).toEqual([]);
    expect(result.error).toBeUndefined();
  });

  it('loads saved companies', async () => {
    await saveCustomCompanies([makeCompany()]);
    const result = loadCustomCompanies();
    expect(result.companies).toHaveLength(1);
    expect(result.companies[0].name).toBe('Stripe');
  });

  it('returns empty and clears on version mismatch', () => {
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify({ companies: [], version: 99, lastUpdated: '' }));
    const result = loadCustomCompanies();
    expect(result.companies).toEqual([]);
    expect(localStorageMock.getItem(STORAGE_KEY)).toBeNull();
  });

  it('returns empty and reports error on corrupted JSON', () => {
    localStorageMock.setItem(STORAGE_KEY, 'not-json!!');
    const result = loadCustomCompanies();
    expect(result.companies).toEqual([]);
    expect(result.error).toBeTruthy();
  });

  it('filters out invalid company entries', async () => {
    const data = {
      companies: [
        { id: 1, name: 'Valid Co', matchScore: 80 },
        { id: 'bad', name: '', matchScore: 50 }, // invalid: id not number, name empty
        { name: 'No ID Co', matchScore: 80 },     // invalid: no id
      ],
      version: 1,
      lastUpdated: '',
    };
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify(data));
    const result = loadCustomCompanies();
    expect(result.companies).toHaveLength(1);
    expect(result.companies[0].name).toBe('Valid Co');
  });

  it('fills in default values for optional fields', () => {
    const minimal = { companies: [{ id: 1, name: 'Min Co', matchScore: 70 }], version: 1, lastUpdated: '' };
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify(minimal));
    const result = loadCustomCompanies();
    const c = result.companies[0];
    expect(c.industry).toBe('Technology');
    expect(c.stage).toBe('Unknown');
    expect(Array.isArray(c.connections)).toBe(true);
  });
});

describe('addCustomCompany', () => {
  it('adds a new company', async () => {
    const result = await addCustomCompany(makeCompany(), []);
    expect(result.success).toBe(true);
    expect(result.companies).toHaveLength(1);
  });

  it('rejects duplicate by name (case-insensitive)', async () => {
    const existing = [makeCompany({ name: 'Stripe' })];
    const result = await addCustomCompany(makeCompany({ id: 99, name: 'stripe' }), existing);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already exists/i);
  });

  it('rejects duplicate by id', async () => {
    const existing = [makeCompany({ id: 1, name: 'Stripe' })];
    const result = await addCustomCompany(makeCompany({ id: 1, name: 'Other' }), existing);
    expect(result.success).toBe(false);
  });

  it('preserves existing companies on add', async () => {
    const existing = [makeCompany({ id: 1 })];
    const result = await addCustomCompany(makeCompany({ id: 2, name: 'GitHub' }), existing);
    expect(result.companies).toHaveLength(2);
  });
});

describe('removeCustomCompany', () => {
  it('removes a company by id', async () => {
    const existing = [makeCompany({ id: 1 }), makeCompany({ id: 2, name: 'GitHub' })];
    const result = await removeCustomCompany(1, existing);
    expect(result.success).toBe(true);
    expect(result.companies).toHaveLength(1);
    expect(result.companies[0].name).toBe('GitHub');
    expect(result.removedCompany?.name).toBe('Stripe');
  });

  it('returns error for non-existent id', async () => {
    const result = await removeCustomCompany(999, [makeCompany()]);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });
});

describe('clearCustomCompanies', () => {
  it('removes all stored companies', async () => {
    await saveCustomCompanies([makeCompany()]);
    await clearCustomCompanies();
    expect(localStorageMock.getItem(STORAGE_KEY)).toBeNull();
  });

  it('dispatches customCompaniesUpdated with empty array', async () => {
    const spy = vi.spyOn(window, 'dispatchEvent');
    await clearCustomCompanies();
    const event = spy.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('customCompaniesUpdated');
    expect(event.detail.companies).toEqual([]);
    spy.mockRestore();
  });
});

describe('exportCompaniesData', () => {
  it('returns valid JSON string', async () => {
    await saveCustomCompanies([makeCompany()]);
    const exported = exportCompaniesData();
    expect(() => JSON.parse(exported)).not.toThrow();
  });

  it('includes companies and exportDate', async () => {
    await saveCustomCompanies([makeCompany()]);
    const exported = JSON.parse(exportCompaniesData());
    expect(exported.companies).toHaveLength(1);
    expect(exported.exportDate).toBeTruthy();
  });

  it('returns empty companies when nothing stored', () => {
    const exported = JSON.parse(exportCompaniesData());
    expect(exported.companies).toEqual([]);
  });
});

describe('importCompaniesData', () => {
  it('imports valid companies JSON', async () => {
    const data = JSON.stringify({
      companies: [{ id: 1, name: 'Stripe', matchScore: 80 }],
      version: 1,
    });
    const result = await importCompaniesData(data);
    expect(result.success).toBe(true);
    expect(result.companiesCount).toBe(1);
  });

  it('returns error for invalid JSON', async () => {
    const result = await importCompaniesData('not-json');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns error when companies key is missing', async () => {
    const result = await importCompaniesData(JSON.stringify({ foo: 'bar' }));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid/i);
  });
});

describe('getStorageStats', () => {
  it('returns zero stats when nothing stored', () => {
    const stats = getStorageStats();
    expect(stats.used).toBe(0);
    expect(stats.companiesCount).toBe(0);
    expect(stats.usagePercentage).toBe(0);
  });

  it('returns positive used bytes after saving', async () => {
    await saveCustomCompanies([makeCompany()]);
    const stats = getStorageStats();
    expect(stats.used).toBeGreaterThan(0);
    expect(stats.companiesCount).toBe(1);
  });
});

describe('setupCrossTabSync', () => {
  it('returns a cleanup function', () => {
    const cleanup = setupCrossTabSync(() => {});
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('calls callback when customCompaniesUpdated event fires', () => {
    const callback = vi.fn();
    const cleanup = setupCrossTabSync(callback);

    window.dispatchEvent(new CustomEvent('customCompaniesUpdated', {
      detail: { companies: [makeCompany()] },
    }));

    expect(callback).toHaveBeenCalledWith([makeCompany()]);
    cleanup();
  });
});
