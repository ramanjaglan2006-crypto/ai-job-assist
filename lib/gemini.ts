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

  return {
    name,
    email: emailMatch?.[0] || null,
    phone: phoneMatch?.[0]?.trim() || null,
    designation: 'Software Developer',
    skills: foundSkills.length ? foundSkills : ['JavaScript', 'React', 'Node.js'],
    experience: '0-2 years',
    experienceYears: 1,
    education: [],
    projects: [],
    summary: `Candidate with skills in ${foundSkills.slice(0, 3).join(', ')}.`,
  }
}

