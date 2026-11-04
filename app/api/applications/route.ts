import { NextRequest, NextResponse } from 'next/server'
import { getApplications, addApplication } from '@/lib/applicationStore'
import { loadJobs } from '@/lib/jobMatcher'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  const apps = getApplications(sessionId)
  return NextResponse.json({ applications: apps })
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, jobId } = await req.json()
    if (!sessionId || !jobId) return NextResponse.json({ error: 'sessionId and jobId required' }, { status: 400 })

    const jobs = loadJobs()
    const job = jobs.find(j => j.id === jobId)
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const result = addApplication(sessionId, job.id, job.title, job.company)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}

