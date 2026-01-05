'use client';

import React, { useState } from 'react';
import { 
  Briefcase, 
  MapPin, 
  ExternalLink, 
  Star, 
  ChevronDown, 
  ChevronUp,
  Building2,
  Clock,
  CheckCircle2
} from 'lucide-react';
import type { MatchedJob } from '@/types/interview';

interface JobResultsProps {
  jobs: MatchedJob[];
  isLoading?: boolean;
}

const JobResults: React.FC<JobResultsProps> = ({ jobs, isLoading }) => {
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Finding matching jobs...</h3>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-800/60 rounded-xl p-4 animate-pulse">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-slate-700 rounded-xl" />
              <div className="flex-1 space-y-3">
                <div className="h-5 bg-slate-700 rounded w-3/4" />
                <div className="h-4 bg-slate-700 rounded w-1/2" />
                <div className="h-4 bg-slate-700 rounded w-1/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="p-8 text-center">
        <Briefcase className="w-16 h-16 mx-auto text-slate-500 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">No matching jobs found</h3>
        <p className="text-slate-400">
          We couldn't find jobs matching your preferences. Try broadening your search criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          Found {jobs.length} matching {jobs.length === 1 ? 'job' : 'jobs'}
        </h3>
        <span className="text-sm text-slate-400">Sorted by match score</span>
      </div>

      <div className="space-y-3">
        {jobs.map((job) => (
          <JobCard 
            key={job.job_id} 
            job={job} 
            isExpanded={expandedJobId === job.job_id}
            onToggle={() => setExpandedJobId(
              expandedJobId === job.job_id ? null : job.job_id
            )}
          />
        ))}
      </div>
    </div>
  );
};

interface JobCardProps {
  job: MatchedJob;
  isExpanded: boolean;
  onToggle: () => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, isExpanded, onToggle }) => {
  const matchScore = job.matchScore || 50;
  const scoreColor = matchScore >= 80 
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    : matchScore >= 60 
      ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
      : 'text-slate-400 bg-slate-500/10 border-slate-500/30';

  return (
    <div 
      className={`
        bg-slate-800/60 rounded-xl border border-slate-700/50
        hover:border-cyan-500/30 transition-all duration-300
        ${isExpanded ? 'ring-2 ring-cyan-500/20' : ''}
      `}
    >
      {/* Main card content */}
      <div className="p-4">
        <div className="flex gap-4">
          {/* Company icon */}
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-600 
                        rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-slate-300" />
          </div>

          {/* Job info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold text-white truncate">{job.title}</h4>
                <p className="text-sm text-slate-400">{job.company_name}</p>
              </div>
              
              {/* Match score */}
              <div className={`
                flex items-center gap-1 px-2 py-1 rounded-lg border text-sm font-medium
                ${scoreColor}
              `}>
                <Star className="w-3.5 h-3.5" />
                {matchScore}%
              </div>
            </div>

            {/* Location and date */}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {job.location}
                </span>
              )}
              {job.scraped_at && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDate(job.scraped_at)}
                </span>
              )}
            </div>

            {/* Match reasons */}
            {job.matchReasons && job.matchReasons.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {job.matchReasons.slice(0, 2).map((reason, idx) => (
                  <span 
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs 
                             bg-cyan-500/10 text-cyan-300 rounded-full"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {reason}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Expand/collapse button */}
        <button
          onClick={onToggle}
          className="flex items-center gap-1 mt-3 text-sm text-slate-400 hover:text-white transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show more
            </>
          )}
        </button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-700/50">
          <div className="pt-4 space-y-4">
            {/* Description */}
            {job.description && (
              <div>
                <h5 className="text-sm font-medium text-slate-300 mb-2">Description</h5>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {job.description.length > 500 
                    ? job.description.substring(0, 500) + '...' 
                    : job.description
                  }
                </p>
              </div>
            )}

            {/* Requirements */}
            {job.requirements && (
              <div>
                <h5 className="text-sm font-medium text-slate-300 mb-2">Requirements</h5>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {job.requirements}
                </p>
              </div>
            )}

            {/* Apply button */}
            {job.application_url && (
              <a
                href={job.application_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 
                         bg-gradient-to-r from-cyan-500 to-blue-600 
                         hover:from-cyan-400 hover:to-blue-500
                         text-white font-medium rounded-lg
                         transition-all duration-200 shadow-lg shadow-cyan-500/20"
              >
                <ExternalLink className="w-4 h-4" />
                Apply Now
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString();
  } catch {
    return 'Recently';
  }
}

export default JobResults;



