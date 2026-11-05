import { NextRequest, NextResponse } from 'next/server'
import { fetchLiveJobs, clearJobsCache } from '@/lib/liveJobsFetcher'
import { filterJobs } from '@/lib/jobMatcher'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const page  = Math.max(1, parseInt(searchParams.get('page')  || '1'))
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const remote = searchParams.get('remote')
  const skill  = searchParams.get('skill')
  const refresh = searchParams.get('refresh') === 'true'

  try {
    const { jobs: allJobs, sources, fromCache } = await fetchLiveJobs(refresh)

    let jobs = allJobs
    if (remote === 'true') jobs = filterJobs(jobs, { remote: true })
    if (skill)             jobs = filterJobs(jobs, { skills: [skill] })

    const total = jobs.length
    const start = (page - 1) * limit
    const paginated = jobs.slice(start, start + limit)

    return NextResponse.json({
      jobs: paginated,
      total,
      page,
      limit,
      sources,
      fromCache,
      fetchedAt: fromCache ? undefined : new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('Jobs API error:', err)
    return NextResponse.json({ error: 'Failed to load jobs', jobs: [], total: 0 }, { status: 500 })
  }
}

// Allow forced cache refresh
export async function POST(req: NextRequest) {
  clearJobsCache()
  return NextResponse.json({ message: 'Jobs cache cleared. Next request will fetch live data.' })
}
