# Hidani Tech — AI Job Chat Assistant

> **SDE Intern Assessment Project** · Full-stack AI-powered conversational job assistant

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://typescriptlang.org)
[![Gemini AI](https://img.shields.io/badge/AI-Gemini%201.5%20Flash-orange)](https://aistudio.google.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-cyan)](https://tailwindcss.com)

---

## 🎯 Overview

An end-to-end conversational AI job assistant that:
- **Parses** PDF/DOCX resumes and extracts structured profiles
- **Recommends** jobs with specific AI-generated match reasons
- **Refines** results through natural language ("Show only remote roles", "Jobs needing React")
- **Records** applications per session with dedup protection
- **Tracks** applied jobs with status and timestamp

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Next.js UI)                    │
│  ChatWindow ← MessageBubble ← JobCard ← ResumeUploadModal   │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼──────────────────────────────────┐
│                  Next.js API Layer (Node.js)                  │
│   /api/chat   /api/upload   /api/jobs   /api/applications    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Orchestrator Agent                         │
│   Intent Detection → Routes to specialist agent/tool         │
│                                                              │
│   ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│   │ ResumeAgent │  │ JobMatchAgent│  │ ApplicationAgent  │  │
│   │ pdf-parse   │  │ Scoring algo │  │ Session JSON store│  │
│   │ mammoth     │  │ Gemini LLM   │  │ Dedup logic       │  │
│   │ Gemini LLM  │  │ Filter engine│  │                   │  │
│   └─────────────┘  └──────────────┘  └───────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      Data Layer                               │
│   data/jobs.json (1700+ listings)                            │
│   data/sessions/<session-id>.json (per-session applications) │
└──────────────────────────────────────────────────────────────┘
```

### Agent Design

| Agent | Trigger | Tools Used |
|-------|---------|-----------|
| **OrchestratorAgent** | Every chat message | Intent detection, route to sub-agents |
| **ResumeAgent** | File upload | `pdf-parse`, `mammoth`, Gemini extraction |
| **JobMatchAgent** | "show jobs", "find roles", refinement queries | `loadJobs`, `scoreJob`, `filterJobs`, Gemini |
| **ApplicationAgent** | "apply", "my applications" | `applicationStore`, session JSON |

### Dataflow

```
User uploads resume
       ↓
POST /api/upload → parseResume() → Gemini extraction → ParsedResume
       ↓
Chat session stores ParsedResume in React state

User: "Show me React jobs"
       ↓
POST /api/chat → detectIntent() → 'show_jobs'/'refine_jobs'
       ↓
getTopMatches(resume, filters) → scoreJob() per listing → sorted JobCard[]
       ↓
Response includes jobCards array → rendered as UI cards with match reasons
       ↓
User clicks "Apply (Record)" → POST /api/applications
       ↓
applicationStore.addApplication() → data/sessions/<id>.json
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** (tested with 20.x and 24.x)
- **Python 3.8+** (for scraper only)
- **Gemini API key** (free at [aistudio.google.com](https://aistudio.google.com)) — optional, app works without it

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/hidani-job-assistant
cd hidani-job-assistant
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
# Edit .env.local and add your GEMINI_API_KEY (optional but recommended)
```

### 3. Start Development Server

```bash
npm run dev
# → http://localhost:3001
```

### 4. Use the App

1. Open `http://localhost:3001`
2. Click **Upload Resume** → drag & drop your PDF or DOCX
3. Review the extracted profile
4. Ask for jobs: *"Show me matching jobs"*
5. Refine: *"Only remote positions"* or *"Jobs needing Python"*
6. Apply: click **Apply (Record)** on any job card or type *"Apply me to [job title]"*
7. Check status: *"Show my applications"*

---

## 🗄 Dataset

### Job Count & Sources

| Source | Type | Jobs | Access |
|--------|------|------|--------|
| Remotive API | Public REST API | ~300 | No auth required |
| RemoteOK API | Public REST API | ~150 | No auth required |
| The Muse API | Public REST API | ~600 | No auth required |
| Arbeitnow API | Public REST API | ~200 | No auth required |
| Curated supplement | Generated | ~450 | Offline |
| **Total** | | **~1,700** | |

> **Verified count:** Run `python3 -c "import json; d=json.load(open('data/jobs.json')); print(len(d))"` to verify.

### Job Schema (`data/jobs.json`)

```json
{
  "id": "JOB1A2B3C4D",
  "title": "Senior Frontend Engineer",
  "company": "Stripe",
  "location": "Remote",
  "remote": true,
  "experience": "3-5 years",
  "skills": ["React", "TypeScript", "GraphQL", "CSS"],
  "description": "...",
  "sourceUrl": "https://stripe.com/jobs/listing/...",
  "salary": "$160k-$220k/yr",
  "jobType": "Full-time",
  "postedAt": "2026-10-28T12:00:00Z",
  "source": "Remotive"
}
```

### Running the Scraper

```bash
# Install (no extra packages needed — uses Python stdlib only)
python3 scripts/scraper.py

# Optional: supplement to 1700+ listings
python3 scripts/supplement_jobs.py

# Verify count
python3 -c "import json; d=json.load(open('data/jobs.json')); print(f'{len(d)} jobs')"
```

**Sources & Terms:**
- [Remotive API](https://remotive.com/api) — public, free, no TOS restriction on reasonable use
- [RemoteOK API](https://remoteok.com/api) — public JSON endpoint
- [The Muse API](https://www.themuse.com/developers/api/v2) — free tier, public
- [Arbeitnow API](https://arbeitnow.com/api) — free public API
- Curated supplement uses realistic but synthetic data, clearly labeled as `"source": "Curated"`

**Rate Limit Handling:** The scraper sleeps 1–2s between requests and retries with exponential backoff on 429 errors.

---

## ⚙ Configuration

### Environment Variables (`.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Recommended | Google Gemini 1.5 Flash API key (free tier) |
| `OPENAI_API_KEY` | No | OpenAI fallback (optional) |
| `NODE_ENV` | No | `development` or `production` |

### LLM Provider

**Primary:** Google Gemini 1.5 Flash — fast, free tier (60 req/min), excellent for structured extraction.

**Fallback (no API key):** Rule-based extraction and keyword matching. The app is fully functional without an LLM — resume parsing uses regex, job matching uses keyword scoring. Only conversational quality degrades.

---

## 🧪 Session Data & Reset

- **Storage:** `data/sessions/<session-uuid>.json` per browser session
- **Persistence:** Session ID is stored in React state; refreshing starts a fresh session
- **Reset:** Delete files in `data/sessions/` or simply refresh the page
- **Demo:** Every new browser tab is a fresh session — no login required
- **Privacy:** Resume text is processed server-side and not persisted to disk

---

## 🚢 Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel --prod
```

**Important:** Set `GEMINI_API_KEY` in Vercel environment variables.  
**Note:** Vercel serverless has ephemeral filesystem — sessions reset between invocations. For production, migrate `applicationStore.ts` to a KV store (Vercel KV / Redis / Supabase).

### Docker

```bash
docker build -t hidani-job-assistant .
docker run -p 3001:3001 -e GEMINI_API_KEY=xxx hidani-job-assistant
```

### Railway / Render

Connect GitHub repo → set `GEMINI_API_KEY` env var → deploy.

---

## 📂 Project Structure

```
├── app/
│   ├── page.tsx                 # Main chat interface
│   ├── layout.tsx               # Root layout
│   ├── globals.css              # Tailwind + custom styles
│   └── api/
│       ├── chat/route.ts        # POST /api/chat → orchestrator
│       ├── upload/route.ts      # POST /api/upload → resume parser
│       ├── jobs/route.ts        # GET /api/jobs
│       └── applications/route.ts # GET/POST /api/applications
├── components/
│   ├── ChatWindow.tsx           # Message list + input
│   ├── ChatInput.tsx            # Textarea + send button
│   ├── MessageBubble.tsx        # Renders messages + job cards
│   ├── JobCard.tsx              # Individual job recommendation card
│   └── ResumeUploadModal.tsx    # Drag-and-drop upload modal
├── lib/
│   ├── types.ts                 # TypeScript interfaces
│   ├── gemini.ts                # Gemini API client + fallback
│   ├── resumeParser.ts          # PDF/DOCX extraction
│   ├── jobMatcher.ts            # Scoring + filtering engine
│   ├── applicationStore.ts      # Session-based application storage
│   └── agents/
│       └── orchestrator.ts      # Intent detection + routing
├── data/
│   ├── jobs.json                # 1700+ job listings
│   └── sessions/                # Per-session application records
├── scripts/
│   ├── scraper.py               # Job scraper (4 public APIs)
│   └── supplement_jobs.py       # Synthetic job generator
├── .env.example                 # Required env vars (no values)
├── PROJECT_STATE.md             # Project state for fast continuation
└── README.md                    # This file
```

---

## 🎬 Demo Recording Plan

Since recording requires screen capture software, here is the **5-step recording script**:

1. **(0:00–0:30)** Open the app. Show the welcome message and empty state.
2. **(0:30–1:30)** Click "Upload Resume" → upload a PDF → watch the parsing animation → show extracted profile in chat.
3. **(1:30–2:30)** Type "Show me jobs matching my profile" → show job cards with match reasons and scores.
4. **(2:30–3:30)** Type "Show only remote roles" → refined results. Then "Jobs needing React" → further filter.
5. **(3:30–4:30)** Click "Apply (Record)" on a job → see confirmation. Type "Show my applications" → see the application list with status and date.

**Tools to record:** OBS Studio (free), QuickTime (mac), or Loom.

---

## ⚠️ Known Limitations

1. **Session persistence:** Application records reset on page refresh (by design for demo; Vercel deploys may reset between requests)
2. **Scraper access:** Some public APIs occasionally return fewer results due to rate limits or downtime
3. **Resume image PDFs:** Scanned PDFs without OCR cannot be parsed — the app surfaces a clear error
4. **LLM hallucination:** Resume extraction uses Gemini; always allow users to correct extracted fields
5. **Dataset freshness:** Curated supplement jobs have realistic but synthetic details; source links point to company careers pages

---

## 🛡 Security Notes

- Resume text is treated as **untrusted input** — prompt injection patterns are stripped before LLM calls
- API keys are in `.env.local` (gitignored) — never committed
- Session IDs use UUID v4 — not guessable
- No real job applications are submitted; this is explicitly stated in the UI

---

*Built for Hidani Tech SDE Intern Assessment · November 2026*
