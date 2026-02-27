import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Star, Sparkles } from 'lucide-react';
import appPreviewImage from '../../assets/images/cosmos-ui.jpg';

interface Slide {
  type: 'text' | 'screenshot';
  headline: string;
  bullets: string[];
}

const slides: Slide[] = [
  {
    type: 'text',
    headline: 'We get it. Job searching is brutal.',
    bullets: [
      'The endless applications into the void with no response.',
      'The pressure to "do more" even when nothing seems to work.',
      'The fear that the right opportunity is out there and you just can\'t find it.',
      'You deserve better than the grind. Cosmos is in your corner.',
    ],
  },
  {
    type: 'text',
    headline: 'A smarter approach, backed by evidence.',
    bullets: [
      'Spray-and-pray doesn\'t work — 847 applications, zero offers. Targeted outreach? 75% offer rate.',
      '80% of jobs are filled through networking, not applications.',
      'Candidate-Market Fit — the intersection of what you want and what the market wants — is the foundation.',
      'We didn\'t invent the playbook. We just make it easier to follow.',
    ],
  },
  {
    type: 'screenshot',
    headline: 'This is what we built for you.',
    bullets: [
      'Your personalized universe of companies that match your goals, values, and aspirations.',
      'You\'re the sun at the center — opportunities orbit around you.',
      'Clear next steps, visible progress, and no more guessing.',
    ],
  },
];

const SLIDE_DURATION = 8000;

const UniverseLoadingScreen: React.FC = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
      setProgress(0);
    }, SLIDE_DURATION);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const tick = setInterval(() => {
      setProgress((prev) => Math.min(prev + 100 / (SLIDE_DURATION / 50), 100));
    }, 50);
    return () => clearInterval(tick);
  }, [activeSlide]);

  const slide = slides[activeSlide];

  return (
    <div
      className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex flex-col items-center justify-center relative overflow-hidden"
      style={{ minHeight: '100vh' }}
    >
      {/* Floating stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-pulse"
            style={{
              left: `${(i * 37 + 13) % 100}%`,
              top: `${(i * 53 + 7) % 100}%`,
              opacity: 0.15 + (i % 5) * 0.06,
              animationDelay: `${(i * 0.7) % 4}s`,
              animationDuration: `${3 + (i % 3)}s`,
            }}
          >
            <Star className="w-2 h-2 text-blue-300 fill-current" />
          </div>
        ))}
      </div>

      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600 rounded-full opacity-[0.07] blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-3xl mx-auto px-6">
        {/* Spark + title — always visible */}
        <div className="text-center mb-8">
          <div className="relative mx-auto mb-6 w-16 h-16">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-300 via-pink-400 to-purple-500 rounded-full shadow-2xl" />
            <div className="absolute inset-2 bg-gradient-to-br from-yellow-200 via-orange-300 to-pink-400 rounded-full animate-pulse" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-4 bg-gradient-to-br from-yellow-100 via-orange-200 to-yellow-300 rounded-full animate-pulse" style={{ animationDelay: '1s', animationDuration: '3s' }} />
            <div className="absolute inset-0 scale-150 bg-gradient-to-r from-orange-400 to-purple-500 rounded-full opacity-20 animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />
            <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-yellow-100 animate-bounce" style={{ animationDuration: '2s' }} />
          </div>
        </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
            Generating Your Universe
          </h1>
          <p className="text-blue-200/60 text-sm">
            This usually takes 30–60 seconds
          </p>
        </div>

        {/* Slide content area */}
        <div className="relative min-h-[360px]">
          {slides.map((s, i) => {
            const isActive = i === activeSlide;
            return (
              <div
                key={i}
                className={`absolute inset-0 transition-all duration-700 ${
                  isActive
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-6 pointer-events-none'
                }`}
              >
                {s.type === 'text' ? (
                  <div className="text-center">
                    <h2 className="text-xl md:text-2xl font-semibold text-white mb-6">
                      {s.headline}
                    </h2>
                    <ul className="space-y-4 max-w-xl mx-auto text-left">
                      {s.bullets.map((bullet, j) => (
                        <li key={j} className="flex gap-3 items-start">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-orange-400 to-purple-400 flex-shrink-0" />
                          <span className="text-blue-100/80 text-base leading-relaxed">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="text-center">
                    <h2 className="text-xl md:text-2xl font-semibold text-white mb-5">
                      {s.headline}
                    </h2>
                    <div className="rounded-xl overflow-hidden shadow-2xl border border-white/10 mb-5 max-w-lg mx-auto">
                      <Image
                        src={appPreviewImage}
                        alt="Your Cosmos — personalized company universe"
                        className="w-full h-auto"
                        placeholder="blur"
                      />
                    </div>
                    <ul className="space-y-2 max-w-xl mx-auto text-left">
                      {s.bullets.map((bullet, j) => (
                        <li key={j} className="flex gap-3 items-start">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-orange-400 to-purple-400 flex-shrink-0" />
                          <span className="text-blue-100/80 text-sm leading-relaxed">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Slide indicators */}
        <div className="flex justify-center gap-2 mt-8">
          {slides.map((_, i) => (
            <div
              key={i}
              className="relative h-1.5 rounded-full overflow-hidden bg-white/10"
              style={{ width: i === activeSlide ? '2.5rem' : '0.75rem', transition: 'width 0.3s' }}
            >
              {i === activeSlide && (
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-400 to-purple-400 rounded-full"
                  style={{ width: `${progress}%`, transition: 'width 50ms linear' }}
                />
              )}
              {i < activeSlide && (
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-purple-400 rounded-full" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UniverseLoadingScreen;
