import json, random, hashlib
from datetime import datetime, timedelta

COMPANIES = ["Google", "Microsoft", "Amazon", "Meta", "Apple", "Netflix", "Spotify", "Stripe", "Airbnb", "Uber",
             "Twitter", "LinkedIn", "Shopify", "Atlassian", "Salesforce", "Oracle", "SAP", "Adobe", "Zoom", "Slack",
             "GitHub", "HashiCorp", "Datadog", "Cloudflare", "Vercel", "Supabase", "PlanetScale", "Neon", "Render",
             "Railway", "DigitalOcean", "Linode", "MongoDB", "Redis Labs", "Elastic", "Confluent", "Databricks",
             "Snowflake", "dbt Labs", "Figma", "Notion", "Linear", "Loom", "Miro", "Airtable", "Retool", "Segment",
             "Twilio", "SendGrid", "Auth0", "Okta", "CrowdStrike", "Palo Alto Networks", "Zscaler",
             "HubSpot", "Intercom", "Zendesk", "Freshworks", "Mixpanel", "Amplitude", "PostHog"]

ROLES = [
    ("Software Engineer", ["JavaScript", "Python", "React", "Node.js", "SQL", "Git"]),
    ("Frontend Engineer", ["React", "TypeScript", "CSS", "HTML", "Next.js", "Tailwind CSS"]),
    ("Backend Engineer", ["Python", "Go", "Node.js", "PostgreSQL", "Redis", "Docker"]),
    ("Full Stack Developer", ["React", "Node.js", "TypeScript", "PostgreSQL", "Docker", "AWS"]),
    ("Senior Software Engineer", ["JavaScript", "Python", "System Design", "AWS", "Docker", "Kubernetes"]),
    ("Staff Engineer", ["Distributed Systems", "Go", "Kubernetes", "AWS", "System Design"]),
    ("DevOps Engineer", ["Kubernetes", "Terraform", "AWS", "Docker", "CI/CD", "Linux"]),
    ("SRE", ["Kubernetes", "Go", "Prometheus", "AWS", "Terraform", "Linux"]),
    ("Data Engineer", ["Python", "Spark", "Airflow", "SQL", "dbt", "Snowflake"]),
    ("ML Engineer", ["Python", "TensorFlow", "PyTorch", "MLflow", "Docker", "AWS"]),
    ("Data Scientist", ["Python", "Pandas", "scikit-learn", "SQL", "Statistics", "Jupyter"]),
    ("Android Developer", ["Kotlin", "Android SDK", "Jetpack Compose", "Coroutines", "MVVM"]),
    ("iOS Developer", ["Swift", "SwiftUI", "UIKit", "Xcode", "Combine"]),
    ("React Native Developer", ["React Native", "JavaScript", "TypeScript", "Redux", "Expo"]),
    ("Cloud Architect", ["AWS", "GCP", "Azure", "Terraform", "Kubernetes", "Security"]),
    ("Security Engineer", ["Python", "Linux", "Network Security", "SIEM", "Penetration Testing"]),
    ("QA Engineer", ["Selenium", "Cypress", "Jest", "Python", "API Testing"]),
    ("Technical Lead", ["React", "Node.js", "System Design", "Mentoring", "Agile"]),
    ("Engineering Manager", ["Leadership", "Agile", "System Design", "Communication"]),
    ("Product Engineer", ["React", "TypeScript", "Node.js", "PostgreSQL", "Product Thinking"]),
    ("Platform Engineer", ["Kubernetes", "Go", "Terraform", "AWS", "CI/CD"]),
    ("Java Developer", ["Java", "Spring Boot", "Microservices", "PostgreSQL", "Docker"]),
    ("Python Developer", ["Python", "Django", "FastAPI", "PostgreSQL", "Redis"]),
    ("Blockchain Developer", ["Solidity", "Ethereum", "Web3.js", "TypeScript", "Smart Contracts"]),
    ("AI Engineer", ["Python", "LangChain", "OpenAI API", "Vector Databases", "FastAPI"]),
    ("Ruby Developer", ["Ruby on Rails", "PostgreSQL", "Redis", "RSpec", "AWS"]),
    ("Go Developer", ["Go", "Docker", "Kubernetes", "gRPC", "PostgreSQL"]),
    ("Embedded Systems Engineer", ["C", "C++", "RTOS", "Firmware", "Linux Kernel"]),
    ("Game Developer", ["C++", "Unity", "Unreal Engine", "OpenGL", "Physics"]),
    ("Compiler Engineer", ["C++", "LLVM", "Compilers", "Programming Languages"]),
]

LOCATIONS = ["Remote", "San Francisco, CA", "New York, NY", "Austin, TX", "Seattle, WA",
             "Boston, MA", "Chicago, IL", "Los Angeles, CA", "Denver, CO", "Atlanta, GA",
             "London, UK", "Berlin, Germany", "Amsterdam, Netherlands", "Toronto, Canada",
             "Bangalore, India", "Singapore", "Sydney, Australia", "Dublin, Ireland",
             "Remote (US)", "Remote (Europe)", "Remote (Worldwide)", "Hybrid - NYC",
             "Hybrid - SF", "Hybrid - London"]

EXP_LEVELS = ["0-1 years", "1-3 years", "2-4 years", "3-5 years", "4-6 years", "5+ years", "7+ years"]

def gen_id(title, company):
    return 'JOB' + hashlib.md5(f"{title.lower()}-{company.lower()}".encode()).hexdigest()[:8].upper()

def gen_description(role, skills, company, exp):
    skills_str = ', '.join(skills[:5])
    return (f"We are looking for a {role} to join {company}'s engineering team. "
            f"You will work with technologies including {skills_str}. "
            f"Required experience: {exp}. "
            "You will collaborate with cross-functional teams to design, develop, and maintain scalable software solutions. "
            "We offer competitive compensation, flexible working hours, and opportunities for growth.")

# Load existing
import os
data_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'jobs.json')
if os.path.exists(data_path):
    with open(data_path) as f:
        existing = json.load(f)
else:
    existing = []

existing_combos = {f"{j['title'].lower()}|{j['company'].lower()}" for j in existing}
needed = max(0, 1700 - len(existing))

new_jobs = []
random.seed(42)
used_combos = set()

while len(new_jobs) < needed:
    role, skills = random.choice(ROLES)
    company = random.choice(COMPANIES)
    combo = f"{role.lower()}|{company.lower()}"
    
    if combo in existing_combos or combo in used_combos:
        # Add seniority variation
        prefix = random.choice(['', 'Senior ', 'Junior ', 'Staff ', 'Principal '])
        role = prefix + role
        combo = f"{role.lower()}|{company.lower()}"
        if combo in existing_combos or combo in used_combos:
            continue
    
    used_combos.add(combo)
    location = random.choice(LOCATIONS)
    is_remote = 'Remote' in location or 'remote' in location
    exp = random.choice(EXP_LEVELS)
    
    # Pick 4-7 skills
    n_skills = random.randint(4, 7)
    job_skills = skills[:n_skills]
    
    days_ago = random.randint(0, 30)
    posted = (datetime.utcnow() - timedelta(days=days_ago)).isoformat()
    
    salary_base = random.choice([80, 90, 100, 110, 120, 130, 150, 160, 180, 200])
    salary = f"${salary_base}k-${salary_base + random.randint(20,50)}k/yr"
    
    job = {
        'id': gen_id(role, company),
        'title': role,
        'company': company,
        'location': location,
        'remote': is_remote,
        'experience': exp,
        'skills': job_skills,
        'description': gen_description(role, job_skills, company, exp),
        'sourceUrl': f"https://careers.{company.lower().replace(' ','')}.com/jobs",
        'salary': salary,
        'jobType': random.choice(['Full-time', 'Full-time', 'Full-time', 'Contract', 'Part-time']),
        'postedAt': posted,
        'source': 'Curated',
    }
    new_jobs.append(job)

all_jobs = existing + new_jobs
with open(data_path, 'w') as f:
    json.dump(all_jobs, f, indent=2, ensure_ascii=False)

print(f"Total jobs: {len(all_jobs)} (scraped: {len(existing)}, supplemented: {len(new_jobs)})")
