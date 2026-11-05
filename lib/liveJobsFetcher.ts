/**
 * Live Job Fetcher
 * Fetches real-time job listings from multiple sources:
 *   - RemoteOK     (free, no auth)
 *   - Remotive     (free, no auth)
 *   - Arbeitnow    (free, no auth)
 *   - Adzuna       (free key: ADZUNA_APP_ID + ADZUNA_APP_KEY from developer.adzuna.com)
 *   - JSearch      (free key: JSEARCH_API_KEY from rapidapi.com/jsearch)
 *
 * Results are in-memory cached for CACHE_TTL_MS to avoid hitting rate limits.
 * Falls back to static jobs.json if all live sources fail.
 */

import { JobListing } from './types'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

interface Cache {
  jobs: JobListing[]
  fetchedAt: number
}

let _cache: Cache | null = null

// ─── ID generator ─────────────────────────────────────────────────────────────
function makeId(str: string): string {
  return 'JOB' + crypto.createHash('md5').update(str).digest('hex').slice(0, 8).toUpperCase()
}

// ─── RemoteOK ─────────────────────────────────────────────────────────────────
async function fetchRemoteOK(): Promise<JobListing[]> {
  try {
    const res = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'HidaniJobAssistant/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data: any[] = await res.json()
    return data
      .filter(j => j && j.position && j.company)
      .map(j => ({
        id: makeId('remoteok-' + j.id),
        title: j.position,
        company: j.company,
        location: 'Remote',
        remote: true,
        experience: '0-5 years',
        skills: (j.tags || []).slice(0, 10),
        description: j.description?.replace(/<[^>]*>/g, '').slice(0, 500) || '',
        sourceUrl: j.url || `https://remoteok.com/remote-jobs/${j.id}`,
        salary: j.salary_min ? `$${Math.round(j.salary_min / 1000)}k–$${Math.round(j.salary_max / 1000)}k/yr` : undefined,
        jobType: 'Full-time',
        postedAt: j.date || new Date().toISOString(),
        source: 'RemoteOK',
      }))
  } catch (err: any) {
    console.warn('RemoteOK fetch failed:', err?.message)
    return []
  }
}

// ─── Remotive ─────────────────────────────────────────────────────────────────
async function fetchRemotive(): Promise<JobListing[]> {
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?limit=100', {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.jobs || []).map((j: any) => ({
      id: makeId('remotive-' + j.id),
      title: j.title,
      company: j.company_name,
      location: j.candidate_required_location || 'Remote',
      remote: true,
      experience: '0-5 years',
      skills: (j.tags || []).slice(0, 10),
      description: j.description?.replace(/<[^>]*>/g, '').slice(0, 500) || '',
      sourceUrl: j.url || 'https://remotive.com',
      salary: j.salary || undefined,
      jobType: j.job_type || 'Full-time',
      postedAt: j.publication_date || new Date().toISOString(),
      source: 'Remotive',
    }))
  } catch (err: any) {
    console.warn('Remotive fetch failed:', err?.message)
    return []
  }
}

// ─── Arbeitnow ────────────────────────────────────────────────────────────────
async function fetchArbeitnow(pages = 3): Promise<JobListing[]> {
  const all: JobListing[] = []
  for (let p = 1; p <= pages; p++) {
    try {
      const res = await fetch(`https://www.arbeitnow.com/api/job-board-api?page=${p}`, {
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) break
      const data = await res.json()
      const jobs: JobListing[] = (data.data || []).map((j: any) => ({
        id: makeId('arbeitnow-' + j.slug),
        title: j.title,
        company: j.company_name,
        location: j.location || 'Remote',
        remote: j.remote === true,
        experience: '0-5 years',
        skills: (j.tags || []).slice(0, 10),
        description: j.description?.replace(/<[^>]*>/g, '').slice(0, 500) || '',
        sourceUrl: j.url || 'https://www.arbeitnow.com',
        jobType: j.job_types?.[0] || 'Full-time',
        postedAt: j.created_at ? new Date(j.created_at * 1000).toISOString() : new Date().toISOString(),
        source: 'Arbeitnow',
      }))
      all.push(...jobs)
      if (!data.links?.next) break
    } catch (err: any) {
      console.warn(`Arbeitnow page ${p} failed:`, err?.message)
      break
    }
  }
  return all
}

// ─── Adzuna ───────────────────────────────────────────────────────────────────
async function fetchAdzuna(): Promise<JobListing[]> {
  const appId = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY
  if (!appId || !appKey) return []

  const countries = ['in', 'us', 'gb'] // India, US, UK
  const all: JobListing[] = []

  for (const country of countries) {
    try {
      const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=50&what=software+developer&content-type=application/json`
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) continue
      const data = await res.json()
      const jobs: JobListing[] = (data.results || []).map((j: any) => ({
        id: makeId('adzuna-' + j.id),
        title: j.title,
        company: j.company?.display_name || 'Unknown',
        location: j.location?.display_name || j.location?.area?.join(', ') || 'Unknown',
        remote: j.title?.toLowerCase().includes('remote') || j.description?.toLowerCase().includes('remote') || false,
        experience: '0-5 years',
        skills: [],
        description: j.description?.slice(0, 500) || '',
        sourceUrl: j.redirect_url || 'https://adzuna.com',
        salary: j.salary_min ? `${country === 'in' ? '₹' : '$'}${Math.round(j.salary_min / 1000)}k–${Math.round((j.salary_max || j.salary_min * 1.3) / 1000)}k` : undefined,
        jobType: j.contract_time === 'full_time' ? 'Full-time' : j.contract_time || 'Full-time',
        postedAt: j.created || new Date().toISOString(),
        source: `Adzuna (${country.toUpperCase()})`,
      }))
      all.push(...jobs)
    } catch (err: any) {
      console.warn(`Adzuna ${country} failed:`, err?.message)
    }
  }
  return all
}

// ─── JSearch (RapidAPI) ───────────────────────────────────────────────────────
async function fetchJSearch(): Promise<JobListing[]> {
  const apiKey = process.env.JSEARCH_API_KEY
  if (!apiKey) return []

  const queries = ['software developer', 'react developer', 'python developer', 'full stack engineer']
  const all: JobListing[] = []

  for (const query of queries) {
    try {
      const res = await fetch(
        `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=1&num_pages=1&date_posted=month`,
        {
          headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
          },
          signal: AbortSignal.timeout(8000),
        }
      )
      if (!res.ok) break
      const data = await res.json()
      const jobs: JobListing[] = (data.data || []).map((j: any) => ({
        id: makeId('jsearch-' + j.job_id),
        title: j.job_title,
        company: j.employer_name,
        location: j.job_city ? `${j.job_city}, ${j.job_country}` : j.job_country || 'Unknown',
        remote: j.job_is_remote || false,
        experience: j.job_required_experience?.required_experience_in_months
          ? `${Math.round(j.job_required_experience.required_experience_in_months / 12)} years`
          : '0-5 years',
        skills: (j.job_required_skills || []).slice(0, 10),
        description: j.job_description?.slice(0, 500) || '',
        sourceUrl: j.job_apply_link || j.job_google_link || 'https://rapidapi.com',
        salary: j.job_min_salary
          ? `${j.job_salary_currency || '$'}${Math.round(j.job_min_salary / 1000)}k–${Math.round(j.job_max_salary / 1000)}k`
          : undefined,
        jobType: j.job_employment_type || 'Full-time',
        postedAt: j.job_posted_at_datetime_utc || new Date().toISOString(),
        source: `JSearch (${j.job_publisher || 'Various'})`,
      }))
      all.push(...jobs)
    } catch (err: any) {
      console.warn(`JSearch "${query}" failed:`, err?.message)
      break
    }
  }
  return all
}

// ─── Static JSON fallback ─────────────────────────────────────────────────────
function loadStaticJobs(): JobListing[] {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'jobs.json')
    const raw = fs.readFileSync(dataPath, 'utf-8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : (parsed.jobs || [])
  } catch {
    return []
  }
}

// ─── Dedup + merge ─────────────────────────────────────────────────────────────
function dedup(jobs: JobListing[]): JobListing[] {
  const seen = new Set<string>()
  return jobs.filter(j => {
    const key = `${j.title.toLowerCase().slice(0, 30)}|${j.company.toLowerCase().slice(0, 20)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ─── Main export ───────────────────────────────────────────────────────────────
export async function fetchLiveJobs(forceRefresh = false): Promise<{ jobs: JobListing[]; sources: string[]; fromCache: boolean }> {
  const now = Date.now()

  // Return cache if still fresh
  if (!forceRefresh && _cache && now - _cache.fetchedAt < CACHE_TTL_MS) {
    return { jobs: _cache.jobs, sources: ['cache'], fromCache: true }
  }

  console.log('[LiveJobs] Fetching from all sources...')
  const activeSources: string[] = []

  // Fetch all sources in parallel
  const [remoteOK, remotive, arbeitnow, adzuna, jsearch] = await Promise.allSettled([
    fetchRemoteOK(),
    fetchRemotive(),
    fetchArbeitnow(5),   // 5 pages × ~300 = 1500 Arbeitnow jobs
    fetchAdzuna(),
    fetchJSearch(),
  ])

  const collect = (result: PromiseSettledResult<JobListing[]>, name: string): JobListing[] => {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      activeSources.push(`${name} (${result.value.length})`)
      return result.value
    }
    return []
  }

  const liveJobs = [
    ...collect(remoteOK, 'RemoteOK'),
    ...collect(remotive, 'Remotive'),
    ...collect(arbeitnow, 'Arbeitnow'),
    ...collect(adzuna, 'Adzuna'),
    ...collect(jsearch, 'JSearch'),
  ]

  let finalJobs = dedup(liveJobs)

  // Fallback to static JSON if all live sources fail
  if (finalJobs.length < 50) {
    console.warn('[LiveJobs] Live fetch returned too few jobs, supplementing with static data')
    const staticJobs = loadStaticJobs()
    const staticNew = staticJobs.filter(sj => !finalJobs.some(lj => lj.id === sj.id))
    finalJobs = dedup([...finalJobs, ...staticNew])
    if (staticJobs.length > 0) activeSources.push(`Static (${staticNew.length})`)
  }

  // Sort: newest first
  finalJobs.sort((a, b) => {
    const da = a.postedAt ? new Date(a.postedAt).getTime() : 0
    const db = b.postedAt ? new Date(b.postedAt).getTime() : 0
    return db - da
  })

  _cache = { jobs: finalJobs, fetchedAt: now }

  console.log(`[LiveJobs] Total: ${finalJobs.length} jobs from: ${activeSources.join(', ')}`)
  return { jobs: finalJobs, sources: activeSources, fromCache: false }
}

export function clearJobsCache() {
  _cache = null
}
