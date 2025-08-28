import React, { useState, useEffect } from 'react';
import DreamyFirstContact from './DreamyFirstContact';
import CMFGraphExplorerNew from './CMFGraphExplorerNew';
import { useFirstTimeExperience } from '../hooks/useFirstTimeExperience';
import { createUserProfileFromFiles } from '../utils/fileProcessing';
import { UserCMF, UserExplorationState } from '../types';
import { activeUserProfile } from '../data/companies';

const AppContainer: React.FC = () => {
  const { isFirstTime, hasChecked, markAsVisited } = useFirstTimeExperience();
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserExplorationState | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Initialize with default profile once checked
  useEffect(() => {
    if (hasChecked && !isFirstTime) {
      setUserProfile(activeUserProfile);
    }
  }, [hasChecked, isFirstTime]);

  const handleFirstTimeComplete = async (resumeFile: File, cmfFile: File) => {
    setIsLoading(true);
    
    try {
      // Process the uploaded files to create user profile
      const newUserCMF: UserCMF = await createUserProfileFromFiles(resumeFile, cmfFile, activeUserProfile.id);
      
      // Create new user exploration state with the processed profile
      const newUserProfile: UserExplorationState = {
        ...activeUserProfile,
        cmf: newUserCMF,
        name: newUserCMF.name
      };
      
      // Mark as visited
      markAsVisited();
      
      // Simulate processing time for dramatic effect
      setTimeout(() => {
        setUserProfile(newUserProfile);
        setIsLoading(false);
        setIsTransitioning(true);
        
        // After a brief transition, remove transition state
        setTimeout(() => {
          setIsTransitioning(false);
        }, 1000);
      }, 3000);
      
    } catch (error) {
      console.error('Error processing files:', error);
      
      // Fallback to default profile if processing fails
      setTimeout(() => {
        setUserProfile(activeUserProfile);
        markAsVisited();
        setIsLoading(false);
        setIsTransitioning(true);
        
        setTimeout(() => {
          setIsTransitioning(false);
        }, 1000);
      }, 2000);
    }
  };

  // Loading state during universe generation
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center relative overflow-hidden">
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
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            >
              <div className="w-1 h-1 bg-blue-300 rounded-full" />
            </div>
          ))}
        </div>
        
        <div className="text-center px-4">
          <div className="relative mb-8">
            <div className="w-32 h-32 bg-gradient-to-br from-orange-300 via-pink-400 to-purple-500 rounded-full mx-auto animate-pulse shadow-2xl" />
            <div className="absolute inset-0 scale-150 opacity-20">
              <div className="w-32 h-32 bg-gradient-to-r from-orange-400 to-purple-500 rounded-full animate-spin" style={{ animationDuration: '8s' }} />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-6">
            🌟 Generating Your Universe 🌟
          </h1>
          <p className="text-xl text-blue-200 mb-8 max-w-2xl mx-auto">
            Analyzing your profile and mapping perfect company matches...
          </p>
          
          <div className="flex justify-center space-x-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 bg-blue-300 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show dreamy first contact for first-time users
  if (isFirstTime && hasChecked) {
    return <DreamyFirstContact onComplete={handleFirstTimeComplete} />;
  }

  // Transition state - smooth fade from dark to light
  if (isTransitioning) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-0 animate-pulse" 
             style={{ animationDuration: '2s', animationFillMode: 'forwards' }} />
        
        <div className="text-center px-4 relative z-10">
          <div className="w-24 h-24 bg-gradient-to-br from-orange-300 via-pink-400 to-purple-500 rounded-full mx-auto animate-pulse shadow-2xl mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4 animate-fade-out">
            🚀 Launching Your Career Universe
          </h1>
          <p className="text-lg text-blue-200 animate-fade-out">
            Preparing your personalized company exploration...
          </p>
        </div>
      </div>
    );
  }

  // Floating stars component for cosmic background
  const FloatingStars = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-pulse opacity-30"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 2}s`
          }}
        >
          <div className="w-1 h-1 bg-blue-300 rounded-full" />
        </div>
      ))}
    </div>
  );

  // Show the main graph explorer for returning users or after completion
  if (userProfile && hasChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden transition-all duration-1000">
        <FloatingStars />
        
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
            backgroundSize: '50px 50px'
          }} />
        </div>

        <div className="relative">
          <CMFGraphExplorerNew />
        </div>
      </div>
    );
  }

  // Loading state while checking first-time status
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-orange-300 to-purple-400 rounded-full mx-auto animate-pulse shadow-2xl mb-4" />
        <p className="text-white text-lg">Initializing...</p>
      </div>
    </div>
  );
};

export default AppContainer;