import { ParsedResume } from './types'
import { extractResumeData } from './gemini'

export async function parseResume(buffer: Buffer, mimeType: string): Promise<ParsedResume> {
  let text = ''

  try {
    if (mimeType === 'application/pdf' || mimeType === 'pdf') {
      // Dynamic import to avoid SSR issues
      const pdfParse = (await import('pdf-parse')).default
      const data = await pdfParse(buffer)
      text = data.text
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword' ||
      mimeType === 'docx'
    ) {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    } else {
      // Try as plain text
      text = buffer.toString('utf-8')
    }
  } catch (err: any) {
    console.error('Parse error:', err?.message)
    throw new Error(`Could not read file: ${err?.message || 'Unknown error'}`)
  }

  if (!text || text.trim().length < 20) {
    throw new Error('The resume appears to be empty or unreadable. Please ensure it contains text (not just images).')
  }

  // Sanitize: treat as untrusted - strip potential injection attempts
  const safeText = text.replace(/ignore previous instructions?/gi, '[removed]')
                       .replace(/system:/gi, '[system]')
                       .slice(0, 15000)

  const extracted = await extractResumeData(safeText)

  return {
    name: extracted.name || 'Unknown',
    email: extracted.email || undefined,
    phone: extracted.phone || undefined,
    designation: extracted.designation || 'Software Developer',
    skills: Array.isArray(extracted.skills) ? extracted.skills : [],
    experience: extracted.experience || 'Not specified',
    experienceYears: typeof extracted.experienceYears === 'number' ? extracted.experienceYears : 0,
    education: Array.isArray(extracted.education) ? extracted.education : [],
    projects: Array.isArray(extracted.projects) ? extracted.projects : [],
    summary: extracted.summary || '',
    rawText: safeText.slice(0, 2000), // Store minimal reference
  }
}

