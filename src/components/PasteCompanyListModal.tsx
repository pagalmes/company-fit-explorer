import React, { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Clipboard, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { llmService } from '../utils/llm/service';
import { getCompanyPreview, CompanyPreview } from '../utils/companyValidation';
import { Company } from '../types';

interface PasteCompanyListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCompanies: (companies: Company[]) => Promise<void>;
  existingCompanies: Company[];
  viewMode: 'explore' | 'watchlist';
  onShowLLMSettings?: () => void;
}

interface DetectedCompany {
  name: string;
  preview: CompanyPreview;
  selected: boolean;
  isDuplicate: boolean;
}

type ModalStep = 'input' | 'results';

/**
 * PasteCompanyListModal Component
 *
 * Allows users to paste a list of company names and batch import them.
 * Supports various formats: comma-separated, line-separated, embedded in text, etc.
 */
export const PasteCompanyListModal: React.FC<PasteCompanyListModalProps> = ({
  isOpen,
  onClose,
  onImportCompanies,
  existingCompanies,
  viewMode: _viewMode, // Reserved for future use (tab-specific import behavior)
  onShowLLMSettings,
}) => {
  const [step, setStep] = useState<ModalStep>('input');
  const [pastedText, setPastedText] = useState('');
  const [pastedHtml, setPastedHtml] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedCompanies, setDetectedCompanies] = useState<DetectedCompany[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const editableRef = useRef<HTMLDivElement>(null);

  // Reset modal when closed
  useEffect(() => {
    if (!isOpen) {
      setStep('input');
      setPastedText('');
      setPastedHtml('');
      setDetectedCompanies([]);
      setIsDetecting(false);
      setIsImporting(false);
    } else {
      // Focus editable div when opened
      setTimeout(() => editableRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle paste event to capture both text and HTML
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();

    // Get both HTML and plain text
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    // Store the HTML for the LLM (if available)
    setPastedHtml(html || '');

    // Store the plain text for character count
    setPastedText(text);

    // Update the editable div - preserve HTML formatting if available
    if (editableRef.current) {
      if (html) {
        // Insert the HTML content to preserve formatting
        editableRef.current.innerHTML = html;
      } else {
        // Plain text paste
        editableRef.current.textContent = text;
      }
    }
  }, []);

  // Check if LLM is configured
  const llmConfigured = llmService.isConfigured();

  // Detect companies from pasted text using LLM
  const handleDetectCompanies = useCallback(async () => {
    if (!pastedText.trim()) {
      toast.error('Please paste some text first');
      return;
    }

    if (!llmConfigured) {
      toast.error('Please configure your API key first', {
        action: onShowLLMSettings ? {
          label: 'Configure',
          onClick: () => {
            onClose();
            onShowLLMSettings();
          }
        } : undefined
      });
      return;
    }

    setIsDetecting(true);

    try {
      // Use LLM to extract company names and URLs
      // Pass HTML if available (contains hyperlinks), otherwise just text
      const { companies: extractedCompanies, warning } = await llmService.extractCompanies(pastedText, pastedHtml);

      // Show warning if companies were limited to 25
      if (warning) {
        toast.warning(warning, {
          duration: 8000,
        });
      }

      if (extractedCompanies.length === 0) {
        toast.error('No companies found in the text', {
          description: 'Try pasting a clearer list or use different formatting'
        });
        setIsDetecting(false);
        return;
      }

      // Get previews for each company and check for duplicates
      const detectedWithPreviews: DetectedCompany[] = await Promise.all(
        extractedCompanies.map(async (extracted) => {
          // Use the URL from LLM if provided, otherwise use the company name
          const nameOrUrl = extracted.url || extracted.name;
          const preview = await getCompanyPreview(nameOrUrl);

          // Store the original company name from LLM (not the preview name which might be the URL)
          const companyName = extracted.name;

          // Store careerUrl and LLM-inferred URL on the preview for later use
          if (extracted.careerUrl) {
            (preview as any).careerUrl = extracted.careerUrl;
          }
          // Store the LLM-inferred company URL (not the logo provider's domain)
          if (extracted.url) {
            (preview as any).inferredUrl = extracted.url;
          }

          const isDuplicate = existingCompanies.some(
            c => c.name.toLowerCase() === companyName.toLowerCase()
          );

          return {
            name: companyName, // Use the LLM-extracted name, not preview.name
            preview,
            selected: !isDuplicate, // Don't select duplicates by default
            isDuplicate,
          };
        })
      );

      setDetectedCompanies(detectedWithPreviews);
      setStep('results');

    } catch (error) {
      console.error('Error detecting companies:', error);
      toast.error('Failed to detect companies', {
        description: error instanceof Error ? error.message : 'Please try again'
      });
    } finally {
      setIsDetecting(false);
    }
  }, [pastedText, pastedHtml, llmConfigured, existingCompanies, onClose, onShowLLMSettings]);

  // Toggle individual company selection
  const toggleCompanySelection = useCallback((index: number) => {
    setDetectedCompanies(prev =>
      prev.map((company, i) =>
        i === index ? { ...company, selected: !company.selected } : company
      )
    );
  }, []);

  // Select/Deselect all companies
  const toggleSelectAll = useCallback(() => {
    const allSelected = detectedCompanies.every(c => c.selected || c.isDuplicate);
    setDetectedCompanies(prev =>
      prev.map(company => ({
        ...company,
        selected: company.isDuplicate ? false : !allSelected
      }))
    );
  }, [detectedCompanies]);

  // Import selected companies
  const handleImport = useCallback(async () => {
    const selectedCompanies = detectedCompanies.filter(c => c.selected && !c.isDuplicate);

    if (selectedCompanies.length === 0) {
      toast.error('No companies selected');
      return;
    }

    // Prepare company data for batch import (basic info only, LLM analysis happens in parent)
    const companiesToImport = selectedCompanies.map((detected) => ({
      name: detected.name, // Use the LLM-extracted name
      logo: detected.preview.logo,
      careerUrl: (detected.preview as any).careerUrl || '',
      // Use LLM-inferred URL if available, otherwise fall back to preview.domain
      domain: (detected.preview as any).inferredUrl || detected.preview.domain,
    }));

    // Close modal immediately
    onClose();

    // Show toast and let parent handle the actual import with LLM analysis
    toast.loading(`Importing ${companiesToImport.length} ${companiesToImport.length === 1 ? 'company' : 'companies'}...`, {
      id: 'batch-import',
      duration: Infinity, // Will be dismissed by parent when done
    });

    try {
      // Pass the data to parent for processing
      await onImportCompanies(companiesToImport as any);
    } catch (error) {
      console.error('Error importing companies:', error);
      toast.error('Failed to import companies', {
        id: 'batch-import',
        description: error instanceof Error ? error.message : 'Please try again'
      });
    }
  }, [detectedCompanies, onImportCompanies, onClose]);

  if (!isOpen) return null;

  const selectedCount = detectedCompanies.filter(c => c.selected).length;
  const totalCount = detectedCompanies.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col
          animate-in fade-in zoom-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Clipboard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 id="modal-title" className="text-xl font-bold text-gray-900">
                Paste Company List
              </h2>
              <p className="text-sm text-gray-500">
                Import multiple companies at once
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="paste-input" className="block text-sm font-medium text-gray-700 mb-2">
                  Paste your company list
                </label>
                <div
                  ref={editableRef}
                  id="paste-input"
                  contentEditable
                  onPaste={handlePaste}
                  onInput={(e) => setPastedText(e.currentTarget.textContent || '')}
                  data-placeholder={!pastedText ? `Paste company names here...

Examples:
• Anthropic, OpenAI, Google DeepMind
• One company per line
• Or any text with hyperlinks from LinkedIn, etc.` : undefined}
                  className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg overflow-y-auto
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    text-gray-900 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:whitespace-pre-wrap"
                  role="textbox"
                  aria-multiline="true"
                  aria-label="Paste company list"
                />
                <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
                  <span>{pastedText.length} characters</span>
                  {pastedHtml && (
                    <span className="text-blue-600 font-medium">
                      Rich text detected
                    </span>
                  )}
                </div>
              </div>

              {!llmConfigured && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                  <div className="text-amber-600 mt-0.5">⚠️</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900">API Key Required</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Configure your Anthropic API key to use company detection.
                    </p>
                    {onShowLLMSettings && (
                      <button
                        onClick={() => {
                          onClose();
                          onShowLLMSettings();
                        }}
                        className="mt-2 text-xs font-medium text-amber-700 hover:text-amber-800 underline"
                      >
                        Configure API Key
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'results' && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {selectedCount} of {totalCount} companies selected
                </p>
                <button
                  onClick={toggleSelectAll}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  {detectedCompanies.every(c => c.selected || c.isDuplicate) ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Company List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {detectedCompanies.map((company, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      company.isDuplicate
                        ? 'bg-gray-50 border-gray-200'
                        : company.selected
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => !company.isDuplicate && toggleCompanySelection(index)}
                      disabled={company.isDuplicate}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        company.isDuplicate
                          ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                          : company.selected
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300 hover:border-blue-400'
                      }`}
                      aria-label={company.isDuplicate ? 'Already in graph' : company.selected ? 'Deselect' : 'Select'}
                    >
                      {company.selected && <Check className="w-3 h-3 text-white" />}
                    </button>

                    {/* Logo */}
                    <div className="relative w-10 h-10 flex-shrink-0">
                      <Image
                        src={company.preview.logo}
                        alt={`${company.name} logo`}
                        fill
                        className="rounded-lg object-contain"
                        unoptimized
                      />
                    </div>

                    {/* Company Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {company.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {company.preview.domain}
                      </p>
                    </div>

                    {/* Duplicate Badge */}
                    {company.isDuplicate && (
                      <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-1 rounded">
                        Already in graph
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* No Results */}
              {detectedCompanies.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No companies detected</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 bg-gray-50">
          {step === 'input' ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDetectCompanies}
                disabled={!pastedText.trim() || isDetecting || !llmConfigured}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg
                  transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed
                  flex items-center gap-2"
              >
                {isDetecting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {isDetecting ? 'Analyzing...' : 'Detect Companies'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep('input')}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={selectedCount === 0 || isImporting}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg
                  transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed
                  flex items-center gap-2"
              >
                {isImporting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {isImporting ? 'Importing...' : `Import ${selectedCount} ${selectedCount === 1 ? 'Company' : 'Companies'}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
