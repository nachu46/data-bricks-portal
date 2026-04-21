import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

// ── Inline SVG Icons (no emojis) ─────────────────────────────────────────────
const Icons = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  approve: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  key: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5" /><path d="M21 2l-9.6 9.6" /><path d="M15.5 7.5l3 3L22 7l-3-3" />
    </svg>
  ),
  shield: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  users: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  userPlus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  ),
  audit: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  request: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  ),
  myRequests: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  logout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  email: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  role: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  ),
  department: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z" />
    </svg>
  ),
  database: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  externalLink: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  lock: (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  spark: (
    <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
      <path d="M20 4L8 14l4 4-8 8 8 2 4-4 4 4 8-8-4-4 8-8L20 4z" fill="url(#spark-grad)" />
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF4B2B" />
          <stop offset="1" stopColor="#FF8C00" />
        </linearGradient>
      </defs>
    </svg>
  ),
};

// ── Admin / Customer nav configs ─────────────────────────────────────────────
const ADMIN_NAV = [
  { to: "/approvals", icon: "approve", label: "Approve Requests" },
  { to: "/assign-access", icon: "key", label: "Assign Access" },
  { to: "/policies", icon: "shield", label: "Manage Policies" },
  { to: "/users", icon: "users", label: "Manage Users" },
  { to: "/register", icon: "userPlus", label: "Register User" },
  { to: "/audit", icon: "audit", label: "Audit Logs" },
];
const CUSTOMER_NAV = [
  { to: "/request", icon: "request", label: "Request Access" },
  { to: "/myrequests", icon: "myRequests", label: "My Data" },
];
const ADMIN_ACTIONS = [
  { to: "/approvals", icon: "approve", label: "Approve Requests", accent: "#10b981" },
  { to: "/assign-access", icon: "key", label: "Assign Access", accent: "#3b82f6" },
  { to: "/policies", icon: "shield", label: "Manage Policies", accent: "#8b5cf6" },
  { to: "/users", icon: "users", label: "Manage Users", accent: "#f59e0b" },
  { to: "/register", icon: "userPlus", label: "Register User", accent: "#06b6d4" },
  { to: "/audit", icon: "audit", label: "Audit Logs", accent: "#ef4444" },
];
const CUSTOMER_ACTIONS = [
  { to: "/request", icon: "request", label: "Request Access", accent: "#3b82f6" },
  { to: "/myrequests", icon: "myRequests", label: "My Data", accent: "#10b981" },
];

// ── Sidebar link ─────────────────────────────────────────────────────────────
function SidebarLink({ to, iconKey, label }) {
  return (
    <Link to={to} style={{ textDecoration: "none" }}>
      <div
        style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "10px 14px", borderRadius: "8px", marginBottom: "2px",
          color: "#94a3b8", fontWeight: 500, fontSize: "13.5px",
          transition: "background 0.15s, color 0.15s", cursor: "pointer",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#f1f5f9"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}
      >
        <span style={{ opacity: 0.75 }}>{Icons[iconKey]}</span>
        {label}
      </div>
    </Link>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ iconKey, label, value, accent }) {
  return (
    <div style={{
      background: "#fff", borderRadius: "14px", padding: "22px 24px",
      border: "1px solid #f1f5f9", boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
        <div style={{
          width: "34px", height: "34px", borderRadius: "8px",
          background: `${accent}15`, display: "flex", alignItems: "center",
          justifyContent: "center", color: accent,
        }}>
          {Icons[iconKey]}
        </div>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827", wordBreak: "break-all" }}>{value}</div>
    </div>
  );
}

// ── Action card ──────────────────────────────────────────────────────────────
function ActionCard({ to, iconKey, label, accent }) {
  return (
    <Link to={to} style={{ textDecoration: "none" }}>
      <div
        style={{
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px",
          padding: "24px 18px", textAlign: "center",
          transition: "transform 0.18s, box-shadow 0.18s, border-color 0.18s", cursor: "pointer",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = `0 12px 30px ${accent}20`;
          e.currentTarget.style.borderColor = `${accent}60`;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.borderColor = "#e5e7eb";
        }}
      >
        <div style={{
          width: "44px", height: "44px", borderRadius: "12px",
          background: `${accent}15`, display: "flex", alignItems: "center",
          justifyContent: "center", margin: "0 auto 14px", color: accent,
        }}>
          {React.cloneElement(Icons[iconKey], { width: 20, height: 20 })}
        </div>
        <div style={{ fontWeight: 600, fontSize: "13px", color: "#374151" }}>{label}</div>
      </div>
    </Link>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
function Dashboard() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const user = localStorage.getItem("user");
  const department = localStorage.getItem("department");

  const [accessLinks, setAccessLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAccessLinks();
    } else {
      setLoading(false); // user not in localStorage — don't hang forever
    }
  }, []); // eslint-disable-line

  const loadAccessLinks = async () => {
    try {
      const res = await api.get(`/access/my-access/${user}`);
      if (res.data.result?.data_array) {
        setAccessLinks(res.data.result.data_array);
      }
    } catch (e) {
      console.log("Error loading access links:", e);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => { localStorage.clear(); navigate("/"); };

  const nav = role === "admin" ? ADMIN_NAV : CUSTOMER_NAV;
  const actions = role === "admin" ? ADMIN_ACTIONS : CUSTOMER_ACTIONS;
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{
      minHeight: "100vh", background: "#f8fafc",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display: "flex",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ══════════════ SIDEBAR ══════════════ */}
      <aside style={{
        width: "240px", minHeight: "100vh", flexShrink: 0,
        background: "#0f172a",
        display: "flex", flexDirection: "column",
        boxShadow: "4px 0 24px rgba(0,0,0,0.18)",
      }}>

        {/* Logo area */}
        <div style={{ padding: "28px 20px 22px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "40px", height: "40px", borderRadius: "10px",
              background: "linear-gradient(135deg, #FF4B2B, #FF8C00)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              {Icons.spark}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "15px", color: "#f1f5f9", letterSpacing: "-0.3px" }}>
                Databricks
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 500, marginTop: "1px" }}>
                Governance Portal
              </div>
            </div>
          </div>
        </div>

        {/* Nav section label */}
        <div style={{ padding: "20px 20px 6px" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.09em" }}>
            Navigation
          </div>
        </div>

        {/* Active: Dashboard */}
        <div style={{ padding: "0 12px 4px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "10px 14px", borderRadius: "8px",
            background: "rgba(59,130,246,0.18)", color: "#93c5fd",
            fontWeight: 600, fontSize: "13.5px",
          }}>
            <span>{Icons.dashboard}</span>
            Dashboard
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: "0 12px" }}>
          {nav.map(n => (
            <SidebarLink key={n.to} to={n.to} iconKey={n.icon} label={n.label} />
          ))}
        </nav>

        {/* User info footer */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 700, fontSize: "13px",
            }}>
              {user?.charAt(0)?.toUpperCase()}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user}
              </div>
              <div style={{
                fontSize: "10px", fontWeight: 700, color: "white",
                background: role === "admin" ? "#dc2626" : "#059669",
                padding: "1px 7px", borderRadius: "20px", display: "inline-block", marginTop: "2px",
              }}>
                {role?.toUpperCase()}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            style={{
              width: "100%", padding: "9px 14px", border: "none",
              borderRadius: "8px", background: "rgba(239,68,68,0.12)",
              color: "#fca5a5", fontWeight: 600, fontSize: "13px",
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", gap: "8px", transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.22)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.12)"}
          >
            {Icons.logout}
            Sign Out
          </button>
        </div>
      </aside>

      {/* ══════════════ MAIN CONTENT ══════════════ */}
      <main style={{ flex: 1, padding: "40px 44px", overflowY: "auto", minWidth: 0 }}>

        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "36px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>
              Welcome back, <span style={{ color: "#3b82f6" }}>{user?.split("@")[0]}</span>
            </h1>
            <p style={{ margin: "5px 0 0", color: "#94a3b8", fontSize: "13.5px" }}>{today}</p>
          </div>

          {/* Databricks link */}
          <a
            href="https://dbc-6c5e2a27-b2cf.cloud.databricks.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "9px 18px", borderRadius: "10px", textDecoration: "none",
              background: "linear-gradient(135deg, #FF4B2B, #FF8C00)",
              color: "#fff", fontWeight: 600, fontSize: "13px",
              boxShadow: "0 4px 14px rgba(255,75,43,0.3)", transition: "opacity 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            {Icons.externalLink}
            Open Databricks
          </a>
        </div>

        {/* Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          <StatCard iconKey="email" label="Email" value={user} accent="#3b82f6" />
          <StatCard iconKey="role" label="Role" value={role?.charAt(0).toUpperCase() + role?.slice(1)} accent={role === "admin" ? "#ef4444" : "#10b981"} />
          {department && <StatCard iconKey="department" label="Department" value={department} accent="#8b5cf6" />}
          <StatCard iconKey="database" label="Data Access" value={loading ? "Loading..." : `${accessLinks.length} table${accessLinks.length !== 1 ? "s" : ""}`} accent="#f59e0b" />
        </div>

        {/* Quick Actions */}
        <div style={{
          background: "#fff", borderRadius: "18px", padding: "28px",
          marginBottom: "24px", boxShadow: "0 1px 12px rgba(0,0,0,0.05)",
          border: "1px solid #f1f5f9",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "22px" }}>
            <div style={{ width: "3px", height: "18px", background: "#3b82f6", borderRadius: "2px" }} />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>Quick Actions</h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "14px" }}>
            {actions.map(a => (
              <ActionCard key={a.to} to={a.to} iconKey={a.icon} label={a.label} accent={a.accent} />
            ))}
          </div>
        </div>

        {/* My Data Access */}
        <div style={{
          background: "#fff", borderRadius: "18px", padding: "28px",
          boxShadow: "0 1px 12px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "3px", height: "18px", background: "#10b981", borderRadius: "2px" }} />
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>My Data Access</h3>
            </div>
            {!loading && accessLinks.length > 0 && (
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8" }}>
                {accessLinks.length} grant{accessLinks.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
              <div style={{
                width: "28px", height: "28px", border: "3px solid #e5e7eb",
                borderTopColor: "#3b82f6", borderRadius: "50%",
                animation: "spin 0.8s linear infinite", margin: "0 auto 12px",
              }} />
              <div style={{ fontSize: "13px" }}>Loading your access...</div>
            </div>

          ) : accessLinks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px" }}>
              <div style={{ marginBottom: "16px", opacity: 0.4 }}>{Icons.lock}</div>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "#374151", marginBottom: "6px" }}>No access granted yet</div>
              <div style={{ fontSize: "13px", color: "#9ca3af" }}>
                {role === "customer"
                  ? "Request access from an admin to get started."
                  : "Assign access to users from the Assign Access page."}
              </div>
            </div>

          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {accessLinks.map((link, i) => {
                const [catalog, schema, table, privilege = "SELECT"] = link;
                const url = `https://dbc-6c5e2a27-b2cf.cloud.databricks.com/explore/data/${catalog}/${schema}/${table}`;
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "15px 20px", background: "#f8fafc",
                    borderRadius: "12px", border: "1px solid #e2e8f0",
                    borderLeft: "4px solid #3b82f6",
                  }}>
                    <div>
                      <div style={{ fontFamily: "monospace", fontWeight: 600, color: "#1e293b", fontSize: "13.5px" }}>
                        {catalog}.{schema}.{table}
                      </div>
                      <span style={{
                        display: "inline-block", marginTop: "5px",
                        fontSize: "11px", fontWeight: 700, padding: "2px 10px",
                        background: "#dbeafe", color: "#1d4ed8", borderRadius: "20px",
                      }}>
                        {privilege}
                      </span>
                    </div>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex", alignItems: "center", gap: "6px",
                        padding: "7px 16px",
                        background: "linear-gradient(135deg, #1e3a5f, #0f172a)",
                        color: "white", borderRadius: "9px", textDecoration: "none",
                        fontWeight: 600, fontSize: "12.5px", transition: "opacity 0.2s",
                        whiteSpace: "nowrap",
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = "0.82"}
                      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                    >
                      Open {Icons.externalLink}
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
