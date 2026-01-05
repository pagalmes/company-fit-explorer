'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, RefreshCw } from 'lucide-react';
import ChatMessage from './ChatMessage';
import type { ChatMessage as ChatMessageType, ParsedResume, OllamaMessage } from '@/types/interview';

interface ChatInterfaceProps {
  resume: ParsedResume;
  onInterviewComplete: (preferences: string) => void;
  voiceInput?: string;
  onVoiceInputProcessed?: () => void;
}

const INITIAL_MESSAGE = `Hello! I've reviewed your resume and I'm excited to learn more about what you're looking for in your next role. Let's have a conversation to understand your career goals better.

To start, could you tell me what type of position you're most interested in right now? Are you looking to continue in a similar role, or are you interested in exploring something new?`;

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  resume, 
  onInterviewComplete,
  voiceInput,
  onVoiceInputProcessed 
}) => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exchangeCount, setExchangeCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Generate resume context for the AI
  const resumeContext = useCallback(() => {
    const parts = [];
    if (resume.name && resume.name !== 'Unknown') {
      parts.push(`Name: ${resume.name}`);
    }
    if (resume.skills.length > 0) {
      parts.push(`Skills: ${resume.skills.join(', ')}`);
    }
    if (resume.experience.length > 0) {
      const recentExp = resume.experience.slice(0, 3);
      const expStr = recentExp.map(e => `${e.title} at ${e.company}`).join('; ');
      parts.push(`Recent Experience: ${expStr}`);
    }
    if (resume.summary) {
      parts.push(`Summary: ${resume.summary.substring(0, 300)}`);
    }
    return parts.join('\n');
  }, [resume]);

  // Initialize with greeting
  useEffect(() => {
    const greeting: ChatMessageType = {
      id: 'initial',
      role: 'assistant',
      content: INITIAL_MESSAGE,
      timestamp: new Date(),
    };
    setMessages([greeting]);
  }, []);

  // Handle voice input - append to existing text instead of replacing
  useEffect(() => {
    if (voiceInput && voiceInput.trim()) {
      setInputValue(prev => {
        // If there's existing text, add a space before appending
        if (prev.trim()) {
          return prev.trim() + ' ' + voiceInput.trim();
        }
        return voiceInput.trim();
      });
      onVoiceInputProcessed?.();
      // Focus the input after voice input
      inputRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceInput]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSubmit = async (e: React.FormEvent, overrideInput?: string) => {
    e.preventDefault();
    const messageText = overrideInput || inputValue.trim();
    
    if (!messageText || isLoading) return;

    setError(null);
    setInputValue('');

    // Add user message
    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setStreamingContent('');

    try {
      // Prepare messages for API
      const apiMessages: OllamaMessage[] = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }));
      
      apiMessages.push({ role: 'user', content: messageText });

      const response = await fetch('/api/interview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          resumeContext: resumeContext(),
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullContent += parsed.content;
                  setStreamingContent(fullContent);
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      // Add assistant message
      const assistantMessage: ChatMessageType = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: fullContent,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setStreamingContent('');
      setExchangeCount(prev => prev + 1);

      // Check if ready for job search
      if (fullContent.includes('[READY_FOR_JOB_SEARCH]')) {
        // Extract preferences summary (everything before the marker)
        const preferencesSummary = fullContent.replace('[READY_FOR_JOB_SEARCH]', '').trim();
        setTimeout(() => {
          onInterviewComplete(preferencesSummary);
        }, 1500);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const retryLastMessage = () => {
    if (messages.length >= 2) {
      const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
      if (lastUserMessage) {
        // Remove last messages and retry
        setMessages(prev => prev.slice(0, -1));
        setInputValue(lastUserMessage.content);
      }
    }
    setError(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {/* Streaming message */}
        {streamingContent && (
          <ChatMessage
            message={{
              id: 'streaming',
              role: 'assistant',
              content: streamingContent,
              timestamp: new Date(),
            }}
            isStreaming
          />
        )}

        {/* Loading indicator */}
        {isLoading && !streamingContent && (
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
            <div className="bg-slate-700/80 px-4 py-3 rounded-2xl rounded-tl-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-center justify-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <span className="text-red-400">{error}</span>
            <button
              onClick={retryLastMessage}
              className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-red-300 
                       hover:bg-red-500/20 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Progress indicator */}
      <div className="px-4 py-2 border-t border-slate-700/50">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Interview Progress</span>
          <span>{Math.min(exchangeCount, 7)} / ~7 questions</span>
        </div>
        <div className="mt-1 h-1 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-500"
            style={{ width: `${Math.min((exchangeCount / 7) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-700/50">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your response..."
            disabled={isLoading}
            rows={1}
            className="w-full px-4 py-3 pr-12 bg-slate-800/80 border border-slate-600/50 rounded-xl
                     text-white placeholder-slate-400 resize-none
                     focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200"
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 
                     bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg
                     text-white disabled:opacity-50 disabled:cursor-not-allowed
                     hover:from-cyan-400 hover:to-blue-500
                     transition-all duration-200 shadow-lg"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  );
};

export default ChatInterface;

