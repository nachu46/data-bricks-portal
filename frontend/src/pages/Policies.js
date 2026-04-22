// Policies.js — Manage Access Policies
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useToast } from "../components/Toast";

// ─── helpers ─────────────────────────────────────────────────────────────────
const adminHeaders = () => ({
  role: localStorage.getItem("role"),
  user: localStorage.getItem("user"),
});

const formatTs = (ts) => {
  if (!ts) return null;
  try {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  } catch { return ts; }
};

// ─── modal detail row ─────────────────────────────────────────────────────────
function DRow({ label, children }) {
  return (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", padding: "0.4rem 0", borderBottom: "1px solid #f3f4f6" }}>
      <span style={{ width: 110, flexShrink: 0, fontSize: "0.78rem", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em", paddingTop: 2 }}>{label}</span>
      <span style={{ flex: 1, fontSize: "0.875rem", color: "#111827", wordBreak: "break-all" }}>{children}</span>
    </div>
  );
}

// ─── Execute Access Modal ─────────────────────────────────────────────────────
// p[0]=policy_id  p[1]=user_email  p[2]=department  p[3]=catalog
// p[4]=schema     p[5]=table       p[6]=privileges   p[7]=status  p[8]=created_time
function ExecModal({ p, onClose, onDone, onFail }) {
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.get(`/access/policy-grants/${encodeURIComponent(p[3])}/${encodeURIComponent(p[4])}/${encodeURIComponent(p[5])}`, { headers: adminHeaders() })
      .then(r => setGrants(r.data?.grants || []))
      .catch(() => setGrants([]))
      .finally(() => setLoading(false));
  }, [p]);

  const run = async () => {
    setRunning(true); setErr(null);
    try {
      const r = await api.post("/access/execute-access", {
        policy_id: p[0], user_email: p[1], catalog_name: p[3],
        schema_name: p[4], table_name: p[5], privileges: p[6],
      }, { headers: adminHeaders() });
      if (r.data?.success) { onDone(); onClose(); }
      else {
        const msg = r.data?.error || "Execution failed";
        setErr(msg);
        if (onFail) onFail(msg);
      }
    } catch (e) {
      const msg = e.response?.data?.error || "Execution failed";
      setErr(msg);
      if (onFail) onFail(msg);
    } finally { setRunning(false); }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 580, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 30px 80px rgba(0,0,0,0.2)", overflow: "hidden" }}>

        {/* header */}
        <div style={{ padding: "1.25rem 1.5rem", background: "linear-gradient(135deg,#0f172a,#1e3a5f)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>Execute Access</div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.78rem" }}>Grant Databricks privileges</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, color: "#fff", width: 32, height: 32, cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
          <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.6rem" }}>Policy Details</p>
          <div style={{ background: "#fafafa", borderRadius: 12, border: "1px solid #e5e7eb", padding: "0.25rem 1rem 0" }}>
            <DRow label="User">{p[1]}</DRow>
            <DRow label="Catalog"><code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 5, fontSize: "0.8rem" }}>{p[3]}</code></DRow>
            <DRow label="Schema"><code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 5, fontSize: "0.8rem" }}>{p[4]}</code></DRow>
            <DRow label="Table"><code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 5, fontSize: "0.8rem" }}>{p[5]}</code></DRow>
            <DRow label="Privileges">
              {String(p[6]).split(",").map(pr => (
                <span key={pr} style={{ display: "inline-block", marginRight: 4, marginBottom: 2, background: "#ede9fe", color: "#5b21b6", padding: "2px 8px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600 }}>{pr.trim()}</span>
              ))}
            </DRow>
            <DRow label="Status">
              <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, background: p[7] === "ACTIVE" ? "#dcfce7" : "#fef3c7", color: p[7] === "ACTIVE" ? "#15803d" : "#92400e" }}>{p[7] || "PENDING"}</span>
            </DRow>
            <DRow label="Created">{formatTs(p[8]) || <span style={{ color: "#d1d5db" }}>Not set yet</span>}</DRow>
          </div>

          <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", margin: "1.25rem 0 0.6rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            Current Grants
            <span style={{ background: "#e5e7eb", color: "#6b7280", fontSize: "0.65rem", padding: "1px 8px", borderRadius: 30, fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>read-only</span>
          </p>
          {loading ? (
            <p style={{ color: "#9ca3af", fontSize: "0.85rem", textAlign: "center", padding: "1rem 0" }}>Loading…</p>
          ) : grants.length === 0 ? (
            <div style={{ textAlign: "center", padding: "1.5rem", background: "#fafafa", borderRadius: 12, border: "1px dashed #e5e7eb" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>🔓</div>
              <p style={{ color: "#9ca3af", fontSize: "0.82rem", margin: 0 }}>No existing grants on this table</p>
            </div>
          ) : (
            <div style={{ borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Principal", "Privilege", "Object Type", "Object"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#6b7280", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grants.map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      {row.map((cell, j) => <td key={j} style={{ padding: "8px 12px", color: "#374151" }}>{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {err && (
            <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, color: "#dc2626", fontSize: "0.85rem" }}>
              ❌ {err}
            </div>
          )}
        </div>

        {/* footer */}
        <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #f3f4f6", display: "flex", gap: "0.75rem", justifyContent: "flex-end", background: "#fafafa" }}>
          <button onClick={onClose} disabled={running} style={{ padding: "0.6rem 1.4rem", border: "1px solid #e5e7eb", background: "#fff", color: "#374151", borderRadius: 10, fontWeight: 500, cursor: "pointer", fontSize: "0.875rem" }}>
            Cancel
          </button>
          <button onClick={run} disabled={running} style={{ padding: "0.6rem 1.6rem", background: running ? "#6d28d9aa" : "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 600, cursor: running ? "not-allowed" : "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem", boxShadow: "0 4px 14px rgba(124,58,237,0.4)" }}>
            {running ? <><span style={{ width: 14, height: 14, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} /> Executing…</> : "⚡ Execute Access"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Show All Grants Modal ────────────────────────────────────────────────────
// p[3]=catalog  p[4]=schema  p[5]=table
function GrantsModal({ p, onClose }) {
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const headers = { role: localStorage.getItem("role"), user: localStorage.getItem("user") };
    api.get(`/access/all-grants/${encodeURIComponent(p[3])}/${encodeURIComponent(p[4])}/${encodeURIComponent(p[5])}`, { headers })
      .then(r => setGrants(r.data?.grants || []))
      .catch(e => setErr(e.response?.data?.error || "Failed to load grants"))
      .finally(() => setLoading(false));
  }, [p]);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 640, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 30px 80px rgba(0,0,0,0.2)", overflow: "hidden" }}>

        {/* header */}
        <div style={{ padding: "1.25rem 1.5rem", background: "linear-gradient(135deg,#0f172a,#065f46)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>📋</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>All Grants on Table</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.78rem", fontFamily: "monospace" }}>
              {p[3]}.{p[4]}.{p[5]}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, color: "#fff", width: 32, height: 32, cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>Loading grants from Databricks…</div>
          ) : err ? (
            <div style={{ padding: "1rem", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, color: "#dc2626", fontSize: "0.85rem" }}>❌ {err}</div>
          ) : grants.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2.5rem", background: "#fafafa", borderRadius: 12, border: "1px dashed #e5e7eb" }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>🔓</div>
              <p style={{ color: "#9ca3af", fontSize: "0.85rem", margin: 0 }}>No grants found on this table</p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.75rem" }}>
                {grants.length} grant{grants.length !== 1 ? "s" : ""} found
              </p>
              <div style={{ borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      {["Principal", "Privilege", "Object Type", "Object"].map(h => (
                        <th key={h} style={{ padding: "9px 14px", textAlign: "left", color: "#6b7280", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {grants.map((row, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "9px 14px", color: "#111827", fontWeight: 500, fontFamily: "monospace", fontSize: "0.78rem" }}>{row[0]}</td>
                        <td style={{ padding: "9px 14px" }}>
                          <span style={{ background: "#ede9fe", color: "#5b21b6", padding: "2px 8px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600 }}>{row[1]}</span>
                        </td>
                        <td style={{ padding: "9px 14px", color: "#6b7280" }}>{row[2]}</td>
                        <td style={{ padding: "9px 14px", color: "#374151", fontFamily: "monospace", fontSize: "0.75rem" }}>{row[3]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* footer */}
        <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "flex-end", background: "#fafafa" }}>
          <button onClick={onClose} style={{ padding: "0.6rem 1.4rem", border: "1px solid #e5e7eb", background: "#fff", color: "#374151", borderRadius: 10, fontWeight: 500, cursor: "pointer", fontSize: "0.875rem" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── status pill ──────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const active = status === "ACTIVE";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600,
      background: active ? "#dcfce7" : "#f3f4f6",
      color: active ? "#15803d" : "#6b7280"
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? "#22c55e" : "#9ca3af" }} />
      {status || "PENDING"}
    </span>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function Policies() {
  const navigate = useNavigate();
  const isAdmin = localStorage.getItem("role") === "admin";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState({});
  const { showToast, ToastComponent } = useToast();
  const [modal, setModal] = useState(null);
  const [grantsModal, setGrantsModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/access/policies-all", { headers: adminHeaders() });
      setRows(r.data?.result?.data_array || []);
    } catch { showToast("Failed to load policies", "error"); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const del = async (email, schema, table, i) => {
    setBusy(b => ({ ...b, [i]: "del" }));
    try {
      await api.post("/access/delete-policy", { email, schema, table }, { headers: adminHeaders() });
      showToast(`Deleted policy for ${email}`, "success");
      load();
    } catch { showToast("Failed to delete", "error"); }
    finally { setBusy(b => ({ ...b, [i]: null })); }
  };

  const toggle = async (email, schema, table, isActive, i) => {
    setBusy(b => ({ ...b, [i]: "tog" }));
    try {
      await api.post("/access/toggle-policy", { email, schema, table, active: !isActive }, { headers: adminHeaders() });
      showToast(`${!isActive ? "Activated" : "Deactivated"} policy for ${email}`, "success");
      load();
    } catch { showToast("Failed to toggle", "error"); }
    finally { setBusy(b => ({ ...b, [i]: null })); }
  };

  const activeCount = rows.filter(r => r[7] === "ACTIVE").length;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", padding: "40px 44px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }
      `}</style>

      {/* Modals */}
      {modal && <ExecModal p={modal} onClose={() => setModal(null)} onDone={() => { showToast("Access granted successfully", "success"); load(); }} onFail={(msg) => showToast(msg, "error")} />}
      {grantsModal && <GrantsModal p={grantsModal} onClose={() => setGrantsModal(null)} />}

      {ToastComponent}

      {/* Header with Back button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "36px" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <button onClick={() => navigate(-1)} style={{
            background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "8px 14px",
            cursor: "pointer", color: "#64748b", fontSize: "13.5px", fontWeight: 600,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)", transition: "all 0.15s"
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; }}>
            ← Back
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>
              Access Policies
            </h1>
            <p style={{ margin: "5px 0 0", color: "#94a3b8", fontSize: "13.5px" }}>Manage and execute Databricks access grants</p>
          </div>
        </div>
        <button onClick={load} disabled={loading} style={{
          display: "flex", alignItems: "center", gap: "8px", padding: "9px 18px", borderRadius: "10px",
          border: "none", background: "linear-gradient(135deg, #1e3a5f, #0f172a)", color: "#fff",
          fontWeight: 600, fontSize: "13px", cursor: loading ? "not-allowed" : "pointer",
          boxShadow: "0 4px 14px rgba(15,23,42,0.2)", transition: "opacity 0.2s"
        }}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Stat Cards */}
      {!loading && rows.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          <div style={{ background: "#fff", borderRadius: "14px", padding: "22px 24px", border: "1px solid #f1f5f9", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Total Policies</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a" }}>{rows.length}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "14px", padding: "22px 24px", border: "1px solid #f1f5f9", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Active</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a" }}>{activeCount}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "14px", padding: "22px 24px", border: "1px solid #f1f5f9", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Inactive</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a" }}>{rows.length - activeCount}</div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div style={{
        background: "#fff", borderRadius: "18px", padding: "28px",
        boxShadow: "0 1px 12px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9",
      }}>
        {/* Loading */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
            <div style={{ width: "28px", height: "28px", border: "3px solid #e5e7eb", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }}></div>
            <div style={{ fontSize: "13px" }}>Loading policies...</div>
          </div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ marginBottom: "16px", color: "#cbd5e1" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div style={{ fontWeight: 700, fontSize: "15px", color: "#374151", marginBottom: "6px" }}>No Policies Found</div>
            <div style={{ fontSize: "13px", color: "#9ca3af" }}>No access policies have been configured yet</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["User", "Catalog", "Schema", "Table", "Privileges", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "11px", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((p, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "14px 16px", fontWeight: 600, color: "#1e293b" }}>{p[1]}</td>
                    <td style={{ padding: "14px 16px" }}><code style={{ background: "#f1f5f9", padding: "3px 8px", borderRadius: "6px", fontSize: "12px", color: "#475569" }}>{p[3]}</code></td>
                    <td style={{ padding: "14px 16px" }}><code style={{ background: "#f1f5f9", padding: "3px 8px", borderRadius: "6px", fontSize: "12px", color: "#475569" }}>{p[4]}</code></td>
                    <td style={{ padding: "14px 16px" }}><code style={{ background: "#f1f5f9", padding: "3px 8px", borderRadius: "6px", fontSize: "12px", color: "#475569" }}>{p[5]}</code></td>
                    <td style={{ padding: "14px 16px", color: "#1d4ed8", fontWeight: 600 }}>
                      <span style={{ display: "inline-block", background: "#dbeafe", color: "#1d4ed8", padding: "2px 10px", borderRadius: "20px", fontSize: "11px" }}>{p[6]}</span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        display: "inline-flex", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, alignItems: "center", gap: "5px",
                        background: p[7] === "ACTIVE" ? "#dcfce7" : "#f1f5f9",
                        color: p[7] === "ACTIVE" ? "#15803d" : "#64748b"
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: p[7] === "ACTIVE" ? "#22c55e" : "#9ca3af" }} />
                        {p[7] || "PENDING"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <button
                          disabled={!!busy[i]}
                          onClick={() => toggle(p[1], p[4], p[5], p[7] === "ACTIVE", i)}
                          style={{
                            padding: "6px 12px", border: `1px solid ${p[7] === "ACTIVE" ? "#fdba74" : "#86efac"}`, borderRadius: "8px",
                            background: "#fff", color: p[7] === "ACTIVE" ? "#c2410c" : "#16a34a", fontWeight: 600, fontSize: "12px",
                            cursor: busy[i] ? "not-allowed" : "pointer", transition: "all 0.15s"
                          }}
                        >
                          {busy[i] === "tog" ? "..." : p[7] === "ACTIVE" ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          disabled={!!busy[i]}
                          onClick={() => setGrantsModal(p)}
                          style={{
                            padding: "6px 12px", border: "1px solid #d1d5db", borderRadius: "8px",
                            background: "#fff", color: "#4b5563", fontWeight: 600, fontSize: "12px",
                            cursor: busy[i] ? "not-allowed" : "pointer", transition: "all 0.15s"
                          }}
                        >
                          Grants
                        </button>
                        {isAdmin && (
                          <button
                            disabled={!!busy[i]}
                            onClick={() => setModal(p)}
                            style={{
                              padding: "6px 12px", border: "none", borderRadius: "8px",
                              background: "linear-gradient(135deg, #7c3aed, #5b21b6)", color: "#fff", fontWeight: 600, fontSize: "12px",
                              cursor: busy[i] ? "not-allowed" : "pointer", transition: "all 0.15s", boxShadow: "0 2px 8px rgba(124,58,237,0.3)"
                            }}
                          >
                            Execute
                          </button>
                        )}
                        <button
                          disabled={!!busy[i]}
                          onClick={() => del(p[1], p[4], p[5], i)}
                          style={{
                            padding: "6px 12px", border: "1px solid #fca5a5", borderRadius: "8px",
                            background: "#fff", color: "#dc2626", fontWeight: 600, fontSize: "12px",
                            cursor: busy[i] ? "not-allowed" : "pointer", transition: "all 0.15s"
                          }}
                        >
                          {busy[i] === "del" ? "..." : "Del"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
