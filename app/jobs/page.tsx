'use client'

import { useState, useEffect, useCallback } from 'react'
import { JobListing } from '@/lib/types'
import { MapPin, Briefcase, ExternalLink, CheckCircle, Search, Wifi, SlidersHorizontal, ChevronDown, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useSession } from '@/hooks/useSession'

const PAGE_SIZE = 12

export default function JobsPage() {
  const sessionId = useSession()

  // Filter state
  const [search, setSearch] = useState('')
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [skillFilter, setSkillFilter] = useState('')

  // Data state
  const [jobs, setJobs] = useState<JobListing[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  // Applied tracking
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())
  const [applyingId, setApplyingId] = useState<string | null>(null)

  // Fetch jobs
  const fetchJobs = useCallback(async (p = 1, append = false) => {
    if (p === 1) setLoading(true)
    else setLoadingMore(true)
    setError('')

    try {
      const params = new URLSearchParams({
        page: String(p),
        limit: String(PAGE_SIZE),
      })
      if (remoteOnly) params.set('remote', 'true')
      if (skillFilter.trim()) params.set('skill', skillFilter.trim())

      const res = await fetch(`/api/jobs?${params}`)
      if (!res.ok) throw new Error('Failed to load jobs')
      const data = await res.json()

      // Client-side search filter
      let filtered = data.jobs as JobListing[]
      if (search.trim()) {
        const q = search.toLowerCase()
        filtered = filtered.filter(j =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          (j.skills || []).some(s => s.toLowerCase().includes(q))
        )
      }

      setJobs(prev => append ? [...prev, ...filtered] : filtered)
      setTotal(data.total)
      setPage(p)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [remoteOnly, skillFilter, search])

  // Initial + filter-change fetch
  useEffect(() => {
    fetchJobs(1, false)
  }, [remoteOnly, skillFilter])

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchJobs(1, false), 400)
    return () => clearTimeout(t)
  }, [search])

  // Load existing applied IDs for this session
  useEffect(() => {
    if (!sessionId) return
    fetch(`/api/applications?sessionId=${sessionId}`)
      .then(r => r.json())
      .then(d => {
        const ids = new Set<string>((d.applications || []).map((a: any) => a.jobId))
        setAppliedIds(ids)
      })
      .catch(() => {})
  }, [sessionId])

  const handleApply = async (job: JobListing) => {
    if (!sessionId) return
    setApplyingId(job.id)
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, jobId: job.id }),
      })
      const data = await res.json()
      if (data.success) {
        setAppliedIds(prev => new Set([...prev, job.id]))
        toast.success(`Application recorded for "${job.title}"`)
      } else {
        toast(data.message || 'Already applied', { icon: 'ℹ️' })
        setAppliedIds(prev => new Set([...prev, job.id]))
      }
    } catch {
      toast.error('Failed to record application')
    } finally {
      setApplyingId(null)
    }
  }

  const hasMore = jobs.length < total && !search.trim()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-slate-900">Browse Jobs</h1>
          <p className="text-sm text-slate-500 mt-1">{total.toLocaleString()} real job listings · Apply records the job in this demo only</p>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap gap-3">
            {/* Search */}
            <div className="flex-1 min-w-[200px] relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search title, company, or skill…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
              />
            </div>

            {/* Skill filter */}
            <div className="relative">
              <SlidersHorizontal size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by skill (e.g. react)"
                value={skillFilter}
                onChange={e => setSkillFilter(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 w-52"
              />
            </div>

            {/* Remote toggle */}
            <button
              onClick={() => setRemoteOnly(r => !r)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                remoteOnly
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
              }`}
            >
              <Wifi size={15} />
              Remote only
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Results count */}
        {!loading && (
          <p className="text-sm text-slate-500 mb-4">
            {search.trim()
              ? `${jobs.length} result${jobs.length !== 1 ? 's' : ''} for "${search}"`
              : `Showing ${jobs.length} of ${total.toLocaleString()} jobs`}
          </p>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/2 mb-4" />
                <div className="h-3 bg-slate-100 rounded w-full mb-2" />
                <div className="h-3 bg-slate-100 rounded w-4/5" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-4 text-sm text-red-600">
            <AlertCircle size={18} className="flex-shrink-0" />
            {error} — <button onClick={() => fetchJobs(1)} className="underline">Try again</button>
          </div>
        )}

        {/* No results */}
        {!loading && !error && jobs.length === 0 && (
          <div className="text-center py-16">
            <Briefcase size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">No jobs found</h3>
            <p className="text-sm text-slate-500 mt-1">Try different keywords or remove some filters.</p>
          </div>
        )}

        {/* Job grid */}
        {!loading && jobs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {jobs.map(job => {
              const applied = appliedIds.has(job.id)
              const applying = applyingId === job.id
              return (
                <div key={job.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2">{job.title}</h3>
                      <p className="text-indigo-600 text-xs font-medium mt-0.5">{job.company}</p>
                    </div>
                    {job.remote && (
                      <span className="flex-shrink-0 text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">Remote</span>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin size={11} />
                      {job.remote ? 'Remote' : job.location}
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
                  </div>

                  {/* Skills */}
                  {job.skills && job.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {job.skills.slice(0, 4).map(skill => (
                        <span key={skill} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
                          {skill}
                        </span>
                      ))}
                      {job.skills.length > 4 && (
                        <span className="text-xs text-slate-400">+{job.skills.length - 4}</span>
                      )}
                    </div>
                  )}

                  {/* Description */}
                  {job.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-4 flex-1">{job.description}</p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto">
                    <button
                      onClick={() => handleApply(job)}
                      disabled={applied || applying}
                      className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-all ${
                        applied
                          ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
                          : applying
                          ? 'bg-indigo-50 text-indigo-400 border border-indigo-100 cursor-wait'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                      }`}
                    >
                      {applied ? (
                        <><CheckCircle size={12} /> Applied</>
                      ) : applying ? (
                        <><Loader2 size={12} className="animate-spin" /> Recording…</>
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
            })}
          </div>
        )}

        {/* Load more */}
        {hasMore && !loading && (
          <div className="mt-8 text-center">
            <button
              onClick={() => fetchJobs(page + 1, true)}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 text-sm font-medium px-6 py-2.5 rounded-xl transition-all shadow-sm"
            >
              {loadingMore ? <Loader2 size={15} className="animate-spin" /> : <ChevronDown size={15} />}
              {loadingMore ? 'Loading…' : `Load more (${total - jobs.length} remaining)`}
            </button>
          </div>
        )}

        {/* Demo disclosure */}
        <p className="text-center text-xs text-slate-400 mt-8">
          ⚠️ Applying records the job in this demo system only. No application is submitted to the employer.
        </p>
      </div>
    </div>
  )
}
