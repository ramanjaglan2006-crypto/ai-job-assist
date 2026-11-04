'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import ChatWindow from '@/components/ChatWindow'
import ResumeUploadModal from '@/components/ResumeUploadModal'
import { Message, ParsedResume } from '@/lib/types'
import { v4 as uuidv4 } from 'uuid'
import { Bot, Upload, Briefcase, FileText, ChevronRight } from 'lucide-react'

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `👋 **Welcome to the Hidani Tech AI Job Assistant!**

I'm your intelligent career companion. Here's what I can do for you:

📄 **Upload your resume** → I'll extract your profile (name, skills, experience, education)
🎯 **Get job recommendations** → Matched to your skills and experience with specific reasons
💬 **Refine with natural language** → "Show only remote roles" or "Jobs needing React"
✅ **Track applications** → Ask to apply and I'll record it; check your applications anytime

**To get started, upload your resume using the button below, or type a message!**`,
      timestamp: new Date().toISOString(),
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(() => uuidv4())
  const [showUpload, setShowUpload] = useState(false)
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null)
  const [inputValue, setInputValue] = useState('')

  const addMessage = useCallback((msg: Omit<Message, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, { ...msg, id: uuidv4(), timestamp: new Date().toISOString() }])
  }, [])

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return
    setInputValue('')
    addMessage({ role: 'user', content: text })
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId, resume: parsedResume }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      addMessage({ role: 'assistant', content: data.reply, jobCards: data.jobCards, applicationResult: data.applicationResult })
    } catch (err) {
      addMessage({ role: 'assistant', content: '⚠️ Sorry, I encountered an error. Please try again.' })
      toast.error('Request failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResumeUploaded = (resume: ParsedResume) => {
    setParsedResume(resume)
    setShowUpload(false)
    addMessage({
      role: 'assistant',
      content: `✅ **Resume parsed successfully!**\n\n**Name:** ${resume.name}\n**Contact:** ${resume.email || 'N/A'} ${resume.phone ? '| ' + resume.phone : ''}\n**Current Role:** ${resume.designation || 'Not specified'}\n**Experience:** ${resume.experience || 'Not specified'}\n\n**Skills:** ${resume.skills?.slice(0, 10).join(', ') || 'None detected'}\n\n**Education:** ${resume.education?.[0] || 'Not specified'}\n\n---\n*If anything looks wrong, tell me and I'll update it. Ready to find you matching jobs — just ask!*`,
      parsedResume: resume,
    })
  }

  const quickActions = [
    { icon: <Briefcase size={14} />, label: 'Show my matched jobs', action: 'Show me jobs that match my profile' },
    { icon: <FileText size={14} />, label: 'Remote jobs only', action: 'Show only remote job opportunities' },
    { icon: <ChevronRight size={14} />, label: 'My applications', action: 'Show my applied jobs and their status' },
  ]

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
          <Bot size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">AI Job Assistant</h1>
          <p className="text-xs text-slate-500">Powered by Gemini AI · Hidani Tech Assessment</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {parsedResume && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
              ✓ Resume loaded
            </span>
          )}
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Upload size={16} />
            {parsedResume ? 'Update Resume' : 'Upload Resume'}
          </button>
        </div>
      </header>

      {/* Quick actions bar */}
      {parsedResume && (
        <div className="bg-white/60 border-b border-slate-100 px-4 py-2 flex gap-2 overflow-x-auto">
          {quickActions.map((qa, i) => (
            <button
              key={i}
              onClick={() => handleSend(qa.action)}
              className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap shadow-sm"
            >
              {qa.icon}
              {qa.label}
            </button>
          ))}
        </div>
      )}

      {/* Chat */}
      <ChatWindow
        messages={messages}
        isLoading={isLoading}
        onSend={handleSend}
        inputValue={inputValue}
        setInputValue={setInputValue}
        sessionId={sessionId}
        onApply={async (jobId, jobTitle) => {
          await handleSend(`Apply me to job: ${jobId} (${jobTitle})`)
        }}
      />

      {/* Upload Modal */}
      {showUpload && (
        <ResumeUploadModal
          sessionId={sessionId}
          onClose={() => setShowUpload(false)}
          onUploaded={handleResumeUploaded}
        />
      )}
    </div>
  )
}
