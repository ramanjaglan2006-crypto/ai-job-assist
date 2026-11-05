import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Debug endpoint — tests key presence and ONE live API call per source
// Use sparingly: only 25 JSearch calls available
export async function GET() {
  const results: Record<string, any> = {}

  // ── Adzuna ──────────────────────────────────────────────────────────────────
  const adzunaId  = process.env.ADZUNA_APP_ID  || ''
  const adzunaKey = process.env.ADZUNA_APP_KEY || ''
  results.adzuna = { keyPresent: !!(adzunaId && adzunaKey), prefix: adzunaId.slice(0, 4) + '...' }
  if (adzunaId && adzunaKey) {
    try {
      const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${adzunaId}&app_key=${adzunaKey}&results_per_page=3&what=software+developer&content-type=application/json`
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
      const data = await res.json()
      if (data.results?.length) {
        results.adzuna.status = '✅ Working'
        results.adzuna.count  = data.__CLASS__ ? data.count : data.results.length
        results.adzuna.sample = `${data.results[0].title} @ ${data.results[0].company?.display_name}`
      } else {
        results.adzuna.status = '⚠️ No results'
        results.adzuna.raw    = JSON.stringify(data).slice(0, 200)
      }
    } catch (e: any) {
      results.adzuna.status = '❌ Error: ' + e.message
    }
  }

  // ── JSearch ──────────────────────────────────────────────────────────────────
  const jsearchKey = process.env.JSEARCH_API_KEY || ''
  results.jsearch = { keyPresent: !!jsearchKey, prefix: jsearchKey.slice(0, 8) + '...' }
  if (jsearchKey) {
    try {
      const res = await fetch(
        'https://jsearch.p.rapidapi.com/search?query=software+developer+india&page=1&num_pages=1',
        {
          headers: {
            'X-RapidAPI-Key':  jsearchKey,
            'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
          },
          signal: AbortSignal.timeout(10000),
        }
      )
      const data = await res.json()
      if (data.data?.length) {
        results.jsearch.status = '✅ Working'
        results.jsearch.count  = data.data.length
        results.jsearch.sample = `${data.data[0].job_title} @ ${data.data[0].employer_name}`
      } else {
        results.jsearch.status = '⚠️ No results'
        results.jsearch.raw    = JSON.stringify(data).slice(0, 200)
      }
    } catch (e: any) {
      results.jsearch.status = '❌ Error: ' + e.message
    }
  }

  // ── Gemini ───────────────────────────────────────────────────────────────────
  const geminiKey = process.env.GEMINI_API_KEY || ''
  results.gemini = { keyPresent: !!geminiKey, prefix: geminiKey.slice(0, 6) + '...' }

  return NextResponse.json(results, { status: 200 })
}
