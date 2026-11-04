'use client'

import ReactMarkdown from 'react-markdown'
import { Message } from '@/lib/types'
import JobCard from './JobCard'
import { Bot, User } from 'lucide-react'

interface Props {
  message: Message
  onApply: (jobId: string, jobTitle: string) => Promise<void>
  sessionId: string
}

export default function MessageBubble({ message, onApply, sessionId }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 animate-slide-up ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm mt-1">
          <Bot size={16} className="text-white" />
        </div>
      )}

      <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-3`}>
        {/* Message text */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
            isUser
              ? 'bg-indigo-600 text-white rounded-tr-sm'
              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-strong:text-slate-900 prose-code:text-indigo-600 prose-code:bg-indigo-50 prose-code:px-1 prose-code:rounded prose-blockquote:border-l-indigo-300 prose-blockquote:text-slate-500">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Job Cards */}
        {message.jobCards && message.jobCards.length > 0 && (
          <div className="w-full space-y-3">
            {message.jobCards.map(card => (
              <JobCard key={card.job.id} card={card} onApply={onApply} />
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shadow-sm mt-1">
          <User size={16} className="text-slate-600" />
        </div>
      )}
    </div>
  )
}
