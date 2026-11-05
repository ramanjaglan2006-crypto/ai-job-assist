import { ParsedResume, JobCard, ApplicationResult, ChatRequest, ChatResponse } from '../types'
import { generateText } from '../gemini'
import { getTopMatchesAsync, filterJobs, loadJobsAsync, scoreJob } from '../jobMatcher'
import { getApplications, addApplication } from '../applicationStore'
import { format } from 'date-fns'

const SYSTEM_PROMPT = `You are an AI job assistant for Hidani Tech. You help users find jobs, track applications, and navigate their career journey.
You have access to a dataset of real job listings and can match them to user resumes.
Be concise, helpful, and professional. Use markdown formatting.
IMPORTANT: Never claim to actually submit applications to employers. Always clarify applications are recorded in this system only.`

type Intent = 'show_jobs' | 'apply_job' | 'show_applications' | 'refine_jobs' | 'general'

function detectIntent(message: string): Intent {
  const lower = message.toLowerCase()
  if (lower.match(/\b(apply|apply me|submit application|i want to apply)\b/)) return 'apply_job'
  if (lower.match(/\b(show|see|view|list|check)\b.*\b(application|applied|status)\b/)) return 'show_applications'
  if (lower.match(/\b(my application|applied jobs|application status)\b/)) return 'show_applications'
  if (lower.match(/\b(remote|onsite|location|skill|only|filter|show me|find|search|jobs? (needing|requiring|with|that))\b/)) return 'refine_jobs'
  if (lower.match(/\b(job|role|position|opening|listing|recommendation|match)\b/)) return 'show_jobs'
  return 'general'
}

function parseJobId(message: string): string | null {
  // Try to extract job ID from message like "apply to job: JOB123 (Title)"
  const match = message.match(/(?:job[:\s]+)?([A-Z0-9_-]{3,30})/i)
  return match?.[1] || null
}

function parseFilters(message: string): Record<string, any> {
  const lower = message.toLowerCase()
  const filters: Record<string, any> = {}

  if (lower.includes('remote')) filters.remote = true
  if (lower.includes('onsite') || lower.includes('on-site') || lower.includes('in office')) filters.remote = false

  // Skills
  const skillKeywords = ['react', 'node', 'python', 'java', 'typescript', 'javascript', 'vue', 'angular',
    'aws', 'docker', 'kubernetes', 'mongodb', 'postgresql', 'sql', 'go', 'rust', 'c++', 'kotlin', 'swift',
    'flutter', 'django', 'flask', 'spring', 'graphql', 'redis', 'next.js', 'tailwind', 'tensorflow', 'pytorch']
  const foundSkills = skillKeywords.filter(sk => lower.includes(sk))
  if (foundSkills.length > 0) filters.skills = foundSkills

  // Experience
  if (lower.includes('junior') || lower.includes('entry')) filters.experience = 'junior'
  if (lower.includes('senior')) filters.experience = 'senior'
  if (lower.includes('mid') || lower.includes('middle')) filters.experience = 'mid'

  return filters
}

export async function handleChat(req: ChatRequest): Promise<ChatResponse> {
  const { message, sessionId, resume } = req
  const intent = detectIntent(message)

  // === APPLY INTENT ===
  if (intent === 'apply_job') {
    // Extract job ID: look for patterns like JOB1A2B3C4D or similar uppercase+digit codes
    // Also handle "apply to [job title]" by searching by title
    const jobIdMatch = message.match(/\b(JOB[A-Z0-9]{4,})\b/i)
    const jobId = jobIdMatch?.[1]?.toUpperCase()

    // Try to extract job title from parentheses or after "apply to"
    const titleFromParens = message.match(/\(([^)]+)\)/)?.[1]
    const titleFromText = message.replace(/apply\s+(me\s+to|to)\s+/i, '').replace(/job[:\s]+\S+/i, '').trim()

    const jobs = await loadJobsAsync()
    let job = jobId ? jobs.find(j => j.id.toUpperCase() === jobId) : null

    // Fallback: search by title if no ID found or no job found by ID
    if (!job && (titleFromParens || titleFromText)) {
      const searchTitle = (titleFromParens || titleFromText).toLowerCase()
      job = jobs.find(j => j.title.toLowerCase().includes(searchTitle.slice(0, 20)))
    }

    if (!job) {
      return {
        reply: "I couldn't identify which job you want to apply to. Please click the **Apply (Record)** button on a job card, or type the job title clearly, e.g.: *Apply me to Frontend Engineer at Google*."
      }
    }

    const result = addApplication(sessionId, job.id, job.title, job.company)
    return {
      reply: result.message + `\n\n📋 **Application Details:**\n- **Job:** ${job.title}\n- **Company:** ${job.company}\n- **Location:** ${job.location}\n- **Date:** ${format(new Date(), 'PPP')}\n- **Status:** Applied\n\n> ⚠️ This application is recorded in this system only. No data has been sent to the employer.`,
      applicationResult: { ...result, application: result.application },
    }
  }

  // === SHOW APPLICATIONS ===
  if (intent === 'show_applications') {
    const applications = getApplications(sessionId)
    if (applications.length === 0) {
      return {
        reply: "You haven't recorded any applications yet. Find matching jobs and ask me to apply!"
      }
    }

    const list = applications.map((a, i) => {
      const statusEmoji = { Applied: '📬', 'Under Review': '👀', 'Interview Scheduled': '📅', Rejected: '❌', 'Offer Extended': '🎉' }[a.status] || '📬'
      return `${i + 1}. **${a.jobTitle}** at ${a.company}\n   ${statusEmoji} Status: **${a.status}** | Applied: ${format(new Date(a.appliedAt), 'PPP')}`
    }).join('\n\n')

    return {
      reply: `## 📋 Your Applications (${applications.length})\n\n${list}\n\n> These applications are recorded in this system only and are not sent to employers.`
    }
  }

  // === SHOW JOBS / REFINE ===
  if (intent === 'show_jobs' || intent === 'refine_jobs') {
    if (!resume) {
      return {
        reply: "To get personalized job recommendations, please **upload your resume** first using the button in the top right. I'll then match jobs to your skills and experience!"
      }
    }

    const filters = intent === 'refine_jobs' ? parseFilters(message) : {}
    const matches = await getTopMatchesAsync(resume, 8, Object.keys(filters).length > 0 ? filters : undefined)

    if (matches.length === 0) {
      return {
        reply: "No jobs matched your criteria. Try broadening your filters — for example, remove location restrictions or add more skills."
      }
    }

    const filterDesc = Object.entries(filters).map(([k, v]) => `${k}: ${v}`).join(', ')
    const intro = intent === 'refine_jobs' && filterDesc
      ? `Here are your filtered job recommendations (${filterDesc}):`
      : `Here are your top job matches based on your profile:`

    return {
      reply: `## 🎯 ${intro}\n\nI found **${matches.length} live jobs** matching your profile. See the job cards below for details and match reasons.`,
      jobCards: matches,
    }
  }

  // === GENERAL ===
  const contextSummary = resume
    ? `User profile: ${resume.name}, ${resume.designation}, skills: ${resume.skills.slice(0, 5).join(', ')}, experience: ${resume.experience}`
    : 'No resume uploaded yet.'

  const appCount = getApplications(sessionId).length
  const contextFull = `${SYSTEM_PROMPT}\n\nContext: ${contextSummary}\nApplications recorded: ${appCount}`

  try {
    const reply = await generateText(message, contextFull)
    return { reply }
  } catch {
    return {
      reply: "I'm having trouble processing that. Could you rephrase your question? You can ask me to show jobs, apply to a position, or see your applications."
    }
  }
}

