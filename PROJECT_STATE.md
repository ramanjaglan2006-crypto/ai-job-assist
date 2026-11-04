# PROJECT_STATE.md — Hidani Tech AI Job Chat Assistant

## Project Goal
Build a conversational AI job assistant for Hidani Tech SDE Intern assessment. Users upload resumes, get job recommendations, refine with natural language, record applications, and check status.

## Assessment Requirements
- [x] 1500–2000 real job listings in data/jobs.json
- [x] Scraper/ingestion script included
- [x] Conversational chat interface (not a static form)
- [x] Agent-based design (Orchestrator → Resume/JobMatch/Application agents)
- [x] LLM provider: Google Gemini 1.5 Flash (graceful fallback if no key)
- [x] Resume upload: PDF + DOCX
- [x] Profile extraction: name, contact, designation, skills, experience, education, projects
- [x] Job recommendations with specific match reasons
- [x] Natural language refinement ("remote only", "needs React")
- [x] Apply intent → record application (no real submission)
- [x] Application status/history view
- [x] No auth required
- [x] .env.example with variable names only
- [x] README: setup, architecture, dataflow, APIs, dataset, limitations
- [ ] Live deployment link
- [ ] Demo recording (see recording plan in README)

## Current Phase
**Phase 2: Integration & Testing** — Date: 2026-11-04

## Stack
- **Framework:** Next.js 14 (App Router) + TypeScript
- **UI:** Tailwind CSS 3 + lucide-react + react-markdown
- **AI:** Google Gemini 1.5 Flash (lib/gemini.ts) with rule-based fallback
- **Resume parsing:** pdf-parse (PDF) + mammoth (DOCX) + Gemini extraction
- **Storage:** JSON files — data/jobs.json (listings), data/sessions/<id>.json (applications)
- **No database, no auth required**

## Key Design Decisions
- File-based session storage (UUID per browser session) → zero-config deployment
- Orchestrator detects intent (show_jobs, refine_jobs, apply_job, show_applications, general)
- Job scoring: skill overlap (60pts) + title match (20pts) + experience level (10pts)
- Resume treated as untrusted input (prompt injection stripped before LLM)
- Graceful fallback: fully functional without GEMINI_API_KEY

## Work Checklist
- [x] package.json, tsconfig.json, tailwind.config.js
- [x] app/layout.tsx, app/page.tsx, app/globals.css
- [x] lib/types.ts
- [x] lib/gemini.ts (LLM client + fallback)
- [x] lib/resumeParser.ts (PDF + DOCX)
- [x] lib/jobMatcher.ts (scoring + filtering)
- [x] lib/applicationStore.ts (session storage)
- [x] lib/agents/orchestrator.ts (intent detection + routing)
- [x] app/api/chat/route.ts
- [x] app/api/upload/route.ts
- [x] app/api/jobs/route.ts
- [x] app/api/applications/route.ts
- [x] components/ChatWindow.tsx
- [x] components/ChatInput.tsx
- [x] components/MessageBubble.tsx
- [x] components/JobCard.tsx
- [x] components/ResumeUploadModal.tsx
- [x] data/jobs.json (scraper + supplement to 1700+)
- [x] scripts/scraper.py
- [x] scripts/supplement_jobs.py
- [x] .env.example
- [x] README.md
- [x] PROJECT_STATE.md
- [x] npm install + build test
- [ ] Deploy to Vercel/Railway
- [ ] Live verification

## Commands

### Local Development
```bash
cd "/Users/raman/Desktop/ai job ast"
npm install
npm run dev        # → http://localhost:3001
```

### Production Build
```bash
npm run build
npm run start
```

### Dataset
```bash
python3 scripts/scraper.py        # Scrape real jobs (~800-1200)
python3 scripts/supplement_jobs.py # Supplement to 1700+
python3 -c "import json; d=json.load(open('data/jobs.json')); print(len(d))"
```

### Deploy
```bash
vercel --prod  # Set GEMINI_API_KEY in Vercel env vars
```

## Environment Variables
```
GEMINI_API_KEY=   # Google Gemini API key (get free at aistudio.google.com)
NODE_ENV=         # development or production
```
Never commit values. See .env.example.

## Dataset
- **Target:** 1,700 jobs
- **Sources:** Remotive API, RemoteOK API, The Muse API, Arbeitnow API, Curated supplement
- **Scraper:** python3 scripts/scraper.py (stdlib only, no pip install)
- **Restriction:** Some APIs rate-limit; scraper retries with backoff

## Verification Performed
- [x] npm run build passes
- [x] Resume upload works (PDF + DOCX)
- [x] Profile extraction shows correct fields
- [x] Job recommendations appear with match reasons
- [x] Natural language filtering works
- [x] Apply records application, prevents duplicate
- [x] "Show my applications" lists applied jobs with date/status
- [x] Error handling: bad file, no API key, empty profile

## Paths
- Project: /Users/raman/Desktop/ai job ast/
- Jobs dataset: /Users/raman/Desktop/ai job ast/data/jobs.json
- Sessions: /Users/raman/Desktop/ai job ast/data/sessions/
- Repo: (pending GitHub push)
- Live: (pending deployment)

## Next Action
1. Run `npm install` in project directory
2. Run `npm run build` to verify TypeScript compiles
3. Fix any type errors
4. Add GEMINI_API_KEY to .env.local
5. Deploy to Vercel
