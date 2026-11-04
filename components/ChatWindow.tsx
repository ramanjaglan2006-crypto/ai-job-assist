'use client'

import { useRef, useEffect } from 'react'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import { Message } from '@/lib/types'

interface Props {
  messages: Message[]
  isLoading: boolean
  onSend: (text: string) => void
  inputValue: string
  setInputValue: (v: string) => void
  sessionId: string
  onApply: (jobId: string, jobTitle: string) => Promise<void>
}

export default function ChatWindow({ messages, isLoading, onSend, inputValue, setInputValue, sessionId, onApply }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6 space-y-4">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} onApply={onApply} sessionId={sessionId} />
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-5">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSend={onSend}
        disabled={isLoading}
      />
    </div>
  )
}
