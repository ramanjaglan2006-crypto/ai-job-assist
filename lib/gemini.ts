import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = process.env.GEMINI_API_KEY || ''

let genAI: GoogleGenerativeAI | null = null

function getClient() {
  if (!API_KEY) return null
  if (!genAI) genAI = new GoogleGenerativeAI(API_KEY)
  return genAI
}

export async function generateText(prompt: string, systemPrompt?: string): Promise<string> {
  const client = getClient()
  if (!client) {
    // Graceful fallback: rule-based response
    return fallbackResponse(prompt)
  }

  try {
    const model = client.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: systemPrompt,
    })
    const result = await model.generateContent(prompt)
    return result.response.text()
  } catch (err: any) {
    console.error('Gemini error:', err?.message)
    // Try with gemini-1.0-pro as fallback
    try {
      const model = client.getGenerativeModel({ model: 'gemini-pro' })
      const result = await model.generateContent(prompt)
      return result.response.text()
    } catch {
      return fallbackResponse(prompt)
    }
  }
}

function fallbackResponse(prompt: string): string {
  const lower = prompt.toLowerCase()
  if (lower.includes('apply') || lower.includes('application')) {
    return 'I have recorded your application. Please note this is a simulation — no real application is submitted.'
  }
  if (lower.includes('skill') || lower.includes('job') || lower.includes('match')) {
    return 'Based on your profile, I found several matching jobs. Please configure GEMINI_API_KEY for detailed AI-powered matching.'
  }
  return 'I understand your request. Please configure the GEMINI_API_KEY environment variable for full AI-powered responses.'
}

export async function extractResumeData(text: string): Promise<Record<string, any>> {
  const prompt = `Extract structured data from this resume text. Return ONLY valid JSON with these fields:
{
  "name": "Full Name",
  "email": "email@example.com or null",
  "phone": "phone number or null",
  "designation": "current/target job title",
  "skills": ["skill1", "skill2", ...],
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

  try {
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return extractBasicData(text)
  } catch {
    return extractBasicData(text)
  }
}

function extractBasicData(text: string): Record<string, any> {
  // Rule-based extraction fallback
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.\w+/)
  const phoneMatch = text.match(/[\+]?[\d\s\-\(\)]{10,15}/)
  const lines = text.split('\n').filter(l => l.trim())
  const name = lines[0]?.trim() || 'Unknown'

  const skillKeywords = ['javascript', 'typescript', 'python', 'react', 'node', 'java', 'c++', 'sql',
    'html', 'css', 'git', 'docker', 'kubernetes', 'aws', 'mongodb', 'postgresql', 'redis',
    'next.js', 'vue', 'angular', 'express', 'django', 'flask', 'spring', 'graphql', 'rest']
  const foundSkills = skillKeywords.filter(skill => text.toLowerCase().includes(skill))

  // --- Education extraction ---
  const education: string[] = []
  // Look for Education section header and grab lines after it
  const eduSectionMatch = text.match(
    /(?:education|academic|qualification)[s]?\s*[\n:]([\s\S]*?)(?=\n\s*(?:experience|skills|projects?|work|employment|certifi|achievement|extra|activity|interest|reference|$))/i
  )
  if (eduSectionMatch) {
    const eduLines = eduSectionMatch[1]
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 3 && !/^[-•*|]+$/.test(l))
    education.push(...eduLines.slice(0, 5))
  }
  // Also sweep entire text for degree keywords in case section not found
  if (education.length === 0) {
    const degreeRegex = /(?:b\.?\s*tech|b\.?\s*e\.?|m\.?\s*tech|b\.?\s*sc|m\.?\s*sc|mba|ph\.?\s*d|bachelor|master|diploma|b\.?\s*com|b\.?\s*ca|12th|10th|hsc|ssc)[^\n]*/gi
    const degreeMatches = text.match(degreeRegex)
    if (degreeMatches) education.push(...degreeMatches.slice(0, 3).map(s => s.trim()))
  }

  // --- Projects extraction ---
  const projects: string[] = []
  const projSectionMatch = text.match(
    /(?:projects?|personal projects?|academic projects?|work done)[s]?\s*[\n:]([\s\S]*?)(?=\n\s*(?:education|academic|skills|experience|work|employment|certifi|achievement|extra|activity|interest|reference|$))/i
  )
  if (projSectionMatch) {
    const projLines = projSectionMatch[1]
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 5 && !/^[-•*|]+$/.test(l))
    // Group into project entries — take up to 4 lines
    projects.push(...projLines.slice(0, 4))
  }

  // --- Experience years ---
  let experienceYears = 0
  const expYearsMatch = text.match(/(\d+)\+?\s*years?\s*(?:of\s*)?(?:experience|exp)/i)
  if (expYearsMatch) experienceYears = parseInt(expYearsMatch[1])

  // --- Designation ---
  const titleKeywords = ['software engineer', 'software developer', 'frontend', 'backend', 'full stack',
    'fullstack', 'web developer', 'data scientist', 'ml engineer', 'devops', 'cloud engineer',
    'mobile developer', 'react developer', 'node developer', 'python developer']
  const lowerText = text.toLowerCase()
  const detectedTitle = titleKeywords.find(t => lowerText.includes(t))

  return {
    name,
    email: emailMatch?.[0] || null,
    phone: phoneMatch?.[0]?.trim() || null,
    designation: detectedTitle
      ? detectedTitle.replace(/\b\w/g, c => c.toUpperCase())
      : 'Software Developer',
    skills: foundSkills.length ? foundSkills : ['JavaScript', 'React', 'Node.js'],
    experience: experienceYears > 0 ? `${experienceYears} years` : '0-2 years',
    experienceYears,
    education,
    projects,
    summary: `Candidate with skills in ${foundSkills.slice(0, 3).join(', ')}.`,
  }
}

