import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../App.css";
import { useToast } from "../components/Toast";

function Approvals() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const { showToast, ToastComponent } = useToast();

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


  const approve = async (user, table) => {
    try {
      await api.post("/admin/approve", { user, table }, { headers: authHeaders() });
      showToast(`Approved ${user} → ${table}`);
      load();
    } catch (error) {
      console.error("Approval error:", error);
      showToast(error.response?.data?.error || "Approval failed", "error");
    }
  };

  return (
    <div className="approvals-container-white">
      {ToastComponent}

      {/* Header with Back button */}
      <div className="page-header-white">
        <button
          className="back-btn-white"
          onClick={() => navigate(-1)}
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Back
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
          <div style={{ marginBottom: "20px", color: "#cbd5e1" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M7 15h0M2 9.5h20" />
            </svg>
          </div>
          <h3>No Pending Requests</h3>
          <p>All requests have been processed</p>
        </div>
      ) : (
        <div className="requests-grid-white">
          {requests.map((r, index) => (
            <div key={index} className="request-card-white">
              <div className="request-info-white">
                <div className="request-user-white">{r[0]}</div>
                <div className="request-arrow-white">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
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
