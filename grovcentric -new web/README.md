# Grovcentric (demo)

Backend: `cd backend`, install `requirements.txt`, then run `uvicorn main:app --reload` (port 8000).
Frontend: `cd frontend`, run `npm install` and `npm run dev` (port 5173).
Demo login: `demo@grovcentric.com` / `demo1234`.

The dashboard includes project metrics, recent activity, and quick actions for SEO and GEO audits,
schema generation, and lead management. Audit findings and lead records are demo samples: audits do
not crawl websites, schema generation uses only the submitted details, and outreach is drafted but
never sent. Demo projects, audit activity, and leads are stored in memory and reset when the backend
restarts. Replace these demo endpoints with persistent services before production.

Logo: replace the Logo component in `frontend/src/App.tsx` when the real logo arrives.
