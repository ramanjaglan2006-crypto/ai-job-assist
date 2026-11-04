'use client'

import { KeyboardEvent } from 'react'
import { Send } from 'lucide-react'

interface Props {
  value: string
  onChange: (v: string) => void
  onSend: (text: string) => void
  disabled: boolean
}

export default function ChatInput({ value, onChange, onSend, disabled }: Props) {
  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim()) onSend(value)
    }
  }

  return (
    <div className="bg-white border-t border-slate-200 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-end gap-3">
        <div className="flex-1 relative">
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKey}
            disabled={disabled}
            placeholder="Type a message... (e.g., 'Show me remote React jobs' or 'Apply me to job JOB001')"
            rows={1}
            className="w-full resize-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all disabled:opacity-50 max-h-32 overflow-y-auto scrollbar-thin"
            style={{ minHeight: '48px' }}
            onInput={e => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 128) + 'px'
            }}
          />
        </div>
        <button
          onClick={() => { if (value.trim()) onSend(value) }}
          disabled={disabled || !value.trim()}
          className="flex-shrink-0 w-11 h-11 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors shadow-sm"
        >
          <Send size={18} />
        </button>
      </div>
      <p className="text-center text-xs text-slate-400 mt-2">
        Press Enter to send · Shift+Enter for new line · Applications are recorded in this system only
      </p>
    </div>
  )
}
