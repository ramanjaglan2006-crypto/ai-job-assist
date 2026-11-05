import { JobListing, JobCard, ParsedResume } from './types'
import { generateText } from './gemini'
import { fetchLiveJobs } from './liveJobsFetcher'
import path from 'path'
import fs from 'fs'

/** Synchronous static-file loader (used as quick fallback inside orchestrator) */
export function loadJobs(): JobListing[] {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'jobs.json')
    const raw = fs.readFileSync(dataPath, 'utf-8')
    const jobs = JSON.parse(raw)
    return Array.isArray(jobs) ? jobs : (jobs.jobs || [])
  } catch (err) {
    console.error('Failed to load static jobs:', err)
    return []
  }
}

/** Async loader that prefers live data, falls back to static */
export async function loadJobsAsync(): Promise<JobListing[]> {
  try {
    const { jobs } = await fetchLiveJobs()
    if (jobs.length > 0) return jobs
  } catch {}
  return loadJobs()
}

export function filterJobs(jobs: JobListing[], filters: {
  remote?: boolean
  skills?: string[]
  location?: string
  title?: string
  minExp?: number
  maxExp?: number
}): JobListing[] {
  return jobs.filter(job => {
    if (filters.remote !== undefined) {
      if (filters.remote && !job.remote && !job.location?.toLowerCase().includes('remote')) return false
      if (!filters.remote && (job.remote || job.location?.toLowerCase() === 'remote')) return false
    }
    if (filters.location && !job.remote) {
      const loc = job.location?.toLowerCase() || ''
      if (!loc.includes(filters.location.toLowerCase())) return false
    }
    if (filters.title) {
      const title = job.title?.toLowerCase() || ''
      if (!title.includes(filters.title.toLowerCase())) return false
    }
    if (filters.skills && filters.skills.length > 0) {
      const jobSkills = (job.skills || []).map(s => s.toLowerCase())
      const jobDesc = (job.description || '').toLowerCase()
      const hasSkill = filters.skills.some(skill =>
        jobSkills.includes(skill.toLowerCase()) || jobDesc.includes(skill.toLowerCase())
      )
      if (!hasSkill) return false
    }
    return true
  })
}

export function scoreJob(job: JobListing, resume: ParsedResume): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 0

  const resumeSkills = resume.skills.map(s => s.toLowerCase())
  const jobSkills = (job.skills || []).map(s => s.toLowerCase())
  const jobDesc = (job.description || '').toLowerCase()

  // Skill match
  const matchedSkills = resumeSkills.filter(rs =>
    jobSkills.some(js => js.includes(rs) || rs.includes(js)) ||
    jobDesc.includes(rs)
  )
  if (matchedSkills.length > 0) {
    score += Math.min(matchedSkills.length * 15, 60)
    reasons.push(`Skills match: ${matchedSkills.slice(0, 3).join(', ')}`)
  }

  // Title match
  const designation = (resume.designation || '').toLowerCase()
  const jobTitle = job.title.toLowerCase()
  if (designation && (jobTitle.includes(designation) || designation.includes(jobTitle.split(' ')[0]))) {
    score += 20
    reasons.push(`Role aligns with your designation: ${resume.designation}`)
  } else if (designation) {
    const designWords = designation.split(' ')
    const titleWords = jobTitle.split(' ')
    const overlap = designWords.filter(d => titleWords.some(t => t.includes(d) || d.includes(t)))
    if (overlap.length > 0) {
      score += 10
      reasons.push(`Partial role alignment: ${overlap.join(', ')}`)
    }
  }

  // Experience level
  const expYears = resume.experienceYears || 0
  const expText = job.experience?.toLowerCase() || ''
  if (expText.includes('junior') || expText.includes('0-2') || expText.includes('entry')) {
    if (expYears <= 2) { score += 10; reasons.push('Matches your experience level (entry)') }
  } else if (expText.includes('mid') || expText.includes('2-5') || expText.includes('3-5')) {
    if (expYears >= 2 && expYears <= 6) { score += 10; reasons.push('Matches your experience level (mid)') }
  } else if (expText.includes('senior') || expText.includes('5+')) {
    if (expYears >= 5) { score += 10; reasons.push('Matches your experience level (senior)') }
  }

  if (score === 0) score = 5 + Math.floor(Math.random() * 15) // Minimum visibility score

  return { score: Math.min(score, 100), reasons: reasons.length ? reasons : ['General match based on your profile'] }
}

export function getTopMatches(resume: ParsedResume, limit = 10, filters?: Record<string, any>): JobCard[] {
  let jobs = loadJobs()
  
  if (filters) {
    jobs = filterJobs(jobs, filters)
  }

  const scored = jobs.map(job => {
    const { score, reasons } = scoreJob(job, resume)
    return { job, matchScore: score, matchReasons: reasons }
  })

  return scored
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit)
}

/** Async version — uses live jobs (recommended for chat) */
export async function getTopMatchesAsync(resume: ParsedResume, limit = 10, filters?: Record<string, any>): Promise<JobCard[]> {
  let jobs = await loadJobsAsync()

  if (filters) {
    jobs = filterJobs(jobs, filters)
  }

  const scored = jobs.map(job => {
    const { score, reasons } = scoreJob(job, resume)
    return { job, matchScore: score, matchReasons: reasons }
  })

  return scored
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit)
}

