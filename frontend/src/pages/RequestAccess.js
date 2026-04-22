import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../App.css";
import { useToast } from "../components/Toast";

function RequestAccess() {
  const navigate = useNavigate();
  const user = localStorage.getItem("user") || "user@company.com";

  const [resources, setResources] = useState({
    catalogs: [],
    schemas: [],
    tables: []
  });

  const [form, setForm] = useState({
    user: user,
    catalog: "",
    schema: "",
    table: "",
    access: "SELECT"
  });

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    loadEverything();
  }, []);


  const loadEverything = async () => {
    setLoading(true);
    try {
      // Load resources with fallback
      try {
        const res = await api.get(`/access/resources/${user}`);
        setResources({
          catalogs: res.data.catalogs || [],
          schemas: res.data.schemas || [],
          tables: res.data.tables || []
        });
      } catch (e) {
        // Demo data
        setResources({
          catalogs: ["hr", "finance", "sales"],
          schemas: ["public", "hr", "payroll"],
          tables: ["employees", "departments", "salaries", "performance"]
        });
      }

      // Load requests
      try {
        const reqRes = await api.get(`/access/my-requests/${user}`);
        setRequests(reqRes.data.result?.data_array || []);
      } catch (e) {
        setRequests([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!form.catalog || !form.schema || !form.table) {
      showToast("Please select Catalog, Schema, and Table", "error");
      return;
    }

    try {
      setFormLoading(true);
      await api.post("/access/request", form);
      showToast("Request submitted! Awaiting approval...");

      // Reset form
      setForm({ user, catalog: "", schema: "", table: "", access: "SELECT" });
      loadEverything();
    } catch (error) {
      showToast(error.response?.data?.error || "Failed to submit request", "error");
      console.error("Submit error:", error);
    } finally {
      setFormLoading(false);
    }
  };

  const canSubmit = form.catalog && form.schema && form.table;

  return (
    <div className="request-compact-container">
      {ToastComponent}

      {/* Header */}
      <div className="request-compact-header">
        <button
          className="back-btn-compact"
          onClick={() => navigate(-1)}
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </button>
        <div>
          <h1>Request Access</h1>
          <span className="header-subtitle">
            {user} • {requests.length} requests
          </span>
        </div>
        <button
          className="refresh-btn-compact"
          onClick={loadEverything}
          disabled={loading}
          style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: loading ? "spin 1s linear infinite" : "none" }}>
            <path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="compact-loading-state">
          <div className="compact-spinner"></div>
          <p>Loading resources...</p>
        </div>
      ) : (
        <div className="request-dual-cards">
          {/* NEW REQUEST CARD */}
          <div className="request-form-compact">
            <div className="card-header-compact">
              <h3>New Request</h3>
            </div>

            <div className="compact-form-grid">
              <div className="compact-input-group">
                <label>Catalog</label>
                <select
                  value={form.catalog}
                  onChange={(e) => setForm({ ...form, catalog: e.target.value })}
                  disabled={formLoading}
                >
                  <option value="">Select...</option>
                  {resources.catalogs.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="compact-input-group">
                <label>Schema</label>
                <select
                  value={form.schema}
                  onChange={(e) => setForm({ ...form, schema: e.target.value })}
                  disabled={formLoading || !form.catalog}
                >
                  <option value="">Select...</option>
                  {resources.schemas.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="compact-input-group">
                <label>Table</label>
                <select
                  value={form.table}
                  onChange={(e) => setForm({ ...form, table: e.target.value })}
                  disabled={formLoading || !form.schema}
                >
                  <option value="">Select...</option>
                  {resources.tables.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="compact-input-group">
                <label>Access</label>
                <select
                  value={form.access}
                  onChange={(e) => setForm({ ...form, access: e.target.value })}
                  disabled={formLoading}
                >
                  <option value="SELECT">SELECT</option>
                  <option value="MODIFY">MODIFY</option>
                  <option value="ALL">ALL PRIVILEGES</option>
                </select>
              </div>
            </div>

            <button
              className={`submit-compact-btn ${canSubmit ? 'ready' : ''}`}
              onClick={submit}
              disabled={!canSubmit || formLoading}
            >
              {formLoading ? (
                <>
                  <div className="compact-spinner-small"></div>
                  Submitting...
                </>
              ) : (
                `Submit Request →`
              )}
            </button>
          </div>

          {/* REQUESTS LIST CARD */}
          <div className="requests-list-compact">
            <div className="card-header-compact">
              <h3>My Requests ({requests.length})</h3>
            </div>

            {requests.length === 0 ? (
              <div className="compact-empty-state">
                <div className="empty-icon-compact">—</div>
                <p>No requests yet</p>
              </div>
            ) : (
              <div className="compact-requests-list">
                {requests.slice(0, 8).map((r, i) => (
                  <div key={i} className="compact-request-item">
                    <div className="request-path-compact">
                      {r[1]}.{r[2]}.{r[3]}
                    </div>
                    <span className={`status-badge status-${r[4]?.toLowerCase() || 'pending'}`}>
                      {r[4] || 'PENDING'}
                    </span>
                  </div>
                ))}
                {requests.length > 8 && (
                  <div className="more-requests">
                    +{requests.length - 8} more...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default RequestAccess;
