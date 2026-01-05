'use client';

import React from 'react';
import { User, Bot } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/types/interview';

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isStreaming }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return null; // Don't render system messages
  }

  return (
    <div
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-fadeIn`}
    >
      {/* Avatar */}
      <div
        className={`
          flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
          ${isUser 
            ? 'bg-gradient-to-br from-cyan-500 to-blue-600' 
            : 'bg-gradient-to-br from-violet-500 to-purple-600'
          }
          shadow-lg
        `}
      >
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-white" />
        )}
      </div>

      {/* Message bubble */}
      <div
        className={`
          relative max-w-[80%] px-4 py-3 rounded-2xl
          ${isUser 
            ? 'bg-gradient-to-br from-cyan-600/90 to-blue-700/90 text-white rounded-tr-sm' 
            : 'bg-slate-700/80 text-slate-100 rounded-tl-sm border border-slate-600/50'
          }
          shadow-lg backdrop-blur-sm
        `}
      >
        {/* Subtle glow effect for AI messages */}
        {!isUser && (
          <div className="absolute inset-0 rounded-2xl rounded-tl-sm bg-gradient-to-br from-violet-500/5 to-purple-500/5 pointer-events-none" />
        )}

        <div className="relative">
          {/* Message content */}
          <div className="whitespace-pre-wrap break-words leading-relaxed">
            {message.content}
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse rounded-sm" />
            )}
          </div>

          {/* Timestamp */}
          <div
            className={`
              text-xs mt-2 opacity-60
              ${isUser ? 'text-right' : 'text-left'}
            `}
          >
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
};

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

export default ChatMessage;



