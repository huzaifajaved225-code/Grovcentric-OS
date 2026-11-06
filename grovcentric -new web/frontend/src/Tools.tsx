import { useEffect, useMemo, useState, type FormEvent } from "react";

type Project = { id: string; name: string; websiteUrl: string };
type ToolName = "SEO Audit" | "GEO Audit" | "Schema Builder" | "Lead Generation";
type RequestOptions = { method?: string; body?: unknown };
type Requester = <T>(path: string, options?: RequestOptions) => Promise<T>;

type SeoResult = {
  auditId: string;
  score: number;
  summary: string;
  issues: { severity: string; category: string; description: string; recommendation: string }[];
};
type GeoResult = {
  score: number;
  summary: string;
  issues: { severity: string; title: string; description: string; recommendation: string }[];
  opportunities: { title: string; description: string; recommendation: string }[];
};
type SchemaResult = {
  schema: Record<string, unknown>;
  businessType: string;
  validation: { valid: boolean; errors: string[]; warnings: string[] };
};
type Lead = {
  id: string;
  businessName: string;
  industry: string;
  location: string;
  score: number;
  status: "HOT" | "WARM" | "COLD";
};

const GEO_FOCUS = [
  "AI visibility",
  "Entity understanding",
  "Content authority",
  "Citations",
  "Structured data",
];
const BUSINESS_TYPES = [
  "Auto Detect",
  "Organization",
  "LocalBusiness",
  "Restaurant",
  "Store",
  "Service",
  "Product",
  "SoftwareApplication",
  "Article",
  "Person",
];

export default function Tools({
  name,
  projects,
  request,
}: {
  name: ToolName;
  projects: Project[];
  request: Requester;
}): React.JSX.Element {
  return (
    <section className="pad">
      {name === "SEO Audit" ? <SeoAudit projects={projects} request={request} /> : null}
      {name === "GEO Audit" ? <GeoAudit projects={projects} request={request} /> : null}
      {name === "Schema Builder" ? <SchemaBuilder request={request} /> : null}
      {name === "Lead Generation" ? <LeadGeneration request={request} /> : null}
    </section>
  );
}

function ProjectSelector({
  projects,
  value,
  onChange,
}: {
  projects: Project[];
  value: string;
  onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <label>
      Project
      <select value={value} onChange={(event) => onChange(event.target.value)} required>
        {projects.map((project) => (
          <option value={project.id} key={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function SeoAudit({
  projects,
  request,
}: {
  projects: Project[];
  request: Requester;
}): React.JSX.Element {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [url, setUrl] = useState(projects[0]?.websiteUrl ?? "");
  const [result, setResult] = useState<SeoResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setUrl(projects.find((project) => project.id === projectId)?.websiteUrl ?? "");
  }, [projectId, projects]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await request<SeoResult>("/api/tools/seo-audit", { body: { projectId, url } }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The SEO audit could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ToolHeading
        title="SEO Audit"
        subtitle="Review on-page and technical SEO issues for a project."
      />
      <p className="note">
        Demo audit: results are sample recommendations and do not crawl your website.
      </p>
      <form className="card tool-form" onSubmit={submit}>
        {projects.length ? (
          <ProjectSelector projects={projects} value={projectId} onChange={setProjectId} />
        ) : null}
        <label>
          Website URL
          <input type="url" value={url} onChange={(event) => setUrl(event.target.value)} required />
        </label>
        {error ? (
          <p className="err" role="alert">
            {error}
          </p>
        ) : null}
        <button className="btn" disabled={busy || !projectId}>
          {busy ? "Running audit…" : "Start SEO audit"}
        </button>
      </form>
      {result ? (
        <div className="card tool-result">
          <h3>
            SEO audit results <span className="pill ok">Score {result.score}</span>
          </h3>
          <p className="sub">{result.summary}</p>
          <div className="tool-list">
            {result.issues.map((issue) => (
              <article className="tool-item" key={`${issue.category}-${issue.description}`}>
                <div className="tool-item-heading">
                  <strong>{issue.category}</strong>
                  <span className={`pill ${issue.severity === "Critical" ? "warn" : ""}`}>
                    {issue.severity}
                  </span>
                </div>
                <p>{issue.description}</p>
                <p className="sub">Recommended: {issue.recommendation}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

function GeoAudit({
  projects,
  request,
}: {
  projects: Project[];
  request: Requester;
}): React.JSX.Element {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [url, setUrl] = useState(projects[0]?.websiteUrl ?? "");
  const [businessName, setBusinessName] = useState("");
  const [focusAreas, setFocusAreas] = useState<string[]>(GEO_FOCUS);
  const [result, setResult] = useState<GeoResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setUrl(projects.find((project) => project.id === projectId)?.websiteUrl ?? "");
  }, [projectId, projects]);

  function toggleFocus(area: string) {
    setFocusAreas((current) =>
      current.includes(area) ? current.filter((value) => value !== area) : [...current, area],
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(
        await request<GeoResult>("/api/tools/geo-audit", {
          body: { projectId, url, businessName, focusAreas },
        }),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The GEO audit could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ToolHeading
        title="GEO Audit"
        subtitle="See how clearly your business can be understood by AI search."
      />
      <p className="note">
        Demo audit: results are sample recommendations and do not crawl your website.
      </p>
      <form className="card tool-form" onSubmit={submit}>
        {projects.length ? (
          <ProjectSelector projects={projects} value={projectId} onChange={setProjectId} />
        ) : null}
        <label>
          Website URL
          <input type="url" value={url} onChange={(event) => setUrl(event.target.value)} required />
        </label>
        <label>
          Business name (optional)
          <input value={businessName} onChange={(event) => setBusinessName(event.target.value)} />
        </label>
        <fieldset className="tool-fieldset">
          <legend>Focus areas</legend>
          <div className="tool-checks">
            {GEO_FOCUS.map((area) => (
              <label className="tool-check" key={area}>
                <input
                  type="checkbox"
                  checked={focusAreas.includes(area)}
                  onChange={() => toggleFocus(area)}
                />
                {area}
              </label>
            ))}
          </div>
        </fieldset>
        {error ? (
          <p className="err" role="alert">
            {error}
          </p>
        ) : null}
        <button className="btn" disabled={busy || !projectId || !focusAreas.length}>
          {busy ? "Running audit…" : "Start GEO audit"}
        </button>
      </form>
      {result ? (
        <div className="card tool-result">
          <h3>
            GEO audit results <span className="pill ok">Score {result.score}</span>
          </h3>
          <p className="sub">{result.summary}</p>
          <h3>Priority findings</h3>
          <div className="tool-list">
            {result.issues.map((issue) => (
              <article className="tool-item" key={issue.title}>
                <strong>{issue.title}</strong>
                <p>{issue.description}</p>
                <p className="sub">Recommended: {issue.recommendation}</p>
              </article>
            ))}
          </div>
          <h3>Opportunities</h3>
          <div className="tool-list">
            {result.opportunities.map((opportunity) => (
              <article className="tool-item" key={opportunity.title}>
                <strong>{opportunity.title}</strong>
                <p>{opportunity.description}</p>
                <p className="sub">Recommended: {opportunity.recommendation}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

function SchemaBuilder({ request }: { request: Requester }): React.JSX.Element {
  const [url, setUrl] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("Auto Detect");
  const [result, setResult] = useState<SchemaResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(
        await request<SchemaResult>("/api/tools/schema", {
          body: { url, businessName, businessType },
        }),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Schema generation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function copySchema() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(result.schema, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Could not copy to clipboard. Select and copy the JSON-LD manually.");
    }
  }

  return (
    <>
      <ToolHeading
        title="Schema Builder"
        subtitle="Generate and validate copy-ready JSON-LD structured data."
      />
      <p className="note">
        The generated schema uses the details you enter; it does not inspect the website.
      </p>
      <form className="card tool-form" onSubmit={submit}>
        <label>
          Website URL
          <input type="url" value={url} onChange={(event) => setUrl(event.target.value)} required />
        </label>
        <label>
          Business name (optional)
          <input value={businessName} onChange={(event) => setBusinessName(event.target.value)} />
        </label>
        <label>
          Business type
          <select value={businessType} onChange={(event) => setBusinessType(event.target.value)}>
            {BUSINESS_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        {error ? (
          <p className="err" role="alert">
            {error}
          </p>
        ) : null}
        <button className="btn" disabled={busy}>
          {busy ? "Generating…" : "Generate schema"}
        </button>
      </form>
      {result ? (
        <div className="card tool-result">
          <div className="tool-item-heading">
            <h3>Generated {result.businessType} JSON-LD</h3>
            <span className={`pill ${result.validation.valid ? "ok" : "warn"}`}>
              {result.validation.valid ? "Valid JSON-LD" : "Needs review"}
            </span>
          </div>
          {result.validation.warnings.map((warning) => (
            <p className="sub" key={warning}>
              {warning}
            </p>
          ))}
          <pre className="schema-code">
            <code>{JSON.stringify(result.schema, null, 2)}</code>
          </pre>
          <button type="button" className="btn ghost tool-copy" onClick={copySchema}>
            {copied ? "Copied" : "Copy JSON-LD"}
          </button>
        </div>
      ) : null}
    </>
  );
}

function LeadGeneration({ request }: { request: Requester }): React.JSX.Element {
  const [industry, setIndustry] = useState("Digital Marketing Agency");
  const [location, setLocation] = useState("");
  const [quantity, setQuantity] = useState(10);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 8;

  useEffect(() => {
    request<{ leads: Lead[] }>("/api/leads", { method: "GET" })
      .then((data) => setLeads(data.leads))
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Could not load leads."),
      );
  }, [request]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return leads.filter(
      (lead) =>
        !needle ||
        `${lead.businessName} ${lead.industry} ${lead.location}`.toLowerCase().includes(needle),
    );
  }, [leads, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice(page * pageSize, (page + 1) * pageSize);

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setDraft("");
    try {
      const data = await request<{ leads: Lead[] }>("/api/leads/generate", {
        body: { industry, location, quantity },
      });
      setLeads((current) => [...data.leads, ...current]);
      setPage(0);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not generate leads.");
    } finally {
      setBusy(false);
    }
  }

  async function removeLead(id: string) {
    setError("");
    try {
      await request(`/api/leads/${id}`, { method: "DELETE" });
      setLeads((current) => current.filter((lead) => lead.id !== id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete the lead.");
    }
  }

  async function createDraft(lead: Lead) {
    setError("");
    try {
      const data = await request<{ draft: string }>(`/api/leads/${lead.id}/outreach`, {
        body: { channel: "email" },
      });
      setDraft(data.draft);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not draft outreach.");
    }
  }

  function exportCsv() {
    const rows = [
      ["Business", "Industry", "Location", "Score", "Status"],
      ...filtered.map((lead) => [
        lead.businessName,
        lead.industry,
        lead.location,
        String(lead.score),
        lead.status,
      ]),
    ];
    const csv = rows
      .map((row) => row.map((field) => `"${field.replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = "demo-leads.csv";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
  }

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(draft);
    } catch {
      setError("Could not copy to clipboard. Select and copy the outreach draft manually.");
    }
  }

  return (
    <>
      <ToolHeading
        title="AI Lead Generation"
        subtitle="Generate, qualify, search, and organize demo leads."
      />
      <p className="note">
        Demo leads are fictional examples, not verified businesses or contacts. Outreach is drafted
        only and never sent.
      </p>
      <form className="card tool-form" onSubmit={generate}>
        <label>
          Industry
          <input value={industry} onChange={(event) => setIndustry(event.target.value)} required />
        </label>
        <label>
          Location
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="e.g. Austin, TX"
            required
          />
        </label>
        <label>
          Number of leads
          <select value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}>
            {[5, 10, 20, 30].map((count) => (
              <option key={count} value={count}>
                {count} leads
              </option>
            ))}
          </select>
        </label>
        {error ? (
          <p className="err" role="alert">
            {error}
          </p>
        ) : null}
        <button className="btn" disabled={busy}>
          {busy ? "Preparing examples…" : "Generate leads"}
        </button>
      </form>
      {draft ? (
        <div className="card tool-result">
          <div className="tool-item-heading">
            <h3>Outreach draft</h3>
            <button type="button" className="btn ghost tool-copy" onClick={copyDraft}>
              Copy draft
            </button>
          </div>
          <pre className="schema-code">{draft}</pre>
        </div>
      ) : null}
      <div className="card tool-result">
        <div className="tool-item-heading">
          <h3>
            Discovered leads <span className="pill">{filtered.length}</span>
          </h3>
          <button
            type="button"
            className="btn ghost tool-copy"
            onClick={exportCsv}
            disabled={!filtered.length}
          >
            Export CSV
          </button>
        </div>
        <div className="lead-toolbar">
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder="Search business, industry, or location"
          />
          <div className="lead-stats">
            <span>Hot: {leads.filter((lead) => lead.status === "HOT").length}</span>
            <span>Warm: {leads.filter((lead) => lead.status === "WARM").length}</span>
            <span>Cold: {leads.filter((lead) => lead.status === "COLD").length}</span>
          </div>
        </div>
        {error ? (
          <p className="err" role="alert">
            {error}
          </p>
        ) : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Business</th>
                <th>Industry / location</th>
                <th>Score</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((lead) => (
                <tr key={lead.id}>
                  <td>{lead.businessName}</td>
                  <td>
                    {lead.industry}
                    <br />
                    <span className="sub">{lead.location}</span>
                  </td>
                  <td>{lead.score}</td>
                  <td>
                    <span className={`pill ${lead.status === "HOT" ? "ok" : ""}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td>
                    <div className="lead-actions">
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => createDraft(lead)}
                      >
                        Draft email
                      </button>
                      <button
                        type="button"
                        className="text-button danger"
                        onClick={() => removeLead(lead.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!visible.length ? (
                <tr>
                  <td colSpan={5} className="sub">
                    No leads found. Generate demo leads to get started.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="lead-pagination">
          <span className="sub">
            Page {page + 1} of {pageCount}
          </span>
          <div className="lead-actions">
            <button
              type="button"
              className="btn ghost tool-copy"
              disabled={page === 0}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn ghost tool-copy"
              disabled={page + 1 >= pageCount}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function ToolHeading({ title, subtitle }: { title: string; subtitle: string }): React.JSX.Element {
  return (
    <header className="tool-heading">
      <h2>{title}</h2>
      <p className="sub">{subtitle}</p>
    </header>
  );
}
