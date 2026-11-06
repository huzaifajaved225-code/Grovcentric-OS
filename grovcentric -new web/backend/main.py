"""Grovcentric demo API. Replace in-memory demo data with persistent services before production."""
import secrets
from datetime import datetime, timezone
from urllib.parse import urlsplit
from uuid import uuid4

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Grovcentric API")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["*"], allow_headers=["*"])
DEMO_USER = {"email": "demo@grovcentric.com", "password": "demo1234", "name": "Sara"}
TOKENS: set[str] = set()
PROJECTS = [
    {"id": "project-bakery", "name": "Grovcentric Bakery", "websiteUrl": "https://example.com"},
    {"id": "project-store", "name": "Grovcentric Online Store", "websiteUrl": "https://shop.example.com"},
]
AUDIT_ACTIVITY: list[dict] = []
LEADS: list[dict] = []

class Login(BaseModel):
    email: str
    password: str


class ProjectAuditRequest(BaseModel):
    projectId: str
    url: str = Field(min_length=1, max_length=2048)


class GeoAuditRequest(ProjectAuditRequest):
    businessName: str = Field(default="", max_length=200)
    focusAreas: list[str] = Field(min_length=1, max_length=5)


class SchemaRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2048)
    businessName: str = Field(default="", max_length=200)
    businessType: str = Field(default="Auto Detect", max_length=50)


class LeadGenerationRequest(BaseModel):
    industry: str = Field(min_length=1, max_length=120)
    location: str = Field(min_length=1, max_length=120)
    quantity: int = Field(default=10, ge=1, le=30)


class OutreachRequest(BaseModel):
    channel: str = Field(default="email", pattern="^(email|social)$")

def auth(authorization: str = Header(default="")) -> None:
    if authorization.removeprefix("Bearer ") not in TOKENS:
        raise HTTPException(401, "Unauthorized")

@app.post("/api/auth/login")
def login(body: Login):
    if body.email != DEMO_USER["email"] or body.password != DEMO_USER["password"]:
        raise HTTPException(401, "Invalid credentials")
    token = secrets.token_urlsafe(24); TOKENS.add(token)
    return {"token": token}

@app.get("/api/dashboard", dependencies=[Depends(auth)])
def dashboard():
    # Each block below will later be fed by a partner-built AI agent service.
    return {
        "user": DEMO_USER["name"], "health": 78,
        "projects": PROJECTS,
        "recentActivity": AUDIT_ACTIVITY[:5],
        "kpis": [{"label": "Revenue", "value": "$48,290", "delta": "+12.4%"},
                 {"label": "Business health", "value": "78/100", "delta": "+4 pts"},
                 {"label": "SEO score", "value": "82", "delta": "+6"},
                 {"label": "AEO visibility", "value": "41%", "delta": "+9%"}],
        "revenue": [18, 24, 22, 31, 36, 42, 48], "leads": [12, 15, 19, 21, 27, 30, 38],
        "insight": "Your AEO visibility is 41%: AI answer engines cite competitors for 'best local bakery software'. Publish 3 FAQ pages to close the gap this month.",
        "roadmap": [{"title": "Launch referral program", "status": "Draft"},
                    {"title": "Expand to 2 new channels", "status": "Planned"},
                    {"title": "Hire first sales rep", "status": "Locked"}],
        "agents": [{"name": "Analyst Agent", "status": "Live", "task": "Weekly business analysis"},
                   {"name": "SEO Agent", "status": "Live", "task": "Audited 48 pages"},
                   {"name": "AEO Agent", "status": "Beta", "task": "Tracking 25 AI prompts"},
                   {"name": "Roadmap Agent", "status": "In development", "task": "Preview data only"}],
    }

# ---- Section pages. Each entry below is the contract a partner agent will later fulfil. ----
M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"]
def S(title, sub, kpis, al, bl, a, b, tt, cols, rows, tips, note=None):
    return {"title": title, "sub": sub, "note": note, "kpis": [{"label": k[0], "value": k[1], "delta": k[2]} for k in kpis],
            "aLabel": al, "bLabel": bl, "a": a, "b": b, "tableTitle": tt, "cols": cols, "rows": rows, "tips": tips}

SECTIONS = {
    "analysis": S("Business analysis", "Who your customers are and how they behave", [("Acquisition cost", "$18.40", "-6%"), ("Churn", "3.2%", "-0.4 pts"), ("Avg. order value", "$62", "+5%"), ("Repeat customers", "34%", "+3 pts")],
        "Customers", "Orders", [210, 240, 255, 290, 310, 345, 380], [160, 190, 205, 240, 262, 290, 330], "Top customer segments", ["Segment", "Share", "Growth"],
        [["Local shoppers", "42%", "+9%"], ["Online buyers", "31%", "+14%"], ["Wholesale", "17%", "+3%"], ["Events", "10%", "-2%"]],
        ["Online buyers grow fastest: increase their budget share", "Wholesale margin is lowest: review pricing", "Repeat rate is rising: launch a loyalty offer"]),
    "health": S("Business health", "Overall score 78/100 across four areas", [("Cash runway", "7.2 mo", "+0.6"), ("Profit margin", "31%", "+2 pts"), ("Satisfaction", "4.5/5", "+0.1"), ("Team workload", "82%", "+5 pts")],
        "Health score", "Target", [66, 68, 70, 72, 74, 76, 78], [80] * 7, "Health factors", ["Factor", "Score", "Status"],
        [["Cash flow", "71", "Watch"], ["Growth", "84", "Strong"], ["Customers", "88", "Strong"], ["Operations", "69", "Watch"]],
        ["Cash flow: invoice faster to lift runway above 9 months", "Operations: automate order handling", "Team workload is high: plan a hire"]),
    "revenue": S("Revenue", "Income, forecast and where it comes from", [("Monthly revenue", "$48,290", "+12.4%"), ("Avg. per customer", "$62", "+5%"), ("Next month forecast", "$53,100", "+9.9%"), ("Refund rate", "1.8%", "-0.3 pts")],
        "Revenue ($k)", "Forecast ($k)", [18, 24, 22, 31, 36, 42, 48], [20, 23, 26, 30, 35, 41, 53], "Revenue by channel", ["Channel", "Revenue", "Change"],
        [["Paid ads", "$19,400", "+8%"], ["Email", "$12,900", "+21%"], ["SEO", "$9,300", "+15%"], ["Social", "$6,690", "+4%"]],
        ["Email converts best: shift $1,200 from ads", "Forecast assumes current growth continues", "Cut refund causes in the top product"]),
    "roadmap": S("Roadmap", "Your plan for the next two quarters", [("Milestones", "9", "3 done"), ("On track", "6", "+1"), ("At risk", "2", "0"), ("Next review", "Dec 2", "")],
        "Planned", "Completed", [1, 2, 3, 4, 6, 8, 9], [0, 0, 1, 1, 2, 3, 3], "Milestones", ["Milestone", "Target", "Status"],
        [["Launch referral program", "Dec 15", "Draft"], ["Expand to 2 new channels", "Jan 30", "Planned"], ["Hire first sales rep", "Feb 28", "Locked"], ["Open second location", "Apr 30", "Idea"]],
        ["Confirm goals so the roadmap agent can plan around them", "Add budget limits per milestone"], "Preview: the roadmap agent is still in development. Data shown is a sample."),
    "seo": S("SEO", "How easily search engines find you", [("SEO score", "82", "+6"), ("Organic visits", "12,480", "+11%"), ("Keywords in top 10", "64", "+9"), ("Backlinks", "318", "+24")],
        "Organic visits (hundreds)", "Top-10 keywords", [70, 78, 85, 96, 104, 115, 125], [30, 36, 41, 48, 53, 58, 64], "Pages to fix", ["Page", "Issue", "Priority"],
        [["/pricing", "Missing meta description", "High"], ["/blog/launch", "Slow hero image", "Medium"], ["/about", "Only one H1 heading needed", "Low"], ["/contact", "No local business markup", "High"]],
        ["Fix the two high-priority pages first", "Add FAQ content for your 5 top searches", "Ask 3 partners for backlinks"]),
    "aeo": S("AEO", "How often AI answer engines mention you", [("AEO visibility", "41%", "+9%"), ("AI mentions", "128", "+31"), ("Citations", "37", "+8"), ("Prompts tracked", "25", "+5")],
        "Visibility %", "Competitor avg %", [22, 25, 28, 31, 35, 38, 41], [48, 48, 49, 50, 50, 51, 52], "Tracked prompts", ["Prompt", "Engine", "Mentioned"],
        [["best bakery software", "ChatGPT", "No"], ["top tools for new cafes", "Gemini", "Yes"], ["how to grow a small shop", "Perplexity", "Yes"], ["cheap POS for startups", "ChatGPT", "No"]],
        ["Publish clear answer pages for the prompts you miss", "Add structured data to your top pages", "Get cited on trusted review sites"], "Beta: the AEO agent is still being tested. Results can vary between runs."),
}

@app.get("/api/section/{name}", dependencies=[Depends(auth)])
def section(name: str):
    if name not in SECTIONS:
        raise HTTPException(404, "Unknown section")
    return SECTIONS[name]


def validated_url(url: str) -> str:
    value = url.strip()
    try:
        parsed = urlsplit(value)
        hostname = parsed.hostname
        parsed.port
    except ValueError as error:
        raise HTTPException(422, "Enter a valid http or https website URL.") from error
    if parsed.scheme not in {"http", "https"} or not hostname or parsed.username or parsed.password:
        raise HTTPException(422, "Enter a valid http or https website URL.")
    return value


def find_project(project_id: str) -> dict:
    project = next((item for item in PROJECTS if item["id"] == project_id), None)
    if project is None:
        raise HTTPException(404, "Project not found.")
    return project


def record_activity(title: str, detail: str) -> None:
    AUDIT_ACTIVITY.insert(
        0,
        {
            "id": str(uuid4()),
            "title": title,
            "detail": detail,
            "performedAt": datetime.now(timezone.utc).isoformat(),
        },
    )
    del AUDIT_ACTIVITY[20:]


@app.post("/api/tools/seo-audit", dependencies=[Depends(auth)])
def seo_audit(body: ProjectAuditRequest):
    project = find_project(body.projectId)
    url = validated_url(body.url)
    result = {
        "auditId": str(uuid4()),
        "score": 82,
        "summary": f"Sample SEO findings for {url}. This demo does not crawl or score the live website.",
        "issues": [
            {
                "severity": "Critical",
                "category": "Metadata",
                "description": "A page may be missing a unique meta description.",
                "recommendation": "Write a concise description that accurately summarizes the page.",
            },
            {
                "severity": "Warning",
                "category": "Performance",
                "description": "Large images can slow down page loading.",
                "recommendation": "Compress images and serve appropriately sized formats.",
            },
            {
                "severity": "Info",
                "category": "Content",
                "description": "Important pages benefit from a clear heading structure.",
                "recommendation": "Use one descriptive H1 followed by logically nested headings.",
            },
        ],
        "performedAt": datetime.now(timezone.utc).isoformat(),
    }
    record_activity("SEO audit", f"{project['name']} · score {result['score']}")
    return result


@app.post("/api/tools/geo-audit", dependencies=[Depends(auth)])
def geo_audit(body: GeoAuditRequest):
    project = find_project(body.projectId)
    url = validated_url(body.url)
    supported_areas = {
        "AI visibility",
        "Entity understanding",
        "Content authority",
        "Citations",
        "Structured data",
    }
    if not set(body.focusAreas).issubset(supported_areas):
        raise HTTPException(422, "One or more GEO focus areas are not supported.")
    result = {
        "score": 68,
        "summary": f"Sample AI-search findings for {body.businessName.strip() or project['name']} at {url}.",
        "issues": [
            {
                "severity": "High",
                "title": "Clarify business identity",
                "description": "Key business details should be stated consistently on important pages.",
                "recommendation": "Use a consistent business name, description, and service area.",
            },
            {
                "severity": "Medium",
                "title": "Strengthen answer-ready content",
                "description": "Direct answers to customer questions can be easier for answer engines to cite.",
                "recommendation": "Add concise FAQs with evidence and links to supporting pages.",
            },
        ],
        "opportunities": [
            {
                "title": "Improve structured context",
                "description": "Structured information can help systems interpret your organization.",
                "recommendation": "Add accurate Organization or LocalBusiness JSON-LD.",
            },
            {
                "title": "Build source citations",
                "description": "Consistent, trustworthy references support entity confidence.",
                "recommendation": "Keep business information current on reputable directories.",
            },
        ],
        "focusAreas": body.focusAreas,
    }
    record_activity("GEO audit", f"{project['name']} · score {result['score']}")
    return result


@app.post("/api/tools/schema", dependencies=[Depends(auth)])
def generate_schema(body: SchemaRequest):
    url = validated_url(body.url)
    supported_types = {
        "Organization",
        "LocalBusiness",
        "Restaurant",
        "Store",
        "Service",
        "Product",
        "SoftwareApplication",
        "Article",
        "Person",
    }
    business_type = body.businessType
    if business_type not in {"Auto Detect", "auto", *supported_types}:
        raise HTTPException(422, "Select a supported schema type.")
    if business_type in {"Auto Detect", "auto"}:
        business_type = "Organization"
    parsed = urlsplit(url)
    schema = {
        "@context": "https://schema.org",
        "@type": business_type,
        "name": body.businessName.strip() or parsed.hostname,
        "url": url,
    }
    return {
        "schema": schema,
        "businessType": business_type,
        "validation": {
            "valid": True,
            "errors": [],
            "warnings": ["Review and complete business-specific properties before publishing."],
        },
    }


@app.get("/api/leads", dependencies=[Depends(auth)])
def get_leads():
    return {"leads": LEADS}


@app.post("/api/leads/generate", dependencies=[Depends(auth)])
def generate_leads(body: LeadGenerationRequest):
    industry = body.industry.strip()
    location = body.location.strip()
    if not industry or not location:
        raise HTTPException(422, "Industry and location are required.")
    generated = []
    start = len(LEADS) + 1
    for index in range(start, start + body.quantity):
        score = (94, 82, 68, 51)[(index - 1) % 4]
        lead = {
            "id": str(uuid4()),
            "businessName": f"Demo {industry} Prospect {index:02d}",
            "industry": industry,
            "location": location,
            "score": score,
            "status": "HOT" if score >= 80 else "WARM" if score >= 60 else "COLD",
        }
        generated.append(lead)
    LEADS[0:0] = generated
    record_activity("Lead examples generated", f"{len(generated)} fictional examples · {location}")
    return {"leads": generated}


@app.delete("/api/leads/{lead_id}", dependencies=[Depends(auth)])
def delete_lead(lead_id: str):
    index = next((i for i, lead in enumerate(LEADS) if lead["id"] == lead_id), None)
    if index is None:
        raise HTTPException(404, "Lead not found.")
    del LEADS[index]
    return {"deleted": True}


@app.post("/api/leads/{lead_id}/outreach", dependencies=[Depends(auth)])
def draft_outreach(lead_id: str, body: OutreachRequest):
    lead = next((item for item in LEADS if item["id"] == lead_id), None)
    if lead is None:
        raise HTTPException(404, "Lead not found.")
    if body.channel == "social":
        draft = (
            f"Hi {lead['businessName']} team — I came across your business in {lead['location']} "
            f"and would love to connect about opportunities in {lead['industry']}."
        )
    else:
        draft = (
            f"Subject: A quick idea for {lead['businessName']}\n\n"
            f"Hi {lead['businessName']} team,\n\n"
            f"I came across your business in {lead['location']} and wanted to share an idea "
            f"that may be relevant to your work in {lead['industry']}. Would you be open to a short conversation?\n\n"
            "Best,\nYour name"
        )
    return {"draft": draft, "sent": False}
