# Grovcentric (demo)

Backend: `cd backend`, install `requirements.txt`, then run `uvicorn main:app --reload` (port 8000).
Frontend: `cd frontend`, run `npm install` and `npm run dev` (port 5173).
Demo login: `demo@grovcentric.com` / `demo1234`.

The dashboard includes project metrics, recent activity, and quick actions for SEO and GEO audits,
schema generation, and lead management. AI audit and schema actions inspect the submitted website
when the agent service is configured. Lead records are fictional demo samples, and outreach is
drafted but never sent. Demo projects, audit activity, and leads are stored in memory and reset when
the backend restarts. Replace these demo data stores with persistent services before production.

## Connect the GrowPilot AI agents

The FastAPI backend can call the root Next.js app's protected server-side agent endpoint. The browser
continues to call only FastAPI; neither the Gemini API key nor the service token is sent to the
frontend.

1. In the repository root, copy `.env.example` to `.env`, set `GEMINI_API_KEY`, and set
   `AI_SERVICE_TOKEN` to a private random value of at least 32 characters.
2. In `backend`, copy `.env.example` to `.env`. Set `AI_SERVICE_URL` to the root Next.js server
   (usually `http://127.0.0.1:3000`) and set `AI_SERVICE_TOKEN` to the exact same value.
3. Install backend requirements and start both the root Next.js app and this FastAPI app. The Vite
   frontend remains configured to send `/api` requests to FastAPI.

The SEO, GEO, schema, lead qualification, outreach, and overview insight actions use the AI agents.
Lead records remain fictional demo examples; the qualification agent scores them but does not find
or verify real prospects. Outreach is drafted only and never sent. Keep the token secret, restrict
access to the internal Next.js endpoint, and use HTTPS/private networking outside local development.

Logo: replace the Logo component in `frontend/src/App.tsx` when the real logo arrives.
