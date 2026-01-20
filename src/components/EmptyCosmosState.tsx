import React, { useState } from 'react';
import { FileText, Target, Upload, CheckCircle, X } from 'lucide-react';

interface EmptyCosmosStateProps {
  onAddCompany: () => void;
  onPasteList: () => void;
  onScreenshotImport: () => void;
  onFilesUploaded?: (resumeFile: File, cmfFile: File) => void;
}

/**
 * EmptyCosmosState - Shown when user has no companies in their exploration
 * Features a welcoming design with multiple ways to add companies
 * Supports file upload for CV and career goals to auto-discover companies
 */
const EmptyCosmosState: React.FC<EmptyCosmosStateProps> = ({
  onAddCompany,
  onPasteList,
  onScreenshotImport,
  onFilesUploaded,
}) => {
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [cmfFile, setCmfFile] = useState<File | null>(null);

  const handleFileUpload = (file: File | null, type: 'resume' | 'cmf') => {
    if (type === 'resume') {
      setResumeFile(file);
    } else {
      setCmfFile(file);
    }
  };

  const handleStartDiscovery = () => {
    if (resumeFile && cmfFile && onFilesUploaded) {
      onFilesUploaded(resumeFile, cmfFile);
    }
  };

  // File upload zone component
  const CosmicUploadZone = ({ type, title, description, icon: Icon, file, color }: {
    type: 'resume' | 'cmf';
    title: string;
    description: string;
    icon: React.ComponentType<React.ComponentProps<'svg'>>;
    file: File | null;
    color: 'blue' | 'purple';
  }) => {
    const colorClasses = {
      blue: 'from-blue-500/20 to-cyan-500/20 border-blue-400/30',
      purple: 'from-purple-500/20 to-pink-500/20 border-purple-400/30'
    };

    return (
      <div className={`
        relative p-6 sm:p-8 rounded-2xl backdrop-blur-lg border-2 border-dashed transition-all duration-300 hover:scale-105
        ${file ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-400/40' :
         `bg-gradient-to-br ${colorClasses[color]} hover:border-opacity-60`}
      `}>
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-40 animate-pulse"
              style={{
                left: `${10 + i * 15}%`,
                top: `${10 + (i % 3) * 30}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${2 + i * 0.3}s`
              }}
            />
          ))}
        </div>

        {file ? (
          <div className="text-center relative z-10">
            <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-300 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-green-200 mb-2">{file.name}</h3>
            <p className="text-sm text-green-300 mb-4">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <button
              onClick={() => handleFileUpload(null, type)}
              className="text-red-400 hover:text-red-300 font-medium transition-colors text-sm"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="text-center relative z-10">
            <input
              id={`file-${type}`}
              type="file"
              className="hidden"
              accept={type === 'resume' ? '.pdf,.doc,.docx' : '.pdf,.doc,.docx,.md,.txt'}
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], type)}
            />
            <label htmlFor={`file-${type}`} className="cursor-pointer">
              <Icon className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 ${
                color === 'blue' ? 'text-blue-300' : 'text-purple-300'
              }`} />
              <h3 className="text-lg sm:text-xl font-semibold mb-2 text-white">{title}</h3>
              <p className="text-sm sm:text-base text-gray-300 mb-4 sm:mb-6">{description}</p>
              <div className={`inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium transition-all hover:scale-105 text-sm sm:text-base ${
                color === 'blue'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              }`}>
                <Upload className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Upload File
              </div>
            </label>
          </div>
        )}
      </div>
    );
  };

  if (showFileUpload) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 overflow-auto">
        <div className="w-full max-w-6xl mx-auto px-4 py-8 sm:px-6 sm:py-12">
          {/* Floating cosmic particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-pulse opacity-30"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              >
                <div className="w-1 h-1 bg-blue-300 rounded-full" />
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="relative z-10 space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <button
                onClick={() => {
                  setShowFileUpload(false);
                  setResumeFile(null);
                  setCmfFile(null);
                }}
                className="absolute top-0 right-0 sm:right-4 text-white/60 hover:text-white transition-colors p-2"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex justify-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-300 via-pink-400 to-purple-500 rounded-full animate-pulse shadow-2xl" />
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                Discover Your Perfect Matches
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-blue-200 max-w-2xl mx-auto px-4">
                Upload your CV and career goals. We'll use AI to discover companies that match your profile.
              </p>
            </div>

            {/* File Upload Grid */}
            <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
              <div className="space-y-4">
                <div className="flex items-center text-blue-300 mb-2">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-bold">1</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-white">Your CV / Resume</h2>
                </div>

                <CosmicUploadZone
                  type="resume"
                  title="Professional Experience"
                  description="Your career journey, skills, and experience"
                  icon={FileText}
                  file={resumeFile}
                  color="blue"
                />

                <p className="text-blue-300 text-xs sm:text-sm text-center">
                  PDF, DOC, or DOCX • Max 10MB
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center text-purple-300 mb-2">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-bold">2</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-white">Career Goals</h2>
                </div>

                <CosmicUploadZone
                  type="cmf"
                  title="What You Want"
                  description="Your requirements, values, and dream job criteria"
                  icon={Target}
                  file={cmfFile}
                  color="purple"
                />

                <p className="text-purple-300 text-xs sm:text-sm text-center">
                  PDF, DOC, DOCX, MD, or TXT • Max 5MB
                </p>
              </div>
            </div>

            {/* Action Button */}
            <div className="text-center pt-4">
              {resumeFile && cmfFile ? (
                <button
                  onClick={handleStartDiscovery}
                  className="px-8 sm:px-12 py-3 sm:py-4 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 hover:from-orange-500 hover:via-pink-600 hover:to-purple-700 text-white rounded-xl font-bold text-base sm:text-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  🚀 Discover Companies
                </button>
              ) : (
                <p className="text-blue-300/80 text-sm sm:text-base">
                  Upload both files to start discovering companies
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 overflow-auto">
      <div className="w-full max-w-2xl mx-auto px-4 py-8 sm:px-6 sm:py-12">
        {/* Floating cosmic particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-pulse opacity-30"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <div className="w-1 h-1 bg-blue-300 rounded-full" />
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 text-center space-y-6 sm:space-y-8">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-orange-300 via-pink-400 to-purple-500 rounded-full animate-pulse shadow-2xl" />
              <div className="absolute inset-0 scale-150 opacity-20">
                <div
                  className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-r from-orange-400 to-purple-500 rounded-full animate-spin"
                  style={{ animationDuration: '8s' }}
                />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-3 sm:space-y-4">
            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              Your Career Universe Awaits
            </h1>
            <p className="text-base sm:text-lg text-blue-200 max-w-lg mx-auto px-4">
              Start building your personalized company exploration by adding companies that match your career goals.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4 max-w-md mx-auto">
            {/* Primary: Upload Files for AI Discovery */}
            <button
              onClick={() => setShowFileUpload(true)}
              className="w-full px-6 py-4 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 hover:from-orange-500 hover:via-pink-600 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-3"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Upload CV & Career Goals</span>
            </button>

            {/* Secondary: Add Single Company */}
            <button
              onClick={onAddCompany}
              className="w-full px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-3 backdrop-blur-sm border border-white/20"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Company Manually</span>
            </button>

            {/* Secondary: Paste List */}
            <button
              onClick={onPasteList}
              className="w-full px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-3 backdrop-blur-sm border border-white/20"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Paste Company List</span>
            </button>

            {/* Tertiary: Screenshot Import */}
            <button
              onClick={onScreenshotImport}
              className="w-full px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-3 backdrop-blur-sm border border-white/20"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Import from Screenshot</span>
            </button>
          </div>

          {/* Help Text */}
          <div className="pt-4 sm:pt-6">
            <p className="text-sm text-blue-300/80 max-w-md mx-auto px-4">
              You can add companies one at a time, paste a list of company names, or upload a screenshot of companies to get started quickly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmptyCosmosState;
