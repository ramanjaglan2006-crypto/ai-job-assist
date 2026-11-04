import { Application } from './types'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

function getSessionPath(sessionId: string): string {
  const dir = path.join(process.cwd(), 'data', 'sessions')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, `${sessionId}.json`)
}

export function getApplications(sessionId: string): Application[] {
  try {
    const filePath = getSessionPath(sessionId)
    if (!fs.existsSync(filePath)) return []
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function addApplication(sessionId: string, jobId: string, jobTitle: string, company: string): {
  success: boolean
  message: string
  application?: Application
} {
  const existing = getApplications(sessionId)

  // Dedup check
  if (existing.some(a => a.jobId === jobId)) {
    return {
      success: false,
      message: `You have already applied to "${jobTitle}" at ${company}. No duplicate application recorded.`,
    }
  }

  const application: Application = {
    id: uuidv4(),
    sessionId,
    jobId,
    jobTitle,
    company,
    appliedAt: new Date().toISOString(),
    status: 'Applied',
  }

  const updated = [...existing, application]
  const filePath = getSessionPath(sessionId)
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2))

  return {
    success: true,
    message: `✅ Application recorded for "${jobTitle}" at ${company}. This is a simulation — no real application has been submitted to the employer.`,
    application,
  }
}

export function clearSession(sessionId: string): void {
  const filePath = getSessionPath(sessionId)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
}

