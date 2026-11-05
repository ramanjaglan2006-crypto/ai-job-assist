'use client'

import { useState, useEffect } from 'react'
import { ParsedResume } from '@/lib/types'

const RESUME_KEY = 'hidani_parsed_resume'

/**
 * Persists parsed resume in sessionStorage so it's shared across
 * Chat, Jobs, and My Applications within the same browser tab session.
 * Uses sessionStorage (not localStorage) so sensitive resume data
 * is cleared when the browser tab is closed.
 */
export function useResume(): [ParsedResume | null, (r: ParsedResume | null) => void] {
  const [resume, setResumeState] = useState<ParsedResume | null>(null)

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(RESUME_KEY)
      if (stored) setResumeState(JSON.parse(stored))
    } catch {}
  }, [])

  const setResume = (r: ParsedResume | null) => {
    setResumeState(r)
    try {
      if (r) sessionStorage.setItem(RESUME_KEY, JSON.stringify(r))
      else sessionStorage.removeItem(RESUME_KEY)
    } catch {}
  }

  return [resume, setResume]
}

