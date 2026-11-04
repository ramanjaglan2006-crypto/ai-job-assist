import { NextRequest, NextResponse } from 'next/server'
import { loadJobs, filterJobs } from '@/lib/jobMatcher'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const remote = searchParams.get('remote')
  const skill = searchParams.get('skill')

  let jobs = loadJobs()

  if (remote === 'true') jobs = filterJobs(jobs, { remote: true })
  if (skill) jobs = filterJobs(jobs, { skills: [skill] })

  const total = jobs.length
  const start = (page - 1) * limit
  const paginated = jobs.slice(start, start + limit)

  return NextResponse.json({ jobs: paginated, total, page, limit })
}

