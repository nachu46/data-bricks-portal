import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../App.css";
import { useToast } from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";

function UsersList() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const { showToast, ToastComponent } = useToast();
  const [confirmModal, setConfirmModal] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const showToastOld = (message, type = "success") => {
    showToast(message, type);
  };

  const load = async () => {
    try {
      setLoading(true);
      const role = localStorage.getItem("role") || "admin";
      const user = localStorage.getItem("user") || "admin@test.com";

      try {
        const res = await api.get("/access/all-users", {
          headers: { role, user }
        });
        if (res.data.result?.data_array) {
          const formatted = res.data.result.data_array.map(row => ({
            email: row[0],
            role: (row[1] || "customer").toLowerCase(),
            department: row[2] || "N/A"
          }));
          setUsers(formatted);
          return;
        }
      } catch (e) {
        console.log("Admin endpoint failed, using fallback...");
      }

      const policiesRes = await api.get("/access/policies", {
        headers: { role, user }
      });
      const uniqueUsers = [...new Set((policiesRes.data?.result?.data_array || []).map(p => p[0]))]
        .map(email => ({ email, role: 'customer', department: 'N/A' }));
      setUsers(uniqueUsers);

    } catch (error) {
      console.error("Failed to load users:", error);
      showToast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const deleteUser = (email, index) => {
    setConfirmModal({
      title: "Delete User",
      message: (<>Are you sure you want to delete <strong style={{ color: "#111827" }}>{email}</strong>?<br /><span style={{ fontSize: "13px", color: "#6b7280" }}>This action is permanent and cannot be undone.</span></>),
      confirmText: "Delete User",
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          setActionLoading(prev => ({ ...prev, [index]: true }));
          const role = localStorage.getItem("role") || "admin";
          const currentUser = localStorage.getItem("user") || "";
          await api.post("/access/delete-user", { email }, { headers: { role, user: currentUser } });
          setUsers(prev => prev.filter(u => u.email !== email));
          showToast("User deleted");
        } catch (error) {
          showToast(error.response?.data?.error || "Delete failed", "error");
        } finally {
          setActionLoading(prev => ({ ...prev, [index]: false }));
        }
      }
    });
  };

  const totalUsers = users.length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const customerCount = users.filter(u => u.role === 'customer').length;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", padding: "40px 44px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }
      `}</style>

      <ConfirmModal isOpen={!!confirmModal} {...confirmModal} onCancel={() => setConfirmModal(null)} confirmText="Delete User" />
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
              Manage Users
            </h1>
            <p style={{ margin: "5px 0 0", color: "#94a3b8", fontSize: "13.5px" }}>View and manage platform accounts</p>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <div style={{ background: "#fff", borderRadius: "14px", padding: "22px 24px", border: "1px solid #f1f5f9", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Total Users</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a" }}>{totalUsers}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: "14px", padding: "22px 24px", border: "1px solid #f1f5f9", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Admins</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a" }}>{adminCount}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: "14px", padding: "22px 24px", border: "1px solid #f1f5f9", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Customers</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a" }}>{customerCount}</div>
        </div>
      </div>

      <div style={{
        background: "#fff", borderRadius: "18px", padding: "28px",
        boxShadow: "0 1px 12px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9",
      }}>
        {/* Search */}
        <div style={{ marginBottom: "20px" }}>
          <input
            type="text"
            placeholder="Search users by email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%", maxWidth: "400px", padding: "10px 16px", borderRadius: "10px",
              border: "1px solid #e2e8f0", fontSize: "13.5px", color: "#334155",
              outline: "none", transition: "border-color 0.2s"
            }}
            onFocus={e => e.currentTarget.style.border = "1px solid #3b82f6"}
            onBlur={e => e.currentTarget.style.border = "1px solid #e2e8f0"}
          />
        </div>

        {/* Users List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
            <div style={{ width: "28px", height: "28px", border: "3px solid #e5e7eb", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }}></div>
            <div style={{ fontSize: "13px" }}>Loading users...</div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ fontSize: "24px", color: "#cbd5e1", marginBottom: "16px" }}>👥</div>
            <div style={{ fontWeight: 700, fontSize: "15px", color: "#374151", marginBottom: "6px" }}>No Users Found</div>
            <div style={{ fontSize: "13px", color: "#9ca3af" }}>Try adjusting your search terms</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["User", "Email", "Role", "Department", "Actions"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "11px", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <tr key={index} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "14px 16px", width: "50px" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "13px" }}>
                        {user.email[0].toUpperCase()}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: 600, color: "#1e293b" }}>{user.email}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        display: "inline-block", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700,
                        background: user.role === "admin" ? "#fef2f2" : "#ecfeff",
                        color: user.role === "admin" ? "#dc2626" : "#0891b2"
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        display: "inline-block", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700,
                        background: "#f1f5f9", color: "#475569"
                      }}>
                        {user.department}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <button
                        onClick={() => deleteUser(user.email, index)}
                        disabled={actionLoading[index]}
                        style={{
                          padding: "6px 14px", border: "1px solid #fca5a5", borderRadius: "8px",
                          background: "#fff", color: "#dc2626", fontWeight: 600, fontSize: "12px",
                          cursor: actionLoading[index] ? "not-allowed" : "pointer",
                          transition: "all 0.15s"
                        }}
                        onMouseEnter={e => { if (!actionLoading[index]) { e.currentTarget.style.background = "#fef2f2"; } }}
                        onMouseLeave={e => { if (!actionLoading[index]) { e.currentTarget.style.background = "#fff"; } }}
                      >
                        {actionLoading[index] ? "Deleting..." : "Delete"}
                      </button>
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

export default UsersList;
