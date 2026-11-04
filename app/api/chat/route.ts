import { NextRequest, NextResponse } from 'next/server'
import { handleChat } from '@/lib/agents/orchestrator'
import { ChatRequest } from '@/lib/types'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as ChatRequest
    
    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    if (!body.sessionId || typeof body.sessionId !== 'string') {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // Security: truncate overly long messages
    body.message = body.message.slice(0, 1000)

    const response = await handleChat(body)
    return NextResponse.json(response)
  } catch (err: any) {
    console.error('Chat API error:', err)
    return NextResponse.json({ error: 'Internal server error', reply: 'An error occurred. Please try again.' }, { status: 500 })
  }
}

