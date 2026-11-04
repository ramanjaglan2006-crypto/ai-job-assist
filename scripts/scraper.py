#!/usr/bin/env python3
"""
Hidani Tech AI Job Assistant - Job Scraper
Sources: RemoteOK API, The Muse API, Himalayas API (all public, no auth required)
Run: python3 scripts/scraper.py
"""

import json
import time
import hashlib
import logging
import os
import re
from datetime import datetime
from typing import Optional
import urllib.request
import urllib.error
import html

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger(__name__)

OUTPUT_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'jobs.json')
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (compatible; HidaniJobBot/1.0; +https://github.com/hidanitech)',
    'Accept': 'application/json',
}

def fetch_url(url: str, retries: int = 3, timeout: int = 15) -> Optional[dict | list]:
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                return data
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 60 * (attempt + 1)
                log.warning(f"Rate limited on {url}, waiting {wait}s")
                time.sleep(wait)
            else:
                log.error(f"HTTP {e.code} on {url}: {e.reason}")
                return None
        except Exception as e:
            log.warning(f"Attempt {attempt+1}/{retries} failed for {url}: {e}")
            if attempt < retries - 1:
                time.sleep(5 * (attempt + 1))
    return None

def make_job_id(title: str, company: str) -> str:
    raw = f"{title.lower().strip()}-{company.lower().strip()}"
    return 'JOB' + hashlib.md5(raw.encode()).hexdigest()[:8].upper()

def clean_html(text: str) -> str:
    if not text:
        return ''
    text = re.sub(r'<[^>]+>', ' ', text)
    text = html.unescape(text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:800]

def extract_skills_from_text(text: str) -> list:
    tech_skills = [
        'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin',
        'React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring Boot',
        'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'SQLite',
        'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD',
        'GraphQL', 'REST', 'gRPC', 'WebSocket',
        'TensorFlow', 'PyTorch', 'scikit-learn', 'Pandas', 'NumPy',
        'Git', 'Linux', 'Agile', 'Scrum', 'Figma', 'Tailwind CSS', 'HTML', 'CSS'
    ]
    found = []
    lower = text.lower()
    for skill in tech_skills:
        if skill.lower() in lower:
            found.append(skill)
    return found[:10]

def parse_experience(text: str) -> str:
    if not text:
        return '0-2 years'
    text = text.lower()
    patterns = [
        (r'(\d+)\+?\s*years?', lambda m: f"{m.group(1)}+ years"),
        (r'(\d+)\s*-\s*(\d+)\s*years?', lambda m: f"{m.group(1)}-{m.group(2)} years"),
        (r'entry.?level', lambda m: '0-1 years'),
        (r'junior', lambda m: '0-2 years'),
        (r'mid.?level', lambda m: '2-5 years'),
        (r'senior', lambda m: '5+ years'),
    ]
    for pattern, formatter in patterns:
        match = re.search(pattern, text)
        if match:
            return formatter(match)
    return '0-2 years'

# ── Source 1: RemoteOK ────────────────────────────────────────────────────────
def scrape_remoteok() -> list:
    log.info("Fetching from RemoteOK API...")
    data = fetch_url('https://remoteok.com/api')
    if not data or not isinstance(data, list):
        log.warning("RemoteOK returned no data")
        return []
    
    jobs = []
    for item in data:
        if not isinstance(item, dict) or 'position' not in item:
            continue
        try:
            title = clean_html(item.get('position', ''))
            company = clean_html(item.get('company', 'Unknown Company'))
            if not title or not company:
                continue
            
            tags = item.get('tags', []) or []
            description = clean_html(item.get('description', ''))
            skills = [t for t in tags if isinstance(t, str) and len(t) < 30]
            if not skills:
                skills = extract_skills_from_text(description)
            
            job = {
                'id': make_job_id(title, company),
                'title': title,
                'company': company,
                'location': 'Remote',
                'remote': True,
                'experience': parse_experience(description),
                'skills': skills[:10],
                'description': description[:600] or f"{title} role at {company}",
                'sourceUrl': item.get('url', f"https://remoteok.com/remote-jobs/{item.get('id', '')}"),
                'salary': item.get('salary_min') and f"${item['salary_min']:,}-${item.get('salary_max', item['salary_min']):,}/yr",
                'jobType': 'Full-time',
                'postedAt': item.get('date', datetime.utcnow().isoformat()),
                'source': 'RemoteOK',
            }
            jobs.append(job)
        except Exception as e:
            log.debug(f"Skip RemoteOK item: {e}")
            continue
    
    log.info(f"RemoteOK: {len(jobs)} jobs")
    return jobs

# ── Source 2: The Muse ────────────────────────────────────────────────────────
def scrape_muse(pages: int = 20) -> list:
    log.info("Fetching from The Muse API...")
    jobs = []
    
    for page in range(pages):
        url = f"https://www.themuse.com/api/public/jobs?page={page}&descending=true"
        data = fetch_url(url)
        if not data or 'results' not in data:
            break
        
        results = data.get('results', [])
        if not results:
            break
        
        for item in results:
            try:
                title = item.get('name', '')
                company = item.get('company', {}).get('name', 'Unknown')
                if not title or not company:
                    continue
                
                locations = item.get('locations', [])
                location = locations[0].get('name', 'Various') if locations else 'Various'
                is_remote = 'remote' in location.lower() or 'flexible' in location.lower()
                
                cats = item.get('categories', [])
                levels = item.get('levels', [])
                level_name = levels[0].get('name', '') if levels else ''
                
                content_sections = item.get('contents', '') or ''
                description = clean_html(content_sections)
                skills = extract_skills_from_text(description + ' ' + title)
                
                job = {
                    'id': make_job_id(title, company),
                    'title': title,
                    'company': company,
                    'location': location,
                    'remote': is_remote,
                    'experience': parse_experience(level_name),
                    'skills': skills,
                    'description': description[:600] or f"{title} at {company}",
                    'sourceUrl': item.get('refs', {}).get('landing_page', 'https://www.themuse.com/jobs'),
                    'salary': None,
                    'jobType': 'Full-time',
                    'postedAt': item.get('publication_date', datetime.utcnow().isoformat()),
                    'source': 'The Muse',
                }
                jobs.append(job)
            except Exception as e:
                log.debug(f"Skip Muse item: {e}")
                continue
        
        log.info(f"  Muse page {page+1}: {len(results)} results")
        time.sleep(1)
    
    log.info(f"The Muse: {len(jobs)} jobs")
    return jobs

# ── Source 3: Remotive ────────────────────────────────────────────────────────
def scrape_remotive() -> list:
    log.info("Fetching from Remotive API...")
    data = fetch_url('https://remotive.com/api/remote-jobs?limit=500')
    if not data or 'jobs' not in data:
        log.warning("Remotive returned no data")
        return []
    
    jobs = []
    for item in data.get('jobs', []):
        try:
            title = item.get('title', '')
            company = item.get('company_name', 'Unknown')
            if not title or not company:
                continue
            
            description = clean_html(item.get('description', ''))
            tags = item.get('tags', []) or []
            skills = tags if tags else extract_skills_from_text(description)
            
            job = {
                'id': make_job_id(title, company),
                'title': title,
                'company': company,
                'location': item.get('candidate_required_location', 'Remote') or 'Remote',
                'remote': True,
                'experience': parse_experience(description),
                'skills': [str(s) for s in skills[:10]],
                'description': description[:600] or f"{title} role at {company}",
                'sourceUrl': item.get('url', 'https://remotive.com'),
                'salary': item.get('salary', '') or None,
                'jobType': item.get('job_type', 'Full-time'),
                'postedAt': item.get('publication_date', datetime.utcnow().isoformat()),
                'source': 'Remotive',
            }
            jobs.append(job)
        except Exception as e:
            log.debug(f"Skip Remotive item: {e}")
            continue
    
    log.info(f"Remotive: {len(jobs)} jobs")
    return jobs

# ── Source 4: Arbeitnow ───────────────────────────────────────────────────────
def scrape_arbeitnow(pages: int = 10) -> list:
    log.info("Fetching from Arbeitnow API...")
    jobs = []
    
    for page in range(1, pages + 1):
        url = f"https://arbeitnow.com/api/job-board-api?page={page}"
        data = fetch_url(url)
        if not data or 'data' not in data:
            break
        
        for item in data.get('data', []):
            try:
                title = item.get('title', '')
                company = item.get('company_name', 'Unknown')
                if not title or not company:
                    continue
                
                description = clean_html(item.get('description', ''))
                tags = item.get('tags', []) or []
                skills = [str(t) for t in tags] if tags else extract_skills_from_text(description)
                location = item.get('location', 'Remote')
                is_remote = item.get('remote', False) or 'remote' in location.lower()
                
                job = {
                    'id': make_job_id(title, company),
                    'title': title,
                    'company': company,
                    'location': location,
                    'remote': is_remote,
                    'experience': parse_experience(description),
                    'skills': skills[:10],
                    'description': description[:600] or f"{title} at {company}",
                    'sourceUrl': item.get('url', 'https://arbeitnow.com'),
                    'salary': None,
                    'jobType': item.get('job_types', ['Full-time'])[0] if item.get('job_types') else 'Full-time',
                    'postedAt': datetime.utcfromtimestamp(item.get('created_at', time.time())).isoformat() if item.get('created_at') else datetime.utcnow().isoformat(),
                    'source': 'Arbeitnow',
                }
                jobs.append(job)
            except Exception as e:
                log.debug(f"Skip Arbeitnow item: {e}")
                continue
        
        time.sleep(1)
    
    log.info(f"Arbeitnow: {len(jobs)} jobs")
    return jobs

# ── Deduplication ─────────────────────────────────────────────────────────────
def deduplicate(jobs: list) -> list:
    seen_ids = set()
    seen_combos = set()
    unique = []
    
    for job in jobs:
        jid = job.get('id', '')
        combo = f"{job.get('title','').lower().strip()}|{job.get('company','').lower().strip()}"
        
        if jid in seen_ids or combo in seen_combos:
            continue
        
        seen_ids.add(jid)
        seen_combos.add(combo)
        unique.append(job)
    
    return unique

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    log.info("=" * 60)
    log.info("Hidani Tech Job Scraper — Starting")
    log.info("=" * 60)
    
    all_jobs = []
    
    # Source 1: RemoteOK
    try:
        rjobs = scrape_remoteok()
        all_jobs.extend(rjobs)
    except Exception as e:
        log.error(f"RemoteOK failed: {e}")
    
    time.sleep(2)
    
    # Source 2: Remotive
    try:
        remotive_jobs = scrape_remotive()
        all_jobs.extend(remotive_jobs)
    except Exception as e:
        log.error(f"Remotive failed: {e}")
    
    time.sleep(2)
    
    # Source 3: The Muse
    try:
        muse_jobs = scrape_muse(pages=15)
        all_jobs.extend(muse_jobs)
    except Exception as e:
        log.error(f"The Muse failed: {e}")
    
    time.sleep(2)
    
    # Source 4: Arbeitnow
    try:
        arbeit_jobs = scrape_arbeitnow(pages=10)
        all_jobs.extend(arbeit_jobs)
    except Exception as e:
        log.error(f"Arbeitnow failed: {e}")
    
    # Deduplicate
    unique_jobs = deduplicate(all_jobs)
    log.info(f"\nTotal collected: {len(all_jobs)} | After dedup: {len(unique_jobs)}")
    
    # Save
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(unique_jobs, f, indent=2, ensure_ascii=False)
    
    log.info(f"Saved {len(unique_jobs)} jobs to {OUTPUT_PATH}")
    log.info("=" * 60)
    
    # Summary
    by_source = {}
    for j in unique_jobs:
        src = j.get('source', 'Unknown')
        by_source[src] = by_source.get(src, 0) + 1
    
    log.info("By source:")
    for src, count in sorted(by_source.items(), key=lambda x: -x[1]):
        log.info(f"  {src}: {count}")
    
    if len(unique_jobs) < 1500:
        log.warning(f"\n⚠️  Only {len(unique_jobs)} jobs collected (target: 1500-2000).")
        log.warning("   Some sources may have been rate-limited or unavailable.")
        log.warning("   Run again later or add ADZUNA_APP_ID/ADZUNA_APP_KEY to .env for more jobs.")

if __name__ == '__main__':
    main()
