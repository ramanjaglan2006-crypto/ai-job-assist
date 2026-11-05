/**
 * Gemini AI client — uses the new @google/genai SDK (v2+)
 * Supports both legacy AIza... and new AQ. key formats from Google AI Studio.
 * Keys are read from GEMINI_API_KEY env var (server-side only, never exposed to browser).
 */
import { GoogleGenAI } from '@google/genai'

const API_KEY = process.env.GEMINI_API_KEY || ''

// Supported models in priority order (newest first)
// The app automatically tries each in sequence, skipping unavailable/deprecated ones.
// Error messages from the API may hint the correct model (e.g. "use gemini-3.8-flash").
const MODELS = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-pro']

let _client: GoogleGenAI | null = null

function getClient(): GoogleGenAI | null {
  if (!API_KEY) return null
  if (!_client) {
    _client = new GoogleGenAI({ apiKey: API_KEY })
  }
  return _client
}

export async function generateText(prompt: string, systemPrompt?: string): Promise<string> {
  const client = getClient()
  if (!client) return fallbackResponse(prompt)

  const contents = systemPrompt
    ? [{ role: 'user' as const, parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }]
    : [{ role: 'user' as const, parts: [{ text: prompt }] }]

  for (const modelName of MODELS) {
    try {
      const response = await client.models.generateContent({
        model: modelName,
        contents,
      })
      const text = response.text ?? ''
      if (text) return text
    } catch (err: any) {
      const msg = String(err?.message || err || '')
      // Extract suggested model name from API error message, e.g. "use models/gemini-3.8-flash"
      const suggestedMatch = msg.match(/use (?:models\/)?([a-z0-9.\-]+flash[a-z0-9.\-]*)/i)
      if (suggestedMatch) {
        const suggested = suggestedMatch[1]
        if (!MODELS.includes(suggested)) {
          MODELS.splice(MODELS.indexOf(modelName) + 1, 0, suggested)
        }
      }
      // Model deprecated/not found/quota — try next
      if (msg.includes('not found') || msg.includes('404') || msg.includes('quota') ||
          msg.includes('no longer available') || msg.includes('deprecated')) {
        console.warn(`Gemini [${modelName}] unavailable, trying next model`)
        continue
      }
      // Auth or hard error — stop
      console.error(`Gemini [${modelName}] error:`, msg)
      break
    }
  }

  return fallbackResponse(prompt)
}

export async function extractResumeData(text: string): Promise<Record<string, any>> {
  const prompt = `Extract structured data from this resume text. Return ONLY valid JSON with these exact fields:
{
  "name": "Full Name",
  "email": "email@example.com or null",
  "phone": "phone number or null",
  "designation": "current/target job title",
  "skills": ["skill1", "skill2"],
  "experience": "X years",
  "experienceYears": 0,
  "education": ["Degree from University, Year"],
  "projects": ["Project Name: brief description"],
  "summary": "2-3 sentence professional summary"
}

Resume text:
${text.slice(0, 8000)}`

  const client = getClient()
  if (!client) return extractBasicData(text)

  for (const modelName of MODELS) {
    try {
      const response = await client.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      })
      const responseText = response.text ?? ''
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return parsed
      }
    } catch (err: any) {
      const msg = String(err?.message || err || '')
      const suggestedMatch = msg.match(/use (?:models\/)?([a-z0-9.\-]+flash[a-z0-9.\-]*)/i)
      if (suggestedMatch) {
        const suggested = suggestedMatch[1]
        if (!MODELS.includes(suggested)) MODELS.splice(MODELS.indexOf(modelName) + 1, 0, suggested)
      }
      if (msg.includes('not found') || msg.includes('404') || msg.includes('quota') ||
          msg.includes('no longer available') || msg.includes('deprecated')) continue
      console.error(`Resume extraction [${modelName}] error:`, msg)
      break
    }
  }

  return extractBasicData(text)
}

// ─── Fallback: rule-based responses when Gemini is unavailable ───────────────

function fallbackResponse(prompt: string): string {
  const lower = prompt.toLowerCase()
  if (lower.includes('apply') || lower.includes('application')) {
    return 'I have recorded your application. Please note this is a simulation — no real application is submitted to the employer.'
  }
  if (lower.includes('skill') || lower.includes('job') || lower.includes('match')) {
    return 'Based on your profile, I found several matching jobs. Upload your resume to get AI-powered personalized recommendations.'
  }
  return "I understand your request. I'm currently running in rule-based mode. Upload your resume to find matching jobs, or ask me to show your applications."
}

export function extractBasicData(text: string): Record<string, any> {
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.\w+/)
  const phoneMatch = text.match(/[\+]?[\d\s\-\(\)]{10,15}/)
  const lines = text.split('\n').filter(l => l.trim())
  const name = lines[0]?.trim() || 'Unknown'

  // ── Skills detection ──
  const skillKeywords = [
    'javascript', 'typescript', 'python', 'react', 'node', 'java', 'c++', 'sql',
    'html', 'css', 'git', 'docker', 'kubernetes', 'aws', 'mongodb', 'postgresql',
    'redis', 'next.js', 'vue', 'angular', 'express', 'django', 'flask', 'spring',
    'graphql', 'rest', 'golang', 'rust', 'swift', 'kotlin', 'flutter', 'pytorch',
    'tensorflow', 'machine learning', 'deep learning', 'nlp',
  ]
  const foundSkills = skillKeywords.filter(skill => text.toLowerCase().includes(skill))

  // ── Education detection (section-based) ──
  const education: string[] = []
  const eduKeywords = ['bachelor', 'master', 'b.tech', 'm.tech', 'b.e.', 'm.e.', 'bsc', 'msc',
    'phd', 'diploma', 'b.sc', 'm.sc', 'engineering', 'university', 'college', 'institute']
  const eduSectionPattern = /(?:education|academic|qualification)/i
  const textLower = text.toLowerCase()
  
  if (eduSectionPattern.test(textLower)) {
    const eduIdx = textLower.search(eduSectionPattern)
    const eduSection = text.slice(eduIdx, eduIdx + 800)
    const eduLines = eduSection.split('\n').filter(l => l.trim().length > 5)
    for (const line of eduLines.slice(1, 6)) {
      const lineLower = line.toLowerCase()
      if (eduKeywords.some(kw => lineLower.includes(kw))) {
        education.push(line.trim())
      }
      if (education.length >= 3) break
    }
  }

  // Fallback: keyword sweep across all lines
  if (education.length === 0) {
    for (const line of lines) {
      const lineLower = line.toLowerCase()
      if (eduKeywords.some(kw => lineLower.includes(kw)) && line.length > 10) {
        education.push(line.trim())
        if (education.length >= 3) break
      }
    }
  }

  // ── Projects detection (section-based) ──
  const projects: string[] = []
  const projSectionPattern = /(?:project|work experience|portfolio|personal work)/i
  
  if (projSectionPattern.test(textLower)) {
    const projIdx = textLower.search(projSectionPattern)
    const projSection = text.slice(projIdx, projIdx + 1200)
    const projLines = projSection.split('\n').filter(l => l.trim().length > 10)
    for (const line of projLines.slice(1, 8)) {
      const lineLower = line.toLowerCase()
      // Skip section headers and generic lines
      if (projSectionPattern.test(lineLower)) continue
      if (line.trim().length > 15 && !lineLower.startsWith('•') && !lineLower.startsWith('-')) {
        projects.push(line.trim().slice(0, 100))
        if (projects.length >= 4) break
      } else if ((line.startsWith('•') || line.startsWith('-')) && line.length > 20) {
        projects.push(line.trim().slice(0, 100))
        if (projects.length >= 4) break
      }
    }
  }

  // ── Experience years ──
  const expMatch = text.match(/(\d+)\s*(?:\+\s*)?years?\s+(?:of\s+)?(?:experience|exp)/i)
  const experienceYears = expMatch ? parseInt(expMatch[1]) : 0
  const experience = experienceYears > 0 ? `${experienceYears} years` : '0-2 years'

  return {
    name,
    email: emailMatch?.[0] || null,
    phone: phoneMatch?.[0]?.trim() || null,
    designation: 'Software Developer',
    skills: foundSkills.length ? foundSkills : ['JavaScript', 'React', 'Node.js'],
    experience,
    experienceYears,
    education,
    projects,
    summary: `Candidate with skills in ${foundSkills.slice(0, 3).join(', ') || 'software development'}.`,
  }
}
