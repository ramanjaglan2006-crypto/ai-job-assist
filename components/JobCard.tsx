'use client'

import { useState } from 'react'
import { JobCard as JobCardType } from '@/lib/types'
import { MapPin, Briefcase, Zap, ExternalLink, CheckCircle, Star } from 'lucide-react'

interface Props {
  card: JobCardType
  onApply: (jobId: string, jobTitle: string) => Promise<void>
}

export default function JobCard({ card, onApply }: Props) {
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const { job, matchScore, matchReasons } = card

  const handleApply = async () => {
    if (applied || applying) return
    setApplying(true)
    try {
      await onApply(job.id, job.title)
      setApplied(true)
    } finally {
      setApplying(false)
    }
  }

  const scoreColor = matchScore >= 70 ? 'text-green-600 bg-green-50' : matchScore >= 40 ? 'text-amber-600 bg-amber-50' : 'text-slate-600 bg-slate-50'
  const scoreLabel = matchScore >= 70 ? 'Strong Match' : matchScore >= 40 ? 'Good Match' : 'Partial Match'

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 text-sm truncate">{job.title}</h3>
          <p className="text-indigo-600 text-xs font-medium mt-0.5">{job.company}</p>
        </div>
        <div className={`flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${scoreColor}`}>
          <Star size={10} />
          {matchScore}% · {scoreLabel}
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <MapPin size={11} />
          {job.remote ? '🌐 Remote' : job.location}
        </span>
        {job.experience && (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Briefcase size={11} />
            {job.experience}
          </span>
        )}
        {job.salary && (
          <span className="text-xs text-green-600 font-medium">{job.salary}</span>
        )}
        {job.jobType && (
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{job.jobType}</span>
        )}
      </div>

      {/* Skills */}
      {job.skills && job.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {job.skills.slice(0, 5).map(skill => (
            <span key={skill} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
              {skill}
            </span>
          ))}
          {job.skills.length > 5 && (
            <span className="text-xs text-slate-400">+{job.skills.length - 5} more</span>
          )}
        </div>
      )}

      {/* Match Reasons */}
      {matchReasons.length > 0 && (
        <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-3">
          <p className="text-xs font-medium text-green-700 mb-1 flex items-center gap-1">
            <Zap size={10} /> Why this matches you:
          </p>
          <ul className="space-y-0.5">
            {matchReasons.map((r, i) => (
              <li key={i} className="text-xs text-green-600">• {r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Description snippet */}
      {job.description && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{job.description}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleApply}
          disabled={applying || applied}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-all ${
            applied
              ? 'bg-green-50 text-green-600 border border-green-200 cursor-default'
              : applying
              ? 'bg-indigo-50 text-indigo-400 border border-indigo-100 cursor-wait'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
          }`}
        >
          {applied ? (
            <><CheckCircle size={12} /> Applied</>
          ) : applying ? (
            'Recording...'
          ) : (
            'Apply (Record)'
          )}
        </button>
        {job.sourceUrl && job.sourceUrl !== '#' && (
          <a
            href={job.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 px-3 py-2 rounded-lg transition-colors"
          >
            <ExternalLink size={11} />
            View
          </a>
        )}
      </div>
    </div>
  )
}
