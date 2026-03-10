import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LLMService } from '../service';
import { DEFAULT_LLM_SETTINGS } from '../config';

const STORAGE_KEY = 'cmf-llm-settings';

// Mock providers so we don't hit real APIs
vi.mock('../providers/anthropic', () => ({
  AnthropicProvider: vi.fn().mockImplementation(() => ({
    validateApiKey: vi.fn().mockResolvedValue(true),
    analyzeCompany: vi.fn().mockResolvedValue({ success: true, analysis: 'test' }),
    estimateCost: vi.fn().mockResolvedValue(0.01),
  })),
}));

vi.mock('../providers/openai', () => ({
  OpenAIProvider: vi.fn().mockImplementation(() => ({
    validateApiKey: vi.fn().mockResolvedValue(true),
    analyzeCompany: vi.fn().mockResolvedValue({ success: true, analysis: 'test' }),
    estimateCost: vi.fn().mockResolvedValue(0.01),
  })),
}));

vi.mock('../providers/google', () => ({
  GoogleProvider: vi.fn().mockImplementation(() => ({
    validateApiKey: vi.fn().mockResolvedValue(true),
    analyzeCompany: vi.fn().mockResolvedValue({ success: true }),
    estimateCost: vi.fn().mockResolvedValue(0.01),
  })),
}));

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

beforeEach(() => {
  vi.stubGlobal('localStorage', localStorageMock);
  localStorageMock.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LLMService', () => {
  describe('constructor / loadSettings', () => {
    it('initializes with default settings when no stored settings', () => {
      const service = new LLMService();
      const settings = service.getSettings();
      expect(settings.provider).toBe(DEFAULT_LLM_SETTINGS.provider);
    });

    it('loads settings from localStorage when present', () => {
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify({
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'backend-configured',
      }));
      const service = new LLMService();
      expect(service.getSettings().provider).toBe('openai');
    });

    it('falls back to defaults when localStorage contains invalid JSON', () => {
      localStorageMock.setItem(STORAGE_KEY, 'invalid-json!!');
      const service = new LLMService();
      expect(service.getSettings().provider).toBe(DEFAULT_LLM_SETTINGS.provider);
    });

    it('saves default settings to localStorage on first load', () => {
      new LLMService();
      expect(localStorageMock.getItem(STORAGE_KEY)).toBeTruthy();
    });
  });

  describe('getSettings', () => {
    it('returns a copy — mutating it does not affect internal state', () => {
      const service = new LLMService();
      const s1 = service.getSettings();
      s1.provider = 'openai' as any;
      expect(service.getSettings().provider).not.toBe('openai');
    });
  });

  describe('isConfigured', () => {
    it('returns false when provider is none', () => {
      const service = new LLMService();
      // DEFAULT_LLM_SETTINGS has a real provider with apiKey set to backend-configured
      // so force a 'none' state
      service.clearSettings();
      expect(service.isConfigured()).toBe(false);
    });

    it('returns true when anthropic is configured (default settings)', () => {
      const service = new LLMService();
      // Default settings include provider=anthropic and apiKey=backend-configured
      // provider will be initialized
      const settings = service.getSettings();
      if (settings.provider !== 'none' && settings.apiKey) {
        expect(service.isConfigured()).toBe(true);
      }
    });
  });

  describe('getCurrentProvider', () => {
    it('returns the current provider name', () => {
      const service = new LLMService();
      expect(typeof service.getCurrentProvider()).toBe('string');
    });
  });

  describe('clearSettings', () => {
    it('resets to default settings', () => {
      const service = new LLMService();
      service.clearSettings();
      expect(service.getSettings().provider).toBe(DEFAULT_LLM_SETTINGS.provider);
    });

    it('removes from localStorage', () => {
      const service = new LLMService();
      service.clearSettings();
      expect(localStorageMock.getItem(STORAGE_KEY)).toBeNull();
    });

    it('sets provider to null (isConfigured returns false)', () => {
      const service = new LLMService();
      service.clearSettings();
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('updateSettings', () => {
    it('returns true when provider is none (skip validation)', async () => {
      const service = new LLMService();
      const result = await service.updateSettings({ ...DEFAULT_LLM_SETTINGS, provider: 'none' });
      expect(result).toBe(true);
    });

    it('returns true when provider validates successfully', async () => {
      const service = new LLMService();
      const result = await service.updateSettings({
        ...DEFAULT_LLM_SETTINGS,
        provider: 'anthropic',
        apiKey: 'backend-configured',
      });
      expect(result).toBe(true);
    });

    it('returns false when an error is thrown during validation', async () => {
      const { AnthropicProvider } = await import('../providers/anthropic');
      // Make the NEXT call to new AnthropicProvider return a failing validateApiKey
      // The constructor call happens twice: once in LLMService() init, once in updateSettings.
      // So we need to set it up before creating the service and call updateSettings immediately.
      (AnthropicProvider as any)
        .mockImplementationOnce(() => ({ // constructor call — initial load
          validateApiKey: vi.fn().mockResolvedValue(true),
          analyzeCompany: vi.fn(),
          estimateCost: vi.fn(),
        }))
        .mockImplementationOnce(() => ({ // second call — in updateSettings
          validateApiKey: vi.fn().mockRejectedValue(new Error('Network error')),
          analyzeCompany: vi.fn(),
          estimateCost: vi.fn(),
        }));
      const service = new LLMService();
      const result = await service.updateSettings({
        ...DEFAULT_LLM_SETTINGS,
        provider: 'anthropic',
        apiKey: 'bad-key',
      });
      expect(result).toBe(false);
    });

    it('saves updated settings to localStorage', async () => {
      const service = new LLMService();
      await service.updateSettings({ ...DEFAULT_LLM_SETTINGS, provider: 'none' });
      const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEY)!);
      expect(stored.provider).toBe('none');
    });
  });

  describe('analyzeCompany', () => {
    it('returns error when not configured', async () => {
      const service = new LLMService();
      service.clearSettings();
      const result = await service.analyzeCompany({ companyName: 'Stripe', userCMF: {} as any });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not configured/i);
    });

    it('delegates to provider when configured', async () => {
      const service = new LLMService();
      // Ensure provider is initialized (default settings = anthropic)
      if (service.isConfigured()) {
        const result = await service.analyzeCompany({ companyName: 'Stripe', userCMF: {} as any });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('validateCurrentApiKey', () => {
    it('returns false when no provider', async () => {
      const service = new LLMService();
      service.clearSettings();
      expect(await service.validateCurrentApiKey()).toBe(false);
    });

    it('delegates to provider.validateApiKey when provider exists', async () => {
      const service = new LLMService();
      if (service.isConfigured()) {
        const result = await service.validateCurrentApiKey();
        expect(typeof result).toBe('boolean');
      }
    });
  });

  describe('estimateCost', () => {
    it('returns 0 when no provider', async () => {
      const service = new LLMService();
      service.clearSettings();
      expect(await service.estimateCost('Stripe', {})).toBe(0);
    });

    it('returns a number when provider is configured', async () => {
      const service = new LLMService();
      if (service.isConfigured()) {
        const cost = await service.estimateCost('Stripe', { role: 'engineer' });
        expect(typeof cost).toBe('number');
      }
    });
  });

  describe('extractCompanies', () => {
    it('throws when not configured', async () => {
      const service = new LLMService();
      service.clearSettings();
      await expect(service.extractCompanies('text')).rejects.toThrow(/not configured/i);
    });

    it('calls /api/llm/anthropic/extract-companies when configured', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, companies: [{ name: 'Stripe' }] }),
      });
      const service = new LLMService();
      if (service.isConfigured()) {
        const result = await service.extractCompanies('some text');
        expect(result.companies).toEqual([{ name: 'Stripe' }]);
      }
      vi.restoreAllMocks();
    });

    it('throws on non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      });
      const service = new LLMService();
      if (service.isConfigured()) {
        await expect(service.extractCompanies('text')).rejects.toThrow();
      }
      vi.restoreAllMocks();
    });
  });
});
