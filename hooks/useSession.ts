'use client'

import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'

const SESSION_KEY = 'hidani_session_id'

/**
 * Returns a stable browser session ID persisted in localStorage.
 * The same ID is reused across Chat, Jobs, and My Applications pages
 * so applications recorded on one page always appear on another.
 */
export function useSession(): string {
  const [sessionId, setSessionId] = useState<string>('')

  useEffect(() => {
    let id = localStorage.getItem(SESSION_KEY)
    if (!id) {
      id = uuidv4()
      localStorage.setItem(SESSION_KEY, id)
    }
    setSessionId(id)
  }, [])

  return sessionId
}
