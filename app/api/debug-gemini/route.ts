import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Temporary debug endpoint — reveals only key presence and prefix, never the full key
export async function GET() {
  const key = process.env.GEMINI_API_KEY || ''
  const present = key.length > 10
  const prefix = present ? key.slice(0, 6) + '...' : '(empty)'

  if (!present) {
    return NextResponse.json({ status: 'missing', message: 'GEMINI_API_KEY is not set or empty' })
  }

  // Try a real Gemini API call
  try {
    const { GoogleGenAI } = await import('@google/genai')
    const ai = new GoogleGenAI({ apiKey: key })
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: 'Reply with exactly the word: WORKING' }] }],
    })
    const text = response.text?.trim() || ''
    return NextResponse.json({
      status: 'ok',
      keyPrefix: prefix,
      geminiResponse: text,
      geminiActive: text.includes('WORKING'),
    })
  } catch (err: any) {
    return NextResponse.json({
      status: 'error',
      keyPrefix: prefix,
      error: err?.message || String(err),
    })
  }
}
