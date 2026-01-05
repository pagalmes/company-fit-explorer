'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, CheckCircle, X, Loader2, AlertCircle } from 'lucide-react';
import type { ParsedResume } from '@/types/interview';

interface ResumeUploadProps {
  onResumeUploaded: (resume: ParsedResume) => void;
  onError?: (error: string) => void;
}

const ResumeUpload: React.FC<ResumeUploadProps> = ({ onResumeUploaded, onError }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    const validExtensions = /\.(pdf|doc|docx|txt)$/i;

    if (!validTypes.includes(file.type) && !file.name.match(validExtensions)) {
      return 'Please upload a PDF, DOC, DOCX, or TXT file.';
    }

    if (file.size > 10 * 1024 * 1024) {
      return 'File size must be less than 10MB.';
    }

    return null;
  };

  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const formData = new FormData();
      formData.append('resume', file);

      const response = await fetch('/api/interview/parse-resume', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload resume');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        onResumeUploaded(result.data);
      } else {
        throw new Error(result.error || 'Failed to parse resume');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload resume';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, [onResumeUploaded, onError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const validationError = validateFile(droppedFile);
      if (validationError) {
        setError(validationError);
        return;
      }
      setFile(droppedFile);
      uploadFile(droppedFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validationError = validateFile(selectedFile);
      if (validationError) {
        setError(validationError);
        return;
      }
      setFile(selectedFile);
      uploadFile(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!isUploading && !file) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        onChange={handleFileSelect}
        className="hidden"
        id="resume-upload"
      />

      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative p-8 rounded-2xl border-2 border-dashed cursor-pointer
          transition-all duration-300 ease-out
          ${isDragging 
            ? 'border-cyan-400 bg-cyan-500/10 scale-[1.02]' 
            : file 
              ? 'border-emerald-400/50 bg-emerald-500/10' 
              : 'border-slate-500/50 bg-slate-800/50 hover:border-cyan-400/50 hover:bg-slate-800/80'
          }
          ${isUploading ? 'pointer-events-none' : ''}
        `}
      >
        {/* Ambient glow effect */}
        <div className={`
          absolute inset-0 rounded-2xl opacity-20 blur-xl transition-opacity duration-500
          ${isDragging ? 'bg-cyan-500 opacity-40' : 'bg-transparent'}
        `} />

        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-40 animate-pulse"
              style={{
                left: `${15 + i * 15}%`,
                top: `${20 + (i % 3) * 25}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${2 + i * 0.2}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 text-center">
          {isUploading ? (
            <div className="space-y-4">
              <Loader2 className="w-16 h-16 mx-auto text-cyan-400 animate-spin" />
              <div className="space-y-2">
                <p className="text-lg font-medium text-white">Analyzing your resume...</p>
                <div className="w-48 h-2 mx-auto bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-slate-400">{uploadProgress}% complete</p>
              </div>
            </div>
          ) : file ? (
            <div className="space-y-4">
              <CheckCircle className="w-16 h-16 mx-auto text-emerald-400" />
              <div>
                <p className="text-lg font-semibold text-emerald-300">{file.name}</p>
                <p className="text-sm text-emerald-400/70">
                  {(file.size / 1024 / 1024).toFixed(2)} MB • Ready
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-400 
                         hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Remove and try another
              </button>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <AlertCircle className="w-16 h-16 mx-auto text-red-400" />
              <div>
                <p className="text-lg font-medium text-red-300">Upload failed</p>
                <p className="text-sm text-red-400/70">{error}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setError(null);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium 
                         bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Upload className={`w-16 h-16 mx-auto transition-transform duration-300 
                  ${isDragging ? 'text-cyan-400 scale-110 -translate-y-2' : 'text-slate-400'}`} 
                />
                {isDragging && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full border-2 border-cyan-400 animate-ping opacity-50" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-xl font-semibold text-white mb-2">
                  {isDragging ? 'Drop your resume here' : 'Upload your resume'}
                </p>
                <p className="text-slate-400">
                  Drag and drop or <span className="text-cyan-400 underline">browse</span> to upload
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <FileText className="w-4 h-4" />
                <span>PDF, DOC, DOCX, or TXT • Max 10MB</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeUpload;

