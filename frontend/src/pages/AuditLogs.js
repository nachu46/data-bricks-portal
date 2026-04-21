// AuditLogs.jsx - Premium White Theme with Back Button & Toast
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../App.css";

function AuditLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/logs", {
        headers: { role: localStorage.getItem("role") }
      });
      console.log("API Response:", res.data);

      if (res.data.result && res.data.result.data_array) {
        setLogs(res.data.result.data_array);
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.log("Error:", error);
      showToast("Failed to load logs", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", padding: "40px 44px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }
      `}</style>

      {/* Inline Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 1100,
          padding: "12px 20px", borderRadius: "12px", fontWeight: 600, fontSize: "13.5px",
          background: toast.type === "error" ? "#fef2f2" : "#f0fdf4",
          color: toast.type === "error" ? "#dc2626" : "#15803d",
          border: `1px solid ${toast.type === "error" ? "#fca5a5" : "#bbf7d0"}`,
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)", animation: "fadeIn 0.25s ease"
        }}>
          {toast.type === "error" ? "❌ " : "✅ "}{toast.message}
        </div>
      )}

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
            <div style={{ fontSize: "24px", color: "#cbd5e1", marginBottom: "16px" }}>📄</div>
            <div style={{ fontWeight: 700, fontSize: "15px", color: "#374151", marginBottom: "6px" }}>No Audit Logs</div>
            <div style={{ fontSize: "13px", color: "#9ca3af" }}>No activity recorded yet</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["Time", "User", "Table", "Privileges", "Action", "Executed By"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "11px", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr key={index} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "14px 16px", color: "#94a3b8", whiteSpace: "nowrap" }}>{log[8] || "—"}</td>
                    <td style={{ padding: "14px 16px", fontWeight: 600, color: "#1e293b" }}>{log[3]}</td>
                    <td style={{ padding: "14px 16px", color: "#475569", fontFamily: "monospace", fontSize: "12px" }}>{log[4]}.{log[5]}.{log[6]}</td>
                    <td style={{ padding: "14px 16px", color: "#1d4ed8", fontWeight: 600 }}>
                      <span style={{ display: "inline-block", background: "#dbeafe", color: "#1d4ed8", padding: "2px 10px", borderRadius: "20px", fontSize: "11px" }}>{log[7]}</span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        display: "inline-block", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700,
                        background: log[1]?.toLowerCase().includes("fail") ? "#fef2f2" : "#dcfce7",
                        color: log[1]?.toLowerCase().includes("fail") ? "#dc2626" : "#15803d"
                      }}>
                        {log[1]}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", color: "#64748b" }}>{log[2]}</td>
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
