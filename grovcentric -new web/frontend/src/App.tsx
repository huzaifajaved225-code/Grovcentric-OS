import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import Tools from "./Tools";
import "./styles.css";

type Kpi = { label: string; value: string; delta: string };
type Project = { id: string; name: string; websiteUrl: string };
type Data = {
  user: string;
  health: number;
  kpis: Kpi[];
  revenue: number[];
  leads: number[];
  insight: string;
  roadmap: { title: string; status: string }[];
  agents: { name: string; status: string; task: string }[];
  projects: Project[];
  recentActivity: { id: string; title: string; detail: string; performedAt: string }[];
};
type ToolName = "SEO Audit" | "GEO Audit" | "Schema Builder" | "Lead Generation";
type RequestOptions = { method?: string; body?: unknown };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
const TABS = [
  "Overview",
  "Analysis",
  "Health",
  "Revenue",
  "Roadmap",
  "SEO Audit",
  "GEO Audit",
  "Schema Builder",
  "Lead Generation",
  "AEO",
];
const TOOL_TABS: ToolName[] = ["SEO Audit", "GEO Audit", "Schema Builder", "Lead Generation"];
const NAV_MARKS: Record<string, string> = {
  Overview: "O",
  Analysis: "A",
  Health: "H",
  Revenue: "$",
  Roadmap: "R",
  "SEO Audit": "S",
  "GEO Audit": "G",
  "Schema Builder": "{}",
  "Lead Generation": "L",
  AEO: "AI",
};

const Logo = ({ big = false }: { big?: boolean }) =>
  big ? (
    <img src="/logo.png" alt="Grovcentric — AI Business Operating System" className="logo-full" />
  ) : (
    <div className="logo">
      <img src="/mark.png" alt="" />
      <span>
        Grov<b>centric</b>
      </span>
    </div>
  );

function Login({ onAuth }: { onAuth: (t: string) => void }) {
  const [email, setEmail] = useState("demo@grovcentric.com"),
    [pw, setPw] = useState("demo1234");
  const [err, setErr] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pw }),
      });
      if (!r.ok) throw new Error();
      onAuth((await r.json()).token);
    } catch {
      setErr("Could not sign in. Check your details and that the API is running.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login">
      <Logo big />
      <form className="card login-card" onSubmit={submit}>
        <h1>Sign in to Grovcentric</h1>
        <p className="sub">Welcome back — enter your details.</p>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required />
        </label>
        <a className="forgot" href="#">
          Forgot password?
        </a>
        {err && <div className="err">{err}</div>}
        <button className="btn" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <button type="button" className="btn ghost">
          Continue with Google
        </button>
        <p className="sub center">
          New here? <a href="#">Create an account</a>
        </p>
      </form>
    </main>
  );
}

const Chart = ({ a, b }: { a: number[]; b: number[] }) => {
  const max = Math.max(...a, ...b),
    pts = (v: number[]) =>
      v.map((y, i) => `${30 + i * (550 / (v.length - 1))},${170 - (y / max) * 150}`).join(" ");
  return (
    <svg viewBox="0 0 600 200" className="chart">
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1="30" x2="580" y1={20 + i * 50} y2={20 + i * 50} stroke="var(--line)" />
      ))}
      <polyline
        fill="none"
        stroke="var(--green)"
        strokeWidth="3"
        strokeLinejoin="round"
        points={pts(a)}
      />
      <polyline
        fill="none"
        stroke="var(--blue)"
        strokeWidth="3"
        strokeLinejoin="round"
        points={pts(b)}
      />
      {MONTHS.map((m, i) => (
        <text
          key={m}
          x={30 + i * (550 / 6)}
          y="194"
          fill="var(--sub)"
          fontSize="11"
          textAnchor="middle"
        >
          {m}
        </text>
      ))}
    </svg>
  );
};

type Sec = {
  title: string;
  sub: string;
  note?: string;
  kpis: Kpi[];
  aLabel: string;
  bLabel: string;
  a: number[];
  b: number[];
  tableTitle: string;
  cols: string[];
  rows: string[][];
  tips: string[];
};
function Section({ name, token }: { name: string; token: string }) {
  const [s, setS] = useState<Sec | null>(null),
    [err, setErr] = useState(false);
  useEffect(() => {
    setS(null);
    setErr(false);
    fetch(`/api/section/${name.toLowerCase()}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setS)
      .catch(() => setErr(true));
  }, [name, token]);
  if (!s)
    return (
      <p className="sub pad">
        {err ? "Could not load this page. Is the API running?" : "Loading…"}
      </p>
    );
  return (
    <section className="pad">
      <h2>{s.title}</h2>
      <p className="sub">{s.sub}</p>
      {s.note && <div className="note">{s.note}</div>}
      <div className="kpis">
        {s.kpis.map((k) => (
          <div className="card kpi" key={k.label}>
            <span className="sub">{k.label}</span>
            <strong>{k.value}</strong>
            <em>{k.delta}</em>
          </div>
        ))}
      </div>
      <div className="grid2">
        <div className="card">
          <h3>Trend</h3>
          <Chart a={s.a} b={s.b} />
          <p className="sub">
            <span style={{ color: "var(--green)" }}>●</span> {s.aLabel} &nbsp;{" "}
            <span style={{ color: "var(--blue)" }}>●</span> {s.bLabel}
          </p>
        </div>
        <div className="card insight">
          <h3>RECOMMENDED ACTIONS</h3>
          <ul>
            {s.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <div className="card wide2">
          <h3>{s.tableTitle}</h3>
          <table>
            <thead>
              <tr>
                {s.cols.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Dashboard({ token, onOut }: { token: string; onOut: () => void }) {
  const [d, setD] = useState<Data | null>(null),
    [failed, setFailed] = useState(false),
    [insightBusy, setInsightBusy] = useState(false),
    [insightError, setInsightError] = useState(""),
    [tab, setTab] = useState("Overview"),
    [sidebarCollapsed, setSidebarCollapsed] = useState(
      () => window.matchMedia("(max-width: 720px)").matches,
    );
  useEffect(() => {
    fetch("/api/dashboard", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (r.status === 401) {
          onOut();
          throw new Error();
        }
        return r.json();
      })
      .then(setD)
      .catch(() => setFailed(true));
  }, [token, tab]);
  const C = 2 * Math.PI * 52;
  const request = useCallback(
    async <T,>(path: string, options: RequestOptions = {}): Promise<T> => {
      const response = await fetch(path, {
        method: options.method ?? (options.body ? "POST" : "GET"),
        headers: {
          Authorization: `Bearer ${token}`,
          ...(options.body ? { "Content-Type": "application/json" } : {}),
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) onOut();
        throw new Error(data.detail ?? "The request could not be completed.");
      }
      return data as T;
    },
    [token, onOut],
  );
  async function refreshInsight() {
    setInsightBusy(true);
    setInsightError("");
    try {
      const result = await request<{ insight: string }>("/api/tools/insight", { body: {} });
      setD((current) => (current ? { ...current, insight: result.insight } : current));
    } catch (reason) {
      setInsightError(
        reason instanceof Error ? reason.message : "Could not generate an AI insight.",
      );
    } finally {
      setInsightBusy(false);
    }
  }
  const toolTab = TOOL_TABS.find((item) => item === tab);
  return (
    <div className={`app dashboard-shell${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {!sidebarCollapsed ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarCollapsed(true)}
        />
      ) : null}
      <aside className="sidebar" aria-label="Dashboard sidebar">
        <div className="sidebar-brand">
          <Logo />
          <button
            type="button"
            className="sidebar-toggle"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            onClick={() => setSidebarCollapsed(true)}
          >
            ‹
          </button>
        </div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {TABS.map((item) => (
            <button
              type="button"
              key={item}
              className={`sidebar-link${item === tab ? "on" : ""}`}
              aria-current={item === tab ? "page" : undefined}
              title={sidebarCollapsed ? item : undefined}
              onClick={() => {
                setTab(item);
                if (window.matchMedia("(max-width: 720px)").matches) {
                  setSidebarCollapsed(true);
                }
              }}
            >
              <span className="sidebar-mark" aria-hidden="true">
                {NAV_MARKS[item]}
              </span>
              <span className="sidebar-label">{item}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-account">
          <span className="avatar" aria-hidden="true">
            {d?.user?.[0] ?? "S"}
          </span>
          <span className="sidebar-label sidebar-user">{d?.user ?? "Account"}</span>
          <button
            type="button"
            className="sidebar-signout"
            title="Sign out"
            aria-label="Sign out"
            onClick={onOut}
          >
            ↪
          </button>
        </div>
      </aside>
      <div className="dashboard-workspace">
        <header className="top">
          <button
            type="button"
            className="sidebar-expand"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
          >
            ☰
          </button>
          <span className="workspace-title">{tab}</span>
          <button className="avatar top-avatar" title="Sign out" onClick={onOut}>
            {d?.user?.[0] ?? "S"}
          </button>
        </header>
        {toolTab ? (
          <Tools name={toolTab} projects={d?.projects ?? []} request={request} />
        ) : tab !== "Overview" ? (
          <Section name={tab} token={token} />
        ) : !d ? (
          <p className="sub pad">
            {failed ? "Could not load data. Is the API running?" : "Loading…"}
          </p>
        ) : (
          <section className="pad">
            <h2>Welcome back, {d.user}</h2>
            <p className="sub">Last 30 days · all channels</p>
            <div className="kpis">
              {[
                ...d.kpis,
                { label: "Growth Score", value: String(d.health), delta: "Overall" },
                { label: "Projects", value: String(d.projects.length), delta: "Active" },
              ].map((k) => (
                <div className="card kpi" key={k.label}>
                  <span className="sub">{k.label}</span>
                  <strong>{k.value}</strong>
                  <em>{k.delta} vs last month</em>
                </div>
              ))}
            </div>
            <div className="grid">
              <div className="card">
                <h3>Revenue & leads</h3>
                <Chart a={d.revenue} b={d.leads} />
              </div>
              <div className="card insight">
                <h3>AI INSIGHT</h3>
                <p>{d.insight}</p>
                {insightError ? (
                  <p className="err" role="alert">
                    {insightError}
                  </p>
                ) : null}
                <button className="btn" onClick={refreshInsight} disabled={insightBusy}>
                  {insightBusy ? "Generating insight…" : "Refresh AI insight"}
                </button>
              </div>
              <div className="card health">
                <h3>Business health</h3>
                <svg viewBox="0 0 130 130" width="130">
                  <circle
                    cx="65"
                    cy="65"
                    r="52"
                    fill="none"
                    stroke="var(--line)"
                    strokeWidth="12"
                  />
                  <circle
                    cx="65"
                    cy="65"
                    r="52"
                    fill="none"
                    stroke="var(--green)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${(d.health / 100) * C} ${C}`}
                    transform="rotate(-90 65 65)"
                  />
                  <text
                    x="65"
                    y="72"
                    textAnchor="middle"
                    fill="#fff"
                    fontSize="26"
                    fontWeight="700"
                  >
                    {d.health}
                  </text>
                </svg>
              </div>
              <div className="card">
                <h3>
                  Roadmap <span className="pill">Preview</span>
                </h3>
                {d.roadmap.map((r) => (
                  <div className="row" key={r.title}>
                    <span>{r.title}</span>
                    <span className="sub">{r.status}</span>
                  </div>
                ))}
              </div>
              <div className="card wide">
                <h3>AI agents</h3>
                {d.agents.map((a) => (
                  <div className="row" key={a.name}>
                    <span>{a.name}</span>
                    <span className="sub">{a.task}</span>
                    <span className={`pill ${a.status === "Live" ? "ok" : ""}`}>{a.status}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid2 dashboard-support">
              <div className="card">
                <h3>Projects</h3>
                {d.projects.map((project) => (
                  <div className="row" key={project.id}>
                    <span>{project.name}</span>
                    <span className="sub">{project.websiteUrl}</span>
                  </div>
                ))}
              </div>
              <div className="card">
                <h3>Recent activity</h3>
                {d.recentActivity.length ? (
                  d.recentActivity.map((item) => (
                    <div className="row" key={item.id}>
                      <span>
                        {item.title}
                        <small className="activity-detail">{item.detail}</small>
                      </span>
                      <span className="sub">{new Date(item.performedAt).toLocaleDateString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="sub">No recent activity. Run an audit to see it here.</p>
                )}
              </div>
              <div className="card wide2">
                <h3>Quick actions</h3>
                <div className="quick-actions">
                  {TOOL_TABS.map((action) => (
                    <button className="btn ghost" key={action} onClick={() => setTab(action)}>
                      {action === "Lead Generation" ? "Generate leads" : action}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState<string | null>(null); // in-memory for the demo; use httpOnly cookies in production
  const logout = useCallback(() => setToken(null), []);
  return token ? <Dashboard token={token} onOut={logout} /> : <Login onAuth={setToken} />;
}
