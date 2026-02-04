import React, { useState, useCallback } from 'react';
import { UserCMF, CMFItem } from '../types';
import { validateProfile, isProfileComplete, getMinimumRequired, countItemsInField } from '../utils/profileValidation';
import { Sparkles, Plus, X, CheckCircle, AlertCircle } from 'lucide-react';

interface ManualCMFEntryFormProps {
  onComplete: (cmf: Partial<UserCMF>) => void;
  onCancel?: () => void;
  initialData?: Partial<UserCMF>;
}

/**
 * ManualCMFEntryForm Component
 * 
 * A cosmic-themed form for manually entering or editing profile information
 * when file upload extraction isn't available or for fallback scenarios.
 * 
 * Features:
 * - Pre-fills with extracted data if provided
 * - Real-time validation with clear error messages
 * - Dynamic list inputs for requirements and experience
 * - Progress indicators showing min requirements
 * - Cosmic theme styling matching DreamyFirstContact
 */
const ManualCMFEntryForm: React.FC<ManualCMFEntryFormProps> = ({
  onComplete,
  onCancel,
  initialData
}) => {
  const [formData, setFormData] = useState<Partial<UserCMF>>({
    name: initialData?.name || '',
    targetRole: initialData?.targetRole || '',
    targetCompanies: initialData?.targetCompanies || '',
    mustHaves: initialData?.mustHaves || [],
    wantToHave: initialData?.wantToHave || [],
    experience: initialData?.experience || []
  });

  const [newMustHave, setNewMustHave] = useState('');
  const [newWantToHave, setNewWantToHave] = useState('');
  const [newExperience, setNewExperience] = useState('');
  const [activeTab, setActiveTab] = useState<'basics' | 'requirements' | 'experience'>('basics');

  const validation = validateProfile(formData, true);
  const isComplete = isProfileComplete(formData);

  // Update form field
  const updateField = useCallback((field: keyof typeof formData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Add item to list
  const addItem = useCallback((field: 'mustHaves' | 'wantToHave' | 'experience', value: string) => {
    if (!value.trim()) return;

    const currentItems = formData[field] || [];
    const newItems = [...currentItems, value.trim()];
    updateField(field, newItems);

    if (field === 'mustHaves') setNewMustHave('');
    else if (field === 'wantToHave') setNewWantToHave('');
    else setNewExperience('');
  }, [formData, updateField]);

  // Remove item from list
  const removeItem = useCallback((field: 'mustHaves' | 'wantToHave' | 'experience', index: number) => {
    const currentItems = formData[field] || [];
    const newItems = currentItems.filter((_, i) => i !== index);
    updateField(field, newItems);
  }, [formData, updateField]);

  // Progress bar for requirements
  const ProgressBar = ({ current, required, label }: { current: number; required: number; label: string }) => {
    const percentage = Math.min((current / required) * 100, 100);
    const isComplete = current >= required;

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-300">{label}</span>
          <span className={`font-semibold ${isComplete ? 'text-green-400' : 'text-blue-300'}`}>
            {current}/{required}
          </span>
        </div>
        <div className="relative h-2 bg-slate-700/50 rounded-full overflow-hidden border border-blue-500/20">
          <div
            className={`h-full transition-all duration-300 ${
              isComplete
                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                : 'bg-gradient-to-r from-blue-500 to-cyan-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  // List input component
  const ListInput = ({
    field,
    placeholder,
    label,
    currentValue,
    setCurrentValue,
    items,
    color
  }: {
    field: 'mustHaves' | 'wantToHave' | 'experience';
    placeholder: string;
    label: string;
    currentValue: string;
    setCurrentValue: (value: string) => void;
    items: (string | CMFItem)[];
    color: 'red' | 'green' | 'orange';
  }) => {
    const minRequired = getMinimumRequired(field);
    const currentCount = countItemsInField(items);
    const isFieldComplete = currentCount >= minRequired;

    const colorClasses = {
      red: {
        border: 'border-red-500/30',
        bg: 'bg-red-500/5',
        text: 'text-red-300',
        input: 'focus:border-red-500 focus:ring-red-500/20',
        button: 'bg-gradient-to-r from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30'
      },
      green: {
        border: 'border-green-500/30',
        bg: 'bg-green-500/5',
        text: 'text-green-300',
        input: 'focus:border-green-500 focus:ring-green-500/20',
        button: 'bg-gradient-to-r from-green-500/20 to-green-600/20 hover:from-green-500/30 hover:to-green-600/30'
      },
      orange: {
        border: 'border-orange-500/30',
        bg: 'bg-orange-500/5',
        text: 'text-orange-300',
        input: 'focus:border-orange-500 focus:ring-orange-500/20',
        button: 'bg-gradient-to-r from-orange-500/20 to-orange-600/20 hover:from-orange-500/30 hover:to-orange-600/30'
      }
    };

    const classes = colorClasses[color];

    return (
      <div className={`p-4 rounded-lg border ${classes.border} ${classes.bg}`}>
        <div className="flex items-center justify-between mb-3">
          <label className={`text-sm font-semibold ${classes.text}`}>{label}</label>
          {isFieldComplete && <CheckCircle className="w-4 h-4 text-green-400" />}
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <ProgressBar current={currentCount} required={minRequired} label={`${label} progress`} />
        </div>

        {/* Item list */}
        <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
          {items.map((item, index) => {
            const displayText = typeof item === 'string' ? item : item.short;
            return (
              <div key={index} className="flex items-center justify-between bg-slate-700/30 rounded px-3 py-2 group">
                <span className="text-sm text-gray-200 truncate">{displayText}</span>
                <button
                  onClick={() => removeItem(field, index)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  type="button"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-red-400" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Input field */}
        <div className="flex gap-2">
          <input
            type="text"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addItem(field, currentValue);
              }
            }}
            placeholder={placeholder}
            className={`flex-1 bg-slate-800/50 border border-slate-600/50 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 transition-all ${classes.input}`}
          />
          <button
            onClick={() => addItem(field, currentValue)}
            type="button"
            className={`px-3 py-2 rounded text-sm font-medium ${classes.button} transition-all text-gray-200 hover:text-white`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // Error summary
  const ErrorSummary = () => {
    if (validation.errors.length === 0) return null;

    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-red-300">Incomplete Profile</p>
            <ul className="text-xs text-red-200 space-y-0.5">
              {validation.errors.map((error, idx) => (
                <li key={idx} className="flex items-center gap-1">
                  <span>•</span>
                  <span>{error.message}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-y-auto">
      {/* Cosmic background effects */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full opacity-5 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500 rounded-full opacity-5 blur-3xl animate-pulse" style={{ animationDelay: '3s', animationDuration: '6s' }} />

      {/* Content */}
      <div className="relative max-w-2xl mx-auto py-8 px-4 md:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-purple-300 animate-spin" />
            <h1 className="text-3xl font-bold text-white">
              Build Your{' '}
              <span className="bg-gradient-to-r from-orange-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
                Profile
              </span>
            </h1>
          </div>
          <p className="text-gray-300 text-sm md:text-base">
            Help us understand your career goals to find perfect company matches
          </p>
        </div>

        {/* Error Summary */}
        <ErrorSummary />

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {(['basics', 'requirements', 'experience'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'bg-slate-800/50 text-gray-300 hover:bg-slate-700/50'
              }`}
            >
              {tab === 'basics' && '📋 Basics'}
              {tab === 'requirements' && '🎯 Requirements'}
              {tab === 'experience' && '💼 Experience'}
            </button>
          ))}
        </div>

        {/* Form Content */}
        <div className="space-y-4 mb-6">
          {activeTab === 'basics' && (
            <>
              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-blue-300">
                  Your Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g., Sarah Chen"
                  className="w-full bg-slate-800/50 border border-blue-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              {/* Target Role */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-purple-300">
                  Target Role <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.targetRole || ''}
                  onChange={(e) => updateField('targetRole', e.target.value)}
                  placeholder="e.g., Senior Product Manager"
                  className="w-full bg-slate-800/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>

              {/* Target Companies */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-pink-300">
                  Target Company Stage <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.targetCompanies || ''}
                  onChange={(e) => updateField('targetCompanies', e.target.value)}
                  placeholder="e.g., Series B-D startups, Growth-stage"
                  className="w-full bg-slate-800/50 border border-pink-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
                />
              </div>
            </>
          )}

          {activeTab === 'requirements' && (
            <>
              {/* Must-Haves */}
              <ListInput
                field="mustHaves"
                label="🔴 Must-Haves (Required)"
                placeholder="Add a non-negotiable requirement..."
                currentValue={newMustHave}
                setCurrentValue={setNewMustHave}
                items={formData.mustHaves || []}
                color="red"
              />

              {/* Want-to-Haves */}
              <ListInput
                field="wantToHave"
                label="💚 Want-to-Haves (Nice-to-Have)"
                placeholder="Add a nice-to-have preference..."
                currentValue={newWantToHave}
                setCurrentValue={setNewWantToHave}
                items={formData.wantToHave || []}
                color="green"
              />
            </>
          )}

          {activeTab === 'experience' && (
            <>
              {/* Experience */}
              <ListInput
                field="experience"
                label="💼 Skills & Experience (Required)"
                placeholder="Add a skill or experience area..."
                currentValue={newExperience}
                setCurrentValue={setNewExperience}
                items={formData.experience || []}
                color="orange"
              />

              {/* Help text */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm text-blue-200">
                <p className="font-semibold mb-2">💡 Examples:</p>
                <ul className="space-y-1 text-xs">
                  <li>• "5+ years product management"</li>
                  <li>• "B2B SaaS expertise"</li>
                  <li>• "Team leadership and mentoring"</li>
                  <li>• "Data-driven decision making"</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          {onCancel && (
            <button
              onClick={onCancel}
              type="button"
              className="flex-1 px-6 py-3 rounded-lg font-medium text-gray-300 bg-slate-800/50 hover:bg-slate-700/50 transition-all border border-slate-600/50"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => onComplete(formData)}
            disabled={!isComplete}
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              isComplete
                ? 'bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 text-white hover:scale-105 shadow-lg'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-60'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            {isComplete ? '✨ Complete Profile' : 'Complete Profile'}
          </button>
        </div>

        {/* Requirements Summary */}
        {!isComplete && (
          <div className="mt-6 p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg">
            <p className="text-xs font-semibold text-gray-400 mb-3">REMAINING REQUIREMENTS:</p>
            <div className="space-y-2">
              {validation.errors.map((error, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="text-red-400">•</span>
                  <span>{error.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualCMFEntryForm;
