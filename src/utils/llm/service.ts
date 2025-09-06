/**
 * LLM Service
 * 
 * Main service for LLM integration with user-configurable providers
 */

import { LLMSettings, LLMResponse, CompanyAnalysisRequest, BaseLLMProvider } from './types';
import { DEFAULT_LLM_SETTINGS } from './config';
import { AnthropicProvider } from './providers/anthropic';
import { OpenAIProvider } from './providers/openai';
import { GoogleProvider } from './providers/google';

export class LLMService {
  private static readonly STORAGE_KEY = 'cmf-llm-settings';
  private provider: BaseLLMProvider | null = null;
  private settings: LLMSettings = DEFAULT_LLM_SETTINGS;

  constructor() {
    this.loadSettings();
  }

  /**
   * Get current LLM settings
   */
  getSettings(): LLMSettings {
    return { ...this.settings };
  }

  /**
   * Update LLM settings and reinitialize provider
   */
  async updateSettings(newSettings: LLMSettings): Promise<boolean> {
    try {
      // For backend integration, we don't need API key in frontend
      // Validate backend connection if provider is configured
      if (newSettings.provider !== 'none') {
        const tempProvider = this.createProvider(newSettings);
        const isValid = await tempProvider.validateApiKey();
        
        if (!isValid) {
          throw new Error('Backend API key validation failed. Check server .env configuration.');
        }
      }

      // Save settings (without API key for backend integration)
      this.settings = { ...newSettings, apiKey: 'backend-configured' };
      this.saveSettings();
      
      // Reinitialize provider
      this.initializeProvider();
      
      return true;
    } catch (error) {
      console.error('Failed to update LLM settings:', error);
      return false;
    }
  }

  /**
   * Check if LLM is configured and ready
   */
  isConfigured(): boolean {
    return this.settings.provider !== 'none' && 
           !!this.settings.apiKey && 
           !!this.settings.model && 
           this.provider !== null;
  }

  /**
   * Get the current provider name
   */
  getCurrentProvider(): string {
    return this.settings.provider;
  }

  /**
   * Analyze a company using the configured LLM provider
   */
  async analyzeCompany(request: CompanyAnalysisRequest): Promise<LLMResponse> {
    if (!this.isConfigured() || !this.provider) {
      return {
        success: false,
        error: 'LLM not configured. Please configure your API key in settings.'
      };
    }

    try {
      return await this.provider.analyzeCompany(request);
    } catch (error) {
      console.error('LLM analysis failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze company'
      };
    }
  }

  /**
   * Estimate cost for a company analysis
   */
  async estimateCost(companyName: string, userCMF: any): Promise<number> {
    if (!this.provider) {
      return 0;
    }

    const prompt = `Analyze ${companyName} with criteria: ${JSON.stringify(userCMF)}`;
    return await this.provider.estimateCost(prompt);
  }

  /**
   * Validate current API key
   */
  async validateCurrentApiKey(): Promise<boolean> {
    if (!this.provider) {
      return false;
    }

    return await this.provider.validateApiKey();
  }

  /**
   * Clear all settings and reset to default
   */
  clearSettings(): void {
    this.settings = { ...DEFAULT_LLM_SETTINGS };
    this.provider = null;
    if (typeof window !== 'undefined' && localStorage) {
      localStorage.removeItem(LLMService.STORAGE_KEY);
    }
  }

  private loadSettings(): void {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || !localStorage) {
        return;
      }
      
      const stored = localStorage.getItem(LLMService.STORAGE_KEY);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        this.settings = { ...DEFAULT_LLM_SETTINGS, ...parsedSettings };
        this.initializeProvider();
      }
    } catch (error) {
      console.error('Failed to load LLM settings:', error);
      this.settings = { ...DEFAULT_LLM_SETTINGS };
    }
  }

  private saveSettings(): void {
    try {
      if (typeof window !== 'undefined' && localStorage) {
        localStorage.setItem(LLMService.STORAGE_KEY, JSON.stringify(this.settings));
      }
    } catch (error) {
      console.error('Failed to save LLM settings:', error);
    }
  }

  private initializeProvider(): void {
    if (this.settings.provider === 'none' || !this.settings.apiKey) {
      this.provider = null;
      return;
    }

    try {
      this.provider = this.createProvider(this.settings);
    } catch (error) {
      console.error('Failed to initialize LLM provider:', error);
      this.provider = null;
    }
  }

  private createProvider(settings: LLMSettings): BaseLLMProvider {
    switch (settings.provider) {
      case 'anthropic':
        return new AnthropicProvider(settings);
      case 'openai':
        return new OpenAIProvider(settings);
      case 'google':
        return new GoogleProvider(settings);
      default:
        throw new Error(`Unsupported provider: ${settings.provider}`);
    }
  }
}

// Global singleton instance
export const llmService = new LLMService();