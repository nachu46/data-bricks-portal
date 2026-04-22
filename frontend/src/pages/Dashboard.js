import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

// Responsive hook
function useWindowWidth() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return w;
}

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

const ADMIN_NAV = [
  { to: "/assign-access", icon: "key", label: "Assign Access" },
  { to: "/policies", icon: "shield", label: "Manage Policies" },
  { to: "/users", icon: "users", label: "Manage Users" },
  { to: "/register", icon: "userPlus", label: "Register User" },
  { to: "/audit", icon: "audit", label: "Audit Logs" },
];

const ADMIN_ACTIONS = [
  { to: "/assign-access", icon: "key", label: "Assign Access", accent: "#3b82f6" },
  { to: "/policies", icon: "shield", label: "Manage Policies", accent: "#8b5cf6" },
  { to: "/users", icon: "users", label: "Manage Users", accent: "#f59e0b" },
  { to: "/register", icon: "userPlus", label: "Register User", accent: "#06b6d4" },
  { to: "/audit", icon: "audit", label: "Audit Logs", accent: "#ef4444" },
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
  const user = localStorage.getItem("user");
  const role = localStorage.getItem("role");
  const isMobile = useWindowWidth() <= 768;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const logout = () => { localStorage.clear(); navigate("/"); };

  const nav = ADMIN_NAV;
  const actions = ADMIN_ACTIONS;
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{
      minHeight: "100vh", background: "#f8fafc",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display: "flex", flexDirection: isMobile ? "column" : "row",
      position: "relative",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideInSidebar { from { transform: translateX(-100%); } to { transform: translateX(0); } }
      `}</style>

      {/* Mobile overlay backdrop */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99, backdropFilter: "blur(2px)" }} />
      )}

      {/* ══════════════ SIDEBAR ══════════════ */}
      <aside style={{
        width: isMobile ? "240px" : "240px",
        minHeight: isMobile ? "100vh" : "100vh",
        flexShrink: 0,
        background: "#0f172a",
        display: "flex", flexDirection: "column",
        boxShadow: "4px 0 24px rgba(0,0,0,0.18)",
        // On mobile: fixed drawer
        ...(isMobile ? {
          position: "fixed", top: 0, left: 0, zIndex: 100,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        } : { position: "relative" }),
      }}>

        {/* Logo area */}
        <div style={{ padding: "28px 20px 22px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
          {/* Close button on mobile */}
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: "4px", fontSize: "20px", lineHeight: 1 }}>×</button>
          )}
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
            <div key={n.to} onClick={() => setSidebarOpen(false)}>
              <SidebarLink to={n.to} iconKey={n.icon} label={n.label} />
            </div>
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
      <main style={{ flex: 1, padding: isMobile ? "20px 16px" : "40px 44px", overflowY: "auto", minWidth: 0 }}>

        {/* Mobile top bar with hamburger */}
        {isMobile && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <button onClick={() => setSidebarOpen(true)} style={{ background: "#0f172a", border: "none", color: "#fff", borderRadius: "10px", padding: "10px 14px", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "20px", lineHeight: 1 }}>☰</span>
              <span style={{ fontSize: "13px", fontWeight: 600 }}>Menu</span>
            </button>
            <a href="https://dbc-6c5e2a27-b2cf.cloud.databricks.com" target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 14px", borderRadius: "10px", textDecoration: "none", background: "linear-gradient(135deg, #FF4B2B, #FF8C00)", color: "#fff", fontWeight: 600, fontSize: "12px" }}>
              Open Databricks
            </a>
          </div>
        )}

        {/* Top bar — desktop only */}
        {!isMobile && (
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
        )}


        {/* Welcome heading always visible on mobile */}
        {isMobile && (
          <div style={{ marginBottom: "24px" }}>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>
              Welcome, <span style={{ color: "#3b82f6" }}>{user?.split("@")[0]}</span>
            </h1>
            <p style={{ margin: "5px 0 0", color: "#94a3b8", fontSize: "12px" }}>{today}</p>
          </div>
        )}

        {/* Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          <StatCard iconKey="email" label="Admin Email" value={user} accent="#3b82f6" />
          <StatCard iconKey="role" label="System Role" value="Administrator" accent="#ef4444" />
          <StatCard iconKey="audit" label="System Status" value="Online" accent="#10b981" />
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

        {/* Portal Summary */}
        <div style={{
          background: "#fff", borderRadius: "18px", padding: "28px",
          boxShadow: "0 1px 12px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
            <div style={{ width: "3px", height: "18px", background: "#10b981", borderRadius: "2px" }} />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>Portal Overview</h3>
          </div>
          <p style={{ fontSize: "14px", color: "#64748b", lineHeight: "1.6" }}>
            Welcome to the Databricks Governance Portal. As an administrator, you have direct control over data access policies. 
            Use the actions above to grant or revoke select permissions on tables, manage users, and review the system audit logs. 
            All changes are executed in real-time on the Databricks SQL Warehouse.
          </p>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
