'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  MessageSquare, 
  Briefcase, 
  ChevronLeft,
  AlertCircle,
  CheckCircle,
  Mic,
  Orbit
} from 'lucide-react';
import { ResumeUpload, ChatInterface, VoiceControls, JobResults } from '@/components/interview';
import type { ParsedResume, MatchedJob, CandidatePreferences } from '@/types/interview';
import { 
  parseInterviewSummary, 
  createExplorationStateFromInterview,
  saveInterviewCMFToStorage 
} from '@/utils/interviewToCMF';

type Stage = 'upload' | 'chatting' | 'matching' | 'results';

export default function InterviewPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('upload');
  const [resume, setResume] = useState<ParsedResume | null>(null);
  const [jobs, setJobs] = useState<MatchedJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceInput, setVoiceInput] = useState<string>('');
  const [lastAIMessage, setLastAIMessage] = useState<string>('');
  const [extractedPreferences, setExtractedPreferences] = useState<CandidatePreferences | null>(null);
  const [interviewSummary, setInterviewSummary] = useState<string>('');
  const [providerStatus, setProviderStatus] = useState<{
    status: 'unknown' | 'connected' | 'disconnected';
    provider?: string;
    model?: string;
  }>({ status: 'unknown' });

  // Check LLM provider status on mount
  React.useEffect(() => {
    checkProviderStatus();
  }, []);

  const checkProviderStatus = async () => {
    try {
      const response = await fetch('/api/interview/chat');
      const data = await response.json();
      setProviderStatus({
        status: data.status === 'ok' ? 'connected' : 'disconnected',
        provider: data.provider,
        model: data.model,
      });
    } catch {
      setProviderStatus({ status: 'disconnected' });
    }
  };

  const handleResumeUploaded = useCallback((parsedResume: ParsedResume) => {
    setResume(parsedResume);
    setStage('chatting');
    setError(null);
  }, []);

  const handleInterviewComplete = useCallback(async (preferencesSummary: string) => {
    setStage('matching');
    setIsLoadingJobs(true);
    setError(null);
    setInterviewSummary(preferencesSummary);

    // Parse the interview summary to extract structured preferences
    const parsedPrefs = parseInterviewSummary(preferencesSummary);
    const fullPreferences: CandidatePreferences = {
      targetRoleLevel: parsedPrefs.targetRoleLevel || '',
      targetFunction: parsedPrefs.targetFunction || '',
      workTypePreferences: parsedPrefs.workTypePreferences || [],
      companyStagePreference: parsedPrefs.companyStagePreference || [],
      targetCompensation: parsedPrefs.targetCompensation,
      keyExperiences: parsedPrefs.keyExperiences || [],
      preferredLocations: parsedPrefs.preferredLocations || [],
      remotePreference: parsedPrefs.remotePreference || 'flexible',
      scheduleFlexibility: parsedPrefs.scheduleFlexibility,
      cultureValues: parsedPrefs.cultureValues || [],
      teamDynamics: parsedPrefs.teamDynamics || [],
      mustHaves: parsedPrefs.mustHaves || { other: [] },
      niceToHaves: parsedPrefs.niceToHaves || { other: [] },
      industries: parsedPrefs.industries || [],
      targetRoles: parsedPrefs.targetRoles || [],
    };
    setExtractedPreferences(fullPreferences);

    try {
      const response = await fetch('/api/interview/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: preferencesSummary,
          resumeSkills: resume?.skills || [],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to search for jobs');
      }

      const data = await response.json();
      setJobs(data.jobs || []);
      setStage('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find matching jobs');
      setStage('chatting'); // Go back to chat on error
    } finally {
      setIsLoadingJobs(false);
    }
  }, [resume]);

  const handleVoiceTranscript = useCallback((text: string) => {
    setVoiceInput(text);
  }, []);

  const handleVoiceInputProcessed = useCallback(() => {
    setVoiceInput('');
  }, []);

  const handleBack = () => {
    if (stage === 'chatting') {
      setStage('upload');
      setResume(null);
    } else if (stage === 'results') {
      setStage('chatting');
    }
  };

  // Navigate to cosmos explorer with the extracted CMF profile
  const handleExploreCosmos = useCallback(() => {
    if (!extractedPreferences) {
      setError('No preferences extracted. Please complete the interview first.');
      return;
    }

    // Create exploration state from interview data
    const explorationState = createExplorationStateFromInterview(
      extractedPreferences,
      resume,
      [], // No companies yet - cosmos will find them
      `interview-${Date.now()}`
    );

    // Save to localStorage for cosmos to pick up
    saveInterviewCMFToStorage(explorationState);

    // Navigate to the main cosmos explorer
    router.push('/?from=interview');
  }, [extractedPreferences, resume, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/50 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {stage !== 'upload' && (
                <button
                  onClick={handleBack}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-400" />
                </button>
              )}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-violet-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white">Career Interview</h1>
                  <p className="text-xs text-slate-400">
                    {providerStatus.model 
                      ? `Powered by ${providerStatus.model}` 
                      : 'AI-powered career matching'}
                  </p>
                </div>
              </div>
            </div>

            {/* Status indicators */}
            <div className="flex items-center gap-4">
              {/* LLM Provider status */}
              <button
                onClick={checkProviderStatus}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors hover:opacity-80
                ${providerStatus.status === 'connected' 
                  ? 'bg-emerald-500/10 text-emerald-400' 
                  : providerStatus.status === 'disconnected'
                    ? 'bg-red-500/10 text-red-400'
                    : 'bg-slate-500/10 text-slate-400'
                }`}
                title={providerStatus.model ? `Model: ${providerStatus.model}` : 'Click to retry'}
              >
                {providerStatus.status === 'connected' ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5" />
                )}
                <span>
                  {providerStatus.status === 'connected' 
                    ? `${providerStatus.provider?.charAt(0).toUpperCase()}${providerStatus.provider?.slice(1) || 'LLM'} connected`
                    : providerStatus.status === 'disconnected'
                      ? 'No LLM - Click to retry'
                      : 'Checking...'}
                </span>
              </button>

              {/* Stage indicator */}
              <StageIndicator currentStage={stage} />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-6xl mx-auto">
        {/* Error banner */}
        {error && (
          <div className="mx-4 mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Upload Stage */}
        {stage === 'upload' && (
          <div className="px-4 py-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Let's Find Your{' '}
                <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                  Dream Role
                </span>
              </h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                Upload your resume and we'll have a conversation to understand exactly what 
                you're looking for in your next career move.
              </p>
            </div>

            <ResumeUpload 
              onResumeUploaded={handleResumeUploaded}
              onError={setError}
            />

            {/* Features preview */}
            <div className="mt-16 grid md:grid-cols-3 gap-6">
              <FeatureCard
                icon={<MessageSquare className="w-6 h-6" />}
                title="Conversational Interview"
                description="Natural chat-based interview to understand your goals, must-haves, and preferences."
              />
              <FeatureCard
                icon={<Mic className="w-6 h-6" />}
                title="Voice Enabled"
                description="Speak naturally - our AI listens and responds with voice too."
              />
              <FeatureCard
                icon={<Briefcase className="w-6 h-6" />}
                title="Smart Job Matching"
                description="Get matched with jobs that align with your unique career aspirations."
              />
            </div>

            {/* LLM setup hint */}
            {providerStatus.status === 'disconnected' && (
              <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl max-w-2xl mx-auto">
                <h4 className="font-medium text-amber-300 mb-2">Setup Required</h4>
                <p className="text-sm text-amber-200/70 mb-3">
                  To use the AI interview, set up one of these providers:
                </p>
                <div className="bg-slate-900/50 p-3 rounded-lg font-mono text-sm text-slate-300">
                  <p># Option 1: Groq (free, easiest)</p>
                  <p className="text-cyan-400">Get API key at https://console.groq.com</p>
                  <p className="text-cyan-400">Add GROQ_API_KEY to .env.local</p>
                  <p className="mt-2"># Option 2: Ollama (local)</p>
                  <p className="text-cyan-400">brew install ollama && ollama serve</p>
                  <p className="text-cyan-400">ollama pull llama3.2:3b</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chat Stage */}
        {stage === 'chatting' && resume && (
          <div className="h-[calc(100vh-140px)] flex flex-col">
            {/* Resume summary bar */}
            <div className="px-4 py-3 border-b border-slate-800/50 bg-slate-900/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {resume.name !== 'Unknown' ? resume.name : 'Resume loaded'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {resume.skills.length} skills detected • {resume.experience.length} experiences
                    </p>
                  </div>
                </div>
                
                {/* Voice controls */}
                <VoiceControls
                  onTranscript={handleVoiceTranscript}
                  textToSpeak={lastAIMessage}
                  onSpeakingComplete={() => setLastAIMessage('')}
                />
              </div>
            </div>

            {/* Chat interface */}
            <div className="flex-1 overflow-hidden">
              <ChatInterface
                resume={resume}
                onInterviewComplete={handleInterviewComplete}
                voiceInput={voiceInput}
                onVoiceInputProcessed={handleVoiceInputProcessed}
              />
            </div>
          </div>
        )}

        {/* Matching Stage (Loading) */}
        {stage === 'matching' && (
          <div className="px-4 py-16 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 rounded-2xl mb-6">
              <Briefcase className="w-10 h-10 text-cyan-400 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Finding Your Perfect Matches
            </h2>
            <p className="text-slate-400 max-w-md mx-auto">
              We're searching through available positions to find jobs that align with your 
              career goals and preferences...
            </p>
            <div className="mt-8 flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Results Stage */}
        {stage === 'results' && (
          <div className="pb-8">
            <div className="px-4 py-6 border-b border-slate-800/50">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Your Matched Opportunities
                  </h2>
                  <p className="text-slate-400">
                    Based on your interview, here are the jobs that best match your preferences.
                  </p>
                </div>
                
                {/* Explore in Cosmos button */}
                <button
                  onClick={handleExploreCosmos}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 
                    hover:from-violet-500 hover:to-cyan-500 text-white font-medium rounded-xl 
                    transition-all duration-200 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40
                    hover:scale-105"
                >
                  <Orbit className="w-5 h-5" />
                  <span>Explore in Cosmos</span>
                </button>
              </div>
              
              {/* CMF Summary Card */}
              {extractedPreferences && (
                <div className="mt-6 p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                  <h3 className="text-sm font-medium text-cyan-400 mb-3">Your Career Profile</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Target Role:</span>
                      <span className="ml-2 text-white">
                        {extractedPreferences.targetRoleLevel} {extractedPreferences.targetFunction}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Work Style:</span>
                      <span className="ml-2 text-white capitalize">
                        {extractedPreferences.remotePreference}
                      </span>
                    </div>
                    {extractedPreferences.preferredLocations?.length > 0 && (
                      <div>
                        <span className="text-slate-500">Locations:</span>
                        <span className="ml-2 text-white">
                          {extractedPreferences.preferredLocations.join(', ')}
                        </span>
                      </div>
                    )}
                    {extractedPreferences.companyStagePreference?.length > 0 && (
                      <div>
                        <span className="text-slate-500">Company Stage:</span>
                        <span className="ml-2 text-white">
                          {extractedPreferences.companyStagePreference.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                  {extractedPreferences.mustHaves?.other?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                      <span className="text-slate-500 text-sm">Must-Haves ({extractedPreferences.mustHaves.other.length}):</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {extractedPreferences.mustHaves.other.slice(0, 8).map((item, i) => (
                          <span key={i} className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-lg">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <JobResults jobs={jobs} isLoading={isLoadingJobs} />
          </div>
        )}
      </main>
    </div>
  );
}

// Stage indicator component
function StageIndicator({ currentStage }: { currentStage: Stage }) {
  const stages: { key: Stage; label: string; icon: React.ReactNode }[] = [
    { key: 'upload', label: 'Upload', icon: <Sparkles className="w-4 h-4" /> },
    { key: 'chatting', label: 'Interview', icon: <MessageSquare className="w-4 h-4" /> },
    { key: 'results', label: 'Results', icon: <Briefcase className="w-4 h-4" /> },
  ];

  const currentIndex = stages.findIndex(s => s.key === currentStage || (currentStage === 'matching' && s.key === 'results'));

  return (
    <div className="hidden md:flex items-center gap-2">
      {stages.map((stage, index) => (
        <React.Fragment key={stage.key}>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${index <= currentIndex 
                ? 'bg-cyan-500/20 text-cyan-400' 
                : 'bg-slate-800/50 text-slate-500'
              }`}
          >
            {stage.icon}
            <span>{stage.label}</span>
          </div>
          {index < stages.length - 1 && (
            <div className={`w-4 h-0.5 ${index < currentIndex ? 'bg-cyan-500/50' : 'bg-slate-700'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// Feature card component
function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="p-6 bg-slate-800/30 border border-slate-700/50 rounded-xl hover:border-cyan-500/30 transition-colors">
      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 rounded-xl flex items-center justify-center text-cyan-400 mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  );
}

