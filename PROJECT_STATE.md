# Hidani Tech AI Job Assistant — Project State

## Live URL
https://hidani-job-assistant.vercel.app

## GitHub
https://github.com/ramanjaglan2006-crypto/ai-job-assist

## Vercel Project
`ramanjaglan2006-cryptos-projects/hidani-job-assistant`

---

## Current State: DEPLOYED ✅

### Pages
| Page | Route | Description |
|------|-------|-------------|
| Chat | `/` | AI chatbot, resume upload, job recommendations |
| Jobs | `/jobs` | Browse, search, filter 2,674 real jobs |
| My Applications | `/applications` | Application dashboard with status badges |

### Navigation
- Shared `AppNav` header on all pages (Chat / Jobs / My Applications)
- Active page highlighted
- Mobile hamburger menu

### Session Sharing
- `useSession` hook: persists session ID in `localStorage` key `hidani_session_id`
- `useResume` hook: persists parsed resume in `sessionStorage` key `hidani_parsed_resume`
- Same session ID used across all three pages

---

## Changes — Latest Commit `ad9ecad`

### 1. Gemini SDK Migration
- **Removed**: `@google/generative-ai` (old SDK, did not reliably support `AQ.` keys)
- **Added**: `@google/genai` v2.32.0 (new official SDK, supports both `AQ.` and legacy `AIza...` keys)
- **Updated**: `lib/gemini.ts` — rewrote to use `GoogleGenAI` from `@google/genai`
  - Model priority: `gemini-2.0-flash` → `gemini-1.5-flash` → `gemini-1.5-pro`
  - Graceful fallback for quota/404/auth errors
  - API key read from `GEMINI_API_KEY` env var (server-side only, never exposed to browser)

### 2. Apply Error Fix
- **Problem**: Clicking "Apply (Record)" on a job card routed through the chat API, which parsed text with regex. This caused 500 errors when job ID extraction failed.
- **Fix**: `app/page.tsx` `onApply` callback now calls `/api/applications` directly (POST with `sessionId` + `jobId`), then shows the result as an assistant message in chat.
- Jobs page already called `/api/applications` directly — no change needed there.

### 3. Education & Projects Parsing
- Enhanced `extractBasicData` fallback in `lib/gemini.ts` with section-based detection
- Finds Education/Academic sections, degree keywords, and Project sections

---

## Changes — Commit `23ae683`

### Multi-page Layout
- Added `components/AppNav.tsx` — sticky header nav
- Added `app/jobs/page.tsx` — Jobs browse page (search, filter, 12-per-page, Load More, Apply)
- Added `app/applications/page.tsx` — Applications dashboard
- Added `hooks/useSession.ts` — localStorage session sharing
- Added `hooks/useResume.ts` — sessionStorage resume sharing
- Modified `app/layout.tsx` — AppNav added globally
- Modified `app/page.tsx` — refactored to use shared hooks

---

## Environment Variables

| Variable | Required | Notes |
|----------|----------|-------|
| `GEMINI_API_KEY` | Optional | Supports `AQ.` (new AI Studio) and `AIza...` (legacy) formats. App fully works without it via rule-based fallback. Set in Vercel project settings. |

> **Never** store the API key in `.env.local` and commit to git. `.env.local` is in `.gitignore`.

---

## Known Limitations
- Vercel serverless `/tmp` is ephemeral — session data (applied jobs) resets on cold starts / redeploys
- For persistent session storage across deploys, a database (e.g. Redis, Vercel KV) would be needed
- Gemini API key on Vercel needs to be a valid key — check format starts with `AQ.` or `AIza` from https://aistudio.google.com/apikey

---

## Next Action
- Verify live deploy at https://hidani-job-assistant.vercel.app
- Test: upload resume → get recommendations → apply to a job → check My Applications page
- If Gemini API key is invalid, generate a new one at https://aistudio.google.com/apikey and update in Vercel: Settings → Environment Variables → GEMINI_API_KEY
