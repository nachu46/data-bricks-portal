// Approvals.jsx - White theme with back button & inline toast
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../App.css";

function Approvals() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const authHeaders = () => ({
    role: localStorage.getItem("role"),
    user: localStorage.getItem("user"),
  });

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/pending", { headers: authHeaders() });
      setRequests(res.data?.result?.data_array || []);
    } catch (error) {
      console.error("Error loading requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const approve = async (user, table) => {
    try {
      await api.post("/admin/approve", { user, table }, { headers: authHeaders() });
      showToast(`Approved ${user} → ${table}`);
      load();
    } catch (error) {
      console.error("Approval error:", error);
      showToast("Approval failed", "error");
    }
  };

  return (
    <div className="approvals-container-white">
      {/* Inline Toast */}
      {toast && (
        <div className={`inline-toast-white toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Header with Back button */}
      <div className="page-header-white">
        <button
          className="back-btn-white"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
        <h1>Pending Requests</h1>
        <button
          className="refresh-btn-white"
          onClick={load}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {loading ? (
        <div className="loading-state-white">
          <div className="spinner-white"></div>
          <p>Loading pending requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="empty-state-white">
          <div className="empty-icon">—</div>
          <h3>No Pending Requests</h3>
          <p>All requests have been processed</p>
        </div>
      ) : (
        <div className="requests-grid-white">
          {requests.map((r, index) => (
            <div key={index} className="request-card-white">
              <div className="request-info-white">
                <div className="request-user-white">{r[0]}</div>
                <div className="request-arrow-white">→</div>
                <div className="request-table-white">{r[3]}</div>
              </div>
              <button
                className="approve-btn-white"
                onClick={() => approve(r[0], r[3])}
              >
                <span>Approve</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Approvals;
