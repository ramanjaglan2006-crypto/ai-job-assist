'use client'

import { useState, useEffect } from 'react'
import { Application } from '@/lib/types'
import { FileText, ExternalLink, RefreshCw, Briefcase } from 'lucide-react'
import { useSession } from '@/hooks/useSession'
import Link from 'next/link'
import { format } from 'date-fns'

const STATUS_CONFIG: Record<string, { color: string; emoji: string }> = {
  'Applied':              { color: 'bg-blue-50 text-blue-700 border-blue-200',   emoji: '📬' },
  'Under Review':         { color: 'bg-yellow-50 text-yellow-700 border-yellow-200', emoji: '👀' },
  'Interview Scheduled':  { color: 'bg-purple-50 text-purple-700 border-purple-200', emoji: '📅' },
  'Rejected':             { color: 'bg-red-50 text-red-700 border-red-200',      emoji: '❌' },
  'Offer Extended':       { color: 'bg-green-50 text-green-700 border-green-200', emoji: '🎉' },
}

export default function ApplicationsPage() {
  const sessionId = useSession()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchApplications = async () => {
    if (!sessionId) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/applications?sessionId=${sessionId}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setApplications(data.applications || [])
    } catch {
      setError('Could not load applications. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (sessionId) fetchApplications()
  }, [sessionId])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Applications</h1>
            <p className="text-sm text-slate-500 mt-1">
              {loading ? 'Loading…' : `${applications.length} application${applications.length !== 1 ? 's' : ''} recorded`}
            </p>
          </div>
          <button
            onClick={fetchApplications}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-300 px-3 py-2 rounded-lg transition-colors bg-white shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 mb-6 flex items-center gap-2">
            <span>⚠️</span> {error}
            <button onClick={fetchApplications} className="ml-auto underline">Retry</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/4 mb-4" />
                <div className="h-3 bg-slate-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && applications.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <FileText size={32} className="text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">No applications yet</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Browse jobs and click <strong>Apply (Record)</strong> to track your applications here.
            </p>
            <div className="mt-6 flex gap-3 justify-center">
              <Link
                href="/jobs"
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors shadow-sm"
              >
                <Briefcase size={15} />
                Browse Jobs
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 text-sm font-medium px-5 py-2.5 rounded-xl transition-colors shadow-sm"
              >
                Go to Chat
              </Link>
            </div>
          </div>
        )}

        {/* Applications list */}
        {!loading && applications.length > 0 && (
          <>
            <div className="space-y-3">
              {applications.map((app, i) => {
                const status = STATUS_CONFIG[app.status] || STATUS_CONFIG['Applied']
                return (
                  <div key={app.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
                    <div className="flex items-start gap-4">
                      {/* Number */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-600">
                        {i + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <h3 className="font-semibold text-slate-900 text-sm">{app.jobTitle}</h3>
                            <p className="text-xs text-indigo-600 font-medium mt-0.5">{app.company}</p>
                          </div>
                          <span className={`flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${status.color}`}>
                            {status.emoji} {app.status}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                          <span>📅 Applied: <strong className="text-slate-700">{format(new Date(app.appliedAt), 'PPP')}</strong></span>
                          <span>🆔 Job ID: <code className="text-slate-600 bg-slate-100 px-1 py-0.5 rounded">{app.jobId}</code></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Find more jobs CTA */}
            <div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-xl p-6 text-center">
              <h4 className="font-semibold text-indigo-900 text-sm">Looking for more opportunities?</h4>
              <p className="text-xs text-indigo-600 mt-1">Browse 2,674 real job listings and add more to your tracker.</p>
              <Link
                href="/jobs"
                className="inline-flex items-center gap-2 mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors shadow-sm"
              >
                <Briefcase size={14} />
                Browse Jobs
              </Link>
            </div>

            {/* Demo disclosure */}
            <p className="text-center text-xs text-slate-400 mt-6">
              ⚠️ These applications are recorded in this demo system only. No application has been submitted to any employer.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

