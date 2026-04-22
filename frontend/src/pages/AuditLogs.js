// AuditLogs.jsx - Premium White Theme with Back Button & Toast
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../App.css";
import { useToast } from "../components/Toast";

function AuditLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      // Call the new admin logs endpoint
      const res = await api.get("/admin/audit-logs");
      
      if (res.data.success && res.data.data) {
        setLogs(res.data.data);
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.log("Error:", error);
      showToast(error.response?.data?.error || "Failed to load audit logs", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToastOld = (message, type = "success") => {
    // kept for compatibility — delegates to useToast
    showToast(message, type);
  };

  const fmtTs = (ts) => {
    if (!ts) return "—";
    try { return new Date(ts).toLocaleString(); } catch { return ts; }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", padding: "40px 44px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }
      `}</style>

      {/* Premium Toast */}
      {ToastComponent}

      {/* Header with Back button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "36px" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <button onClick={() => navigate(-1)} style={{
            background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "8px 14px",
            cursor: "pointer", color: "#64748b", fontSize: "13.5px", fontWeight: 600,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)", transition: "all 0.15s",
            display: "flex", alignItems: "center", gap: "6px"
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>
              Audit Logs
            </h1>
            <p style={{ margin: "5px 0 0", color: "#94a3b8", fontSize: "13.5px" }}>Review system activity and access changes</p>
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

      <div style={{
        background: "#fff", borderRadius: "18px", padding: "28px",
        boxShadow: "0 1px 12px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9",
      }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
            <div style={{ width: "28px", height: "28px", border: "3px solid #e5e7eb", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }}></div>
            <div style={{ fontSize: "13px" }}>Loading audit logs...</div>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ color: "#cbd5e1", marginBottom: "16px" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div style={{ fontWeight: 700, fontSize: "15px", color: "#374151", marginBottom: "6px" }}>No Audit Logs</div>
            <div style={{ fontSize: "13px", color: "#9ca3af" }}>No activity recorded yet</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["Time", "Action", "User Email", "Table"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "11px", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr key={index} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "14px 16px", color: "#94a3b8", whiteSpace: "nowrap" }}>{fmtTs(log.timestamp)}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        display: "inline-block", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700,
                        background: log.action === "GRANT" ? "#dcfce7" : "#fef2f2",
                        color: log.action === "GRANT" ? "#15803d" : "#dc2626"
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: 600, color: "#1e293b" }}>{log.user_email}</td>
                    <td style={{ padding: "14px 16px", color: "#475569", fontFamily: "monospace", fontSize: "12px" }}>{log.table_name}</td>
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

export default AuditLogs;
