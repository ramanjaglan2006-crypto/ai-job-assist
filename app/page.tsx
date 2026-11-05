'use client'

import { useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import ChatWindow from '@/components/ChatWindow'
import ResumeUploadModal from '@/components/ResumeUploadModal'
import { Message, ParsedResume } from '@/lib/types'
import { v4 as uuidv4 } from 'uuid'
import { Upload, Briefcase, FileText, LayoutGrid } from 'lucide-react'
import { useSession } from '@/hooks/useSession'
import { useResume } from '@/hooks/useResume'

export default function ChatPage() {
  const router = useRouter()
  const sessionId = useSession()
  const [parsedResume, setParsedResume] = useResume()

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

**To get started, upload your resume using the button above, or type a message!**`,
      timestamp: new Date().toISOString(),
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [inputValue, setInputValue] = useState('')

  const addMessage = useCallback((msg: Omit<Message, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, { ...msg, id: uuidv4(), timestamp: new Date().toISOString() }])
  }, [])

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading || !sessionId) return
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
    } catch {
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
    { icon: <LayoutGrid size={14} />, label: 'My applications', action: 'Show my applied jobs and their status' },
  ]

  return (
    <div className="flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"
         style={{ height: 'calc(100vh - 56px)' }}>
      {/* Chat sub-header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 px-4 py-2 flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 overflow-x-auto">
          {parsedResume && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium flex-shrink-0">
              ✓ Resume: {parsedResume.name}
            </span>
          )}
          {parsedResume && quickActions.map((qa, i) => (
            <button
              key={i}
              onClick={() => handleSend(qa.action)}
              className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap shadow-sm flex-shrink-0"
            >
              {qa.icon}
              {qa.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors shadow-sm flex-shrink-0"
        >
          <Upload size={13} />
          {parsedResume ? 'Update Resume' : 'Upload Resume'}
        </button>
      </div>

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
