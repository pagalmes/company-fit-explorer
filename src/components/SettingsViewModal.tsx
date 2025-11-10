import React from 'react';
import { LLMSettings } from '../types';
import { LLM_PROVIDERS } from '../utils/llm/config';
import { llmService } from '../utils/llm/service';
import { getCompanyLogo } from '../utils/logoProvider';

interface SettingsViewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsViewModal: React.FC<SettingsViewModalProps> = ({
  isOpen,
  onClose
}) => {
  const settings: LLMSettings = llmService.getSettings();

  if (!isOpen) return null;

  const selectedProvider = settings.provider !== 'none' ? LLM_PROVIDERS[settings.provider] : null;
  const selectedModel = selectedProvider?.models.find(m => m.id === settings.model);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-lg shadow-xl max-w-2xl w-full p-6 border border-blue-200/40">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-2">
              Current Settings
            </h2>
            <p className="text-sm text-slate-600">
              View your current AI configuration. Contact your administrator to make changes.
            </p>
          </div>

          <div className="space-y-6">
            {/* AI Provider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                AI Provider
              </label>
              <div className="p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  {selectedProvider ? (
                    <>
                      <img
                        src={getCompanyLogo('anthropic.com', 'Anthropic')}
                        alt="Anthropic"
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div>
                        <div className="font-medium text-slate-800">
                          {selectedProvider.displayName}
                        </div>
                        <div className="text-xs text-slate-500">
                          Configured by administrator
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-600">
                      No AI provider configured
                    </div>
                  )}
                </div>
              </div>
            </div>

            {selectedProvider && selectedModel && (
              <>
                {/* Model */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model
                  </label>
                  <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="font-medium text-slate-800 mb-1">
                      {selectedModel.name}
                    </div>
                    <div className="text-sm text-slate-600 mb-2">
                      {selectedModel.description}
                    </div>
                    {selectedModel.costPer1MTokens && (
                      <div className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded inline-block">
                        Cost: ${selectedModel.costPer1MTokens.input}-${selectedModel.costPer1MTokens.output}/1M tokens
                      </div>
                    )}
                  </div>
                </div>

              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end mt-8 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsViewModal;
