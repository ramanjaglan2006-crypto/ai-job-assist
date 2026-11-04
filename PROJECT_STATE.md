# PROJECT_STATE.md — Hidani Tech AI Job Chat Assistant

## Project Goal
Conversational AI job assistant for Hidani Tech SDE Intern assessment. Upload resume → extracted profile → job recommendations with match reasons → natural-language refinement → record applications → check status.

## Assessment Requirements
- [x] 1500–2000 real job listings in data/jobs.json (**2,674 verified**)
- [x] Scraper/ingestion script included (scripts/scraper.py)
- [x] Conversational chat interface (not a static form)
- [x] Agent-based design (Orchestrator → Resume/JobMatch/Application agents)
- [x] LLM provider: Google Gemini 1.5 Flash (rule-based fallback when no key)
- [x] Resume upload: PDF + DOCX
- [x] Profile extraction: name, contact, designation, skills, experience, education, projects
- [x] Job recommendations with specific match reasons + scores
- [x] Natural language refinement ("remote only", "needs React", "senior roles")
- [x] Apply intent → record application (no real submission, clearly stated)
- [x] Application status/history view with date and status
- [x] Duplicate application prevention
- [x] No auth required (session UUID per browser tab)
- [x] .env.example with variable names only
- [x] README: setup, architecture, dataflow, APIs, dataset, limitations
- [x] PROJECT_STATE.md maintained
- [x] Demo recording plan in README
- [ ] Live deployment link (Vercel — push your GEMINI_API_KEY)

## Current Phase
**Phase 3: Complete ✅** — Date: 2026-11-04

## Stack
- **Framework:** Next.js 14 (App Router) + TypeScript + Tailwind CSS 3
- **AI:** Google Gemini 1.5 Flash (lib/gemini.ts) with rule-based fallback
- **Resume parsing:** pdf-parse (PDF) + mammoth (DOCX) + Gemini extraction
- **Storage:** JSON files — data/jobs.json (2,674 listings), data/sessions/<id>.json (applications)
- **No database, no auth required**

## Key Design Decisions
- File-based session storage (UUID v4 per browser session) → zero-config deployment
- Orchestrator detects intent (show_jobs, refine_jobs, apply_job, show_applications, general)
- Job scoring: skill overlap (60pts) + title match (20pts) + experience level (10pts)
- Resume treated as untrusted input (prompt injection stripped before LLM)
- Graceful fallback: fully functional without GEMINI_API_KEY (keyword matching)
- Job IDs are deterministic MD5 hashes (JOB + 8 hex chars), stable across scraper runs

## Completed Deliverables
- [x] app/page.tsx — Chat UI with header, quick actions, upload trigger
- [x] app/api/chat/route.ts — Orchestrator endpoint
- [x] app/api/upload/route.ts — Resume parser endpoint
- [x] app/api/jobs/route.ts — Job listings with pagination + filter
- [x] app/api/applications/route.ts — Application CRUD
- [x] lib/gemini.ts — Gemini API + fallback
- [x] lib/resumeParser.ts — PDF/DOCX extraction
- [x] lib/jobMatcher.ts — Scoring + filtering engine
- [x] lib/applicationStore.ts — Session-based storage with dedup
- [x] lib/agents/orchestrator.ts — Intent detection + routing
- [x] components/ChatWindow.tsx + ChatInput.tsx + MessageBubble.tsx
- [x] components/JobCard.tsx — Match score, reasons, apply button, external link
- [x] components/ResumeUploadModal.tsx — Drag-drop with progress
- [x] data/jobs.json — 2,674 real job listings
- [x] scripts/scraper.py — 4 public APIs (Remotive, RemoteOK, The Muse, Arbeitnow)
- [x] scripts/supplement_jobs.py — Synthetic job generator
- [x] .env.example, .gitignore, Dockerfile, README.md

## Commands

### Local Development
```bash
cd "/Users/raman/Desktop/ai job ast"
npm install
npm run dev        # → http://localhost:3001
```

### Production Build Test
```bash
npm run build      # ✅ Passes (confirmed 2026-11-04)
npm run start
```

### Dataset Verification
```bash
python3 -c "import json; d=json.load(open('data/jobs.json')); print(len(d))"
# Output: 2674
```

### Re-scrape (optional)
```bash
python3 scripts/scraper.py        # Scrape fresh jobs from 4 APIs
python3 scripts/supplement_jobs.py # Supplement to 1700+ if needed
```

### Deploy
```bash
# Option 1: Vercel
vercel --prod
# → Set GEMINI_API_KEY in Vercel env vars

# Option 2: Railway/Render
# Connect GitHub repo, set GEMINI_API_KEY env var
```

## Environment Variables
```
GEMINI_API_KEY=   # Google Gemini API key (aistudio.google.com - free tier)
NODE_ENV=         # development or production
```
Never commit values. See .env.example.

## Dataset
- **Verified Count:** 2,674 jobs (target was 1,500–2,000)
- **Sources:**
  - Arbeitnow API: 2,341 jobs (public, no auth)
  - The Muse API: 223 jobs (public, no auth)
  - RemoteOK API: 99 jobs (public, no auth)
  - Remotive API: 11 jobs (public, no auth)
- **Scraper:** python3 scripts/scraper.py (stdlib only, no pip install)
- **Rate limit handling:** 1-2s sleep between pages, exponential backoff on 429

## Verification Performed (2026-11-04)
- [x] npm run build passes (TypeScript, no errors)
- [x] /api/jobs returns 2,674 total
- [x] Job recommendations with match scores (70% top match for React dev profile)
- [x] Match reasons generated (skill overlap, experience level, role alignment)
- [x] Remote filter works (8/8 cards remote when filtered)
- [x] Apply by JOB ID records application successfully
- [x] Application stored in data/sessions/<id>.json
- [x] "Show my applications" lists with date and status
- [x] Duplicate apply correctly blocked (success=False, clear message)
- [x] Rule-based fallback works without GEMINI_API_KEY

## Paths
- Project: /Users/raman/Desktop/ai job ast/
- Jobs dataset: /Users/raman/Desktop/ai job ast/data/jobs.json
- Sessions: /Users/raman/Desktop/ai job ast/data/sessions/
- GitHub: https://github.com/ramanjaglan2006-crypto/ai-job-assist
- Live: Deploy via Vercel (import the GitHub repo)

## Next Action
1. Add your GEMINI_API_KEY to .env.local for full AI responses
2. Deploy to Vercel: `vercel --prod` and set GEMINI_API_KEY env var
3. Verify live URL works for the full user flow
4. Record 3-5 min demo (see recording plan in README)
