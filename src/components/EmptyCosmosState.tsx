import React, { useState } from 'react';
import { Upload, Sparkles } from 'lucide-react';
import { createUserProfileFromFiles } from '../utils/fileProcessing';

interface EmptyCosmosStateProps {
  userId: string;
  onDiscoveryComplete: (discoveryData: any) => void;
}

const EmptyCosmosState: React.FC<EmptyCosmosStateProps> = ({ userId, onDiscoveryComplete }) => {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [cmfFile, setCmfFile] = useState<File | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [error, setError] = useState('');

  const handleDiscover = async () => {
    if (!resumeFile || !cmfFile) {
      setError('Please upload both your CV and career goals files');
      return;
    }

    setIsDiscovering(true);
    setError('');

    try {
      console.log('🚀 Starting company discovery from empty state...');

      const discoveryData = await createUserProfileFromFiles(resumeFile, cmfFile, userId);

      console.log('✅ Discovery complete:', discoveryData);
      onDiscoveryComplete(discoveryData);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to discover companies';
      console.error('❌ Discovery failed:', err);
      setError(errorMessage);
      setIsDiscovering(false);
    }
  };

  if (isDiscovering) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <div className="text-center">
          <div className="relative">
            <div className="w-32 h-32 bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 rounded-full mx-auto animate-pulse" />
            <Sparkles className="w-12 h-12 text-yellow-200 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-spin" />
          </div>
          <h2 className="text-3xl font-bold text-white mt-8 animate-pulse">
            ✨ Discovering Your Universe ✨
          </h2>
          <p className="text-blue-200 mt-4 text-lg">
            Searching the web for companies matching your profile...
          </p>
          <p className="text-blue-300 mt-2 text-sm">
            This may take 30-60 seconds
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-2xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mx-auto mb-6 flex items-center justify-center animate-pulse">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Welcome to Your{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Career Cosmos
            </span>
          </h1>
          <p className="text-xl text-slate-600">
            Let's discover companies that match your career goals
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-blue-200 p-8">
          <h2 className="text-2xl font-semibold text-slate-900 mb-6 flex items-center">
            <Upload className="w-6 h-6 mr-3 text-blue-600" />
            Get Started
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* CV Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                📄 Your Resume/CV
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 transition-colors"
              />
              {resumeFile && (
                <p className="mt-2 text-sm text-green-600 flex items-center">
                  ✓ {resumeFile.name}
                </p>
              )}
            </div>

            {/* CMF Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                🎯 Career Goals & Requirements
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md"
                onChange={(e) => setCmfFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-600 hover:file:bg-purple-100 transition-colors"
              />
              {cmfFile && (
                <p className="mt-2 text-sm text-green-600 flex items-center">
                  ✓ {cmfFile.name}
                </p>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 font-medium mb-2">
                💡 What happens next?
              </p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• We'll analyze your resume and career goals</li>
                <li>• Search the web for 30-40 matching companies</li>
                <li>• Verify open roles at each company</li>
                <li>• Create your personalized company graph</li>
              </ul>
            </div>

            {/* Discover Button */}
            <button
              onClick={handleDiscover}
              disabled={!resumeFile || !cmfFile}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-3"
            >
              <Sparkles className="w-6 h-6" />
              <span>Discover My Companies</span>
            </button>
          </div>
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-slate-500 mt-6">
          Need help? Check our{' '}
          <a href="/docs" className="text-blue-600 hover:text-blue-700 underline">
            documentation
          </a>
          {' '}or{' '}
          <a href="mailto:support@yourapp.com" className="text-blue-600 hover:text-blue-700 underline">
            contact support
          </a>
        </p>
      </div>
    </div>
  );
};

export default EmptyCosmosState;
