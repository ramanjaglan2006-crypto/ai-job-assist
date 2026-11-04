export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  jobCards?: JobCard[]
  applicationResult?: ApplicationResult
  parsedResume?: ParsedResume
}

export interface ParsedResume {
  name: string
  email?: string
  phone?: string
  designation?: string
  skills: string[]
  experience?: string
  experienceYears?: number
  education?: string[]
  projects?: string[]
  summary?: string
  rawText?: string
}

export interface JobListing {
  id: string
  title: string
  company: string
  location: string
  remote: boolean
  experience: string
  skills: string[]
  description: string
  sourceUrl: string
  salary?: string
  jobType?: string
  postedAt?: string
  source?: string
}

export interface JobCard {
  job: JobListing
  matchScore: number
  matchReasons: string[]
}

export interface Application {
  id: string
  sessionId: string
  jobId: string
  jobTitle: string
  company: string
  appliedAt: string
  status: 'Applied' | 'Under Review' | 'Interview Scheduled' | 'Rejected' | 'Offer Extended'
}

export interface ApplicationResult {
  success: boolean
  message: string
  application?: Application
}

export interface ChatRequest {
  message: string
  sessionId: string
  resume?: ParsedResume | null
}

export interface ChatResponse {
  reply: string
  jobCards?: JobCard[]
  applicationResult?: ApplicationResult
}
