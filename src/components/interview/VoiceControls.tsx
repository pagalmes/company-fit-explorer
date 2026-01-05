'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';

interface VoiceControlsProps {
  onTranscript: (text: string) => void;
  textToSpeak?: string;
  onSpeakingComplete?: () => void;
  disabled?: boolean;
}

// Extend Window interface for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognition;
    SpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  onstart: () => void;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item: (index: number) => SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

const VoiceControls: React.FC<VoiceControlsProps> = ({
  onTranscript,
  textToSpeak,
  onSpeakingComplete,
  disabled = false,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check browser support
  useEffect(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setIsSupported(false);
      setError('Speech recognition not supported in this browser');
    }
  }, []);

  // Initialize speech recognition
  const initRecognition = useCallback(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return null;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setTranscript(interimTranscript || finalTranscript);

      if (finalTranscript) {
        onTranscript(finalTranscript.trim());
        setTranscript('');
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        setError('No speech detected. Try again.');
      } else if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please enable it in settings.');
      } else {
        setError(`Error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    return recognition;
  }, [onTranscript]);

  // Handle listening toggle
  const toggleListening = () => {
    if (!isSupported) {
      setError('Speech recognition not supported');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (!recognitionRef.current) {
        recognitionRef.current = initRecognition();
      }
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error('Failed to start recognition:', err);
        setError('Failed to start speech recognition');
      }
    }
  };

  // Text-to-speech using Resemble API
  const speakText = useCallback(async (text: string) => {
    if (!voiceEnabled || !text) return;

    setIsSpeaking(true);
    setError(null);

    try {
      const response = await fetch('/api/interview/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.pause();
      }

      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => {
        setIsSpeaking(false);
        onSpeakingComplete?.();
        URL.revokeObjectURL(audioUrl);
      };
      audioRef.current.onerror = () => {
        setIsSpeaking(false);
        setError('Failed to play audio');
        URL.revokeObjectURL(audioUrl);
      };

      await audioRef.current.play();
    } catch (err) {
      console.error('TTS error:', err);
      setIsSpeaking(false);
      // Fallback to browser TTS
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.onend = () => {
          setIsSpeaking(false);
          onSpeakingComplete?.();
        };
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
      }
    }
  }, [voiceEnabled, onSpeakingComplete]);


  // Speak when new text is provided
  useEffect(() => {
    if (textToSpeak && voiceEnabled) {
      speakText(textToSpeak);
    }
  }, [textToSpeak, voiceEnabled, speakText]);

  // Stop speaking
  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      stopSpeaking();
    };
  }, []);

  return (
    <div className="flex items-center gap-3">
      {/* Speech-to-text button */}
      <button
        onClick={toggleListening}
        disabled={disabled || !isSupported}
        className={`
          relative p-3 rounded-xl transition-all duration-300
          ${isListening 
            ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30' 
            : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        title={isListening ? 'Stop listening' : 'Start voice input'}
      >
        {isListening ? (
          <>
            <MicOff className="w-5 h-5" />
            {/* Pulsing ring animation */}
            <span className="absolute inset-0 rounded-xl border-2 border-red-400 animate-ping opacity-50" />
          </>
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>

      {/* Text-to-speech toggle */}
      <button
        onClick={() => {
          if (isSpeaking) {
            stopSpeaking();
          } else {
            setVoiceEnabled(!voiceEnabled);
          }
        }}
        disabled={disabled}
        className={`
          p-3 rounded-xl transition-all duration-300
          ${isSpeaking 
            ? 'bg-violet-500 hover:bg-violet-600 text-white shadow-lg shadow-violet-500/30' 
            : voiceEnabled 
              ? 'bg-slate-700 hover:bg-slate-600 text-cyan-400' 
              : 'bg-slate-800 hover:bg-slate-700 text-slate-500'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        title={isSpeaking ? 'Stop speaking' : voiceEnabled ? 'Disable voice' : 'Enable voice'}
      >
        {isSpeaking ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : voiceEnabled ? (
          <Volume2 className="w-5 h-5" />
        ) : (
          <VolumeX className="w-5 h-5" />
        )}
      </button>

      {/* Transcript display */}
      {transcript && (
        <div className="flex-1 px-3 py-2 bg-slate-800/80 rounded-lg border border-cyan-500/30">
          <p className="text-sm text-cyan-300 italic">{transcript}</p>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="px-3 py-2 bg-red-500/10 rounded-lg border border-red-500/30">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
};

export default VoiceControls;

