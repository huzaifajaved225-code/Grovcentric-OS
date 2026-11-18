"""Grovcentric demo API. Replace in-memory demo data with persistent services before production."""
import asyncio
import json
import os
import secrets
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv(Path(__file__).with_name(".env"))

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


def _call_ai_service(agent: str, payload: dict) -> dict:
    service_url = os.getenv("AI_SERVICE_URL", "").rstrip("/")
    service_token = os.getenv("AI_SERVICE_TOKEN", "")
    if not service_url or len(service_token) < 32:
        raise HTTPException(503, "AI agent service is not configured.")

    parsed = urlsplit(service_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.username or parsed.password:
        raise HTTPException(503, "AI agent service URL is invalid.")

    body = json.dumps({"agent": agent, "payload": payload}).encode("utf-8")
    request = Request(
        f"{service_url}/api/internal/agents",
        data=body,
        headers={
            "Authorization": f"Bearer {service_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=120) as response:
            response_body = response.read()
    except HTTPError as error:
        try:
            error_body = json.loads(error.read())
            message = error_body.get("error", {}).get("message", "The AI agent service rejected the request.")
        except (json.JSONDecodeError, AttributeError):
            message = "The AI agent service rejected the request."
        raise HTTPException(502, message) from error
    except (TimeoutError, URLError) as error:
        raise HTTPException(502, "Could not reach the AI agent service.") from error

    try:
        result = json.loads(response_body)
    except json.JSONDecodeError as error:
        raise HTTPException(502, "The AI agent service returned an invalid response.") from error
    if not isinstance(result, dict) or not result.get("success") or "data" not in result:
        raise HTTPException(502, "The AI agent service returned an unsuccessful response.")
    return result["data"]


async def call_ai_service(agent: str, payload: dict) -> dict:
    return await asyncio.to_thread(_call_ai_service, agent, payload)


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
async def seo_audit(body: ProjectAuditRequest):
    project = find_project(body.projectId)
    url = validated_url(body.url)
    result = await call_ai_service(
        "seo-audit",
        {
            "url": url,
            "businessName": project["name"],
            "focusAreas": "technical,on-page,performance",
        },
    )
    result = {
        **result,
        "auditId": str(uuid4()),
        "issues": [
            {**issue, "severity": issue["severity"].capitalize()}
            for issue in result["issues"]
        ],
        "performedAt": datetime.now(timezone.utc).isoformat(),
    }
    record_activity("SEO audit", f"{project['name']} · score {result['score']}")
    return result


@app.post("/api/tools/geo-audit", dependencies=[Depends(auth)])
async def geo_audit(body: GeoAuditRequest):
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
    result = await call_ai_service(
        "geo-audit",
        {
            "url": url,
            "businessName": body.businessName.strip() or project["name"],
            "focusAreas": body.focusAreas,
        },
    )
    record_activity("GEO audit", f"{project['name']} · score {result['score']}")
    return result


@app.post("/api/tools/schema", dependencies=[Depends(auth)])
async def generate_schema(body: SchemaRequest):
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
    result = await call_ai_service(
        "schema",
        {
            "url": url,
            "businessType": "auto" if business_type in {"Auto Detect", "auto"} else business_type,
        },
    )
    validation = result["validation"]
    warnings = list(validation["warnings"])
    warnings.extend(
        f"Recommended property is missing: {property_name}"
        for property_name in validation.get("missingRecommendedProperties", [])
    )
    schema = {
        **result["schema"],
        **({"name": body.businessName.strip()} if body.businessName.strip() else {}),
    }
    return {
        "schema": schema,
        "businessType": result["businessType"],
        "validation": {
            "valid": validation["valid"],
            "errors": validation["errors"],
            "warnings": warnings,
        },
    }


@app.get("/api/leads", dependencies=[Depends(auth)])
def get_leads():
    return {"leads": LEADS}


@app.post("/api/leads/generate", dependencies=[Depends(auth)])
async def generate_leads(body: LeadGenerationRequest):
    industry = body.industry.strip()
    location = body.location.strip()
    if not industry or not location:
        raise HTTPException(422, "Industry and location are required.")
    generated = []
    start = len(LEADS) + 1
    candidates = [
        {
            "id": str(uuid4()),
            "businessName": f"Demo {industry} Prospect {index:02d}",
            "industry": industry,
            "location": location,
            "description": "Fictional demo prospect generated for agent qualification.",
        }
        for index in range(start, start + body.quantity)
    ]
    semaphore = asyncio.Semaphore(3)

    async def qualify(candidate: dict) -> dict:
        async with semaphore:
            qualification = await call_ai_service(
                "lead-qualification",
                {
                    "businessName": candidate["businessName"],
                    "industry": industry,
                    "location": location,
                    "description": candidate["description"],
                },
            )
        return {
            **candidate,
            **qualification,
        }

    generated = await asyncio.gather(*(qualify(candidate) for candidate in candidates))
    LEADS[0:0] = generated
    record_activity("Leads qualified", f"{len(generated)} fictional examples · {location}")
    return {"leads": generated}


@app.delete("/api/leads/{lead_id}", dependencies=[Depends(auth)])
def delete_lead(lead_id: str):
    index = next((i for i, lead in enumerate(LEADS) if lead["id"] == lead_id), None)
    if index is None:
        raise HTTPException(404, "Lead not found.")
    del LEADS[index]
    return {"deleted": True}


@app.post("/api/leads/{lead_id}/outreach", dependencies=[Depends(auth)])
async def draft_outreach(lead_id: str, body: OutreachRequest):
    lead = next((item for item in LEADS if item["id"] == lead_id), None)
    if lead is None:
        raise HTTPException(404, "Lead not found.")
    outreach = await call_ai_service(
        "lead-outreach",
        {
            "businessName": lead["businessName"],
            "industry": lead["industry"],
            "location": lead["location"],
            "opportunity": lead["opportunity"],
            "recommendedService": lead["recommendedService"],
            "channel": "general" if body.channel == "social" else "email",
        },
    )
    draft = (
        f"Subject: {outreach['subject']}\n\n{outreach['message']}"
        if outreach.get("subject")
        else outreach["message"]
    )
    return {"draft": draft, "sent": False}


@app.post("/api/tools/insight", dependencies=[Depends(auth)])
async def generate_insight():
    dashboard_data = dashboard()
    result = await call_ai_service(
        "general",
        {
            "systemMessage": (
                "You are a concise business analyst. Use only the dashboard data provided. "
                "Do not present demo metrics as verified real-world facts."
            ),
            "prompt": (
                "Write one short executive insight and a practical next action based on this "
                "dashboard snapshot:\n"
                + json.dumps(
                    {
                        "health": dashboard_data["health"],
                        "kpis": dashboard_data["kpis"],
                        "currentInsight": dashboard_data["insight"],
                    }
                )
            ),
        },
    )
    return {"insight": result["text"]}
