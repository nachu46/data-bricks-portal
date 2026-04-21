// DataAccess.jsx - Premium White Theme Table Design
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../App.css";

function DataAccess() {
  const navigate = useNavigate();
  const [dataAccess, setDataAccess] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const user = localStorage.getItem("user");
  const department = localStorage.getItem("department");
  const role = localStorage.getItem("role");

  useEffect(() => {
    loadAccess();
  }, []);

  const loadAccess = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/access/my-access/${user}`);
      if (res.data.result && res.data.result.data_array) {
        setDataAccess(res.data.result.data_array);
      }
    } catch (error) {
      console.log("Error loading access:", error);
      showToast("Failed to load data access", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openTable = (catalog, schema, table) => {
    const url = `https://dbc-6c5e2a27-b2cf.cloud.databricks.com/explore/data/${catalog}/${schema}/${table}`;
    window.open(url, "_blank");
    showToast(`Opening ${catalog}.${schema}.${table}`);
  };

  return (
    <div className="dataaccess-container-white">
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
        <h1>My Data Access</h1>
        <button
          className="refresh-btn-white"
          onClick={loadAccess}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* User Info Card */}
      <div className="user-info-card-white">
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">User</span>
            <span className="info-value">{user}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Department</span>
            <span className="info-value">{department}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Role</span>
            <span className="info-value role-badge">{role}</span>
          </div>
        </div>
      </div>

      {/* Data Access Table */}
      {loading ? (
        <div className="loading-state-white">
          <div className="spinner-white"></div>
          <p>Loading your data access...</p>
        </div>
      ) : dataAccess.length === 0 ? (
        <div className="empty-state-white">
          <div className="empty-icon">—</div>
          <h3>No Data Access</h3>
          <p>No data access granted yet. Request access from admin.</p>
        </div>
      ) : (
        <div className="table-container-white">
          <div className="table-header-white">
            <h3>Your Tables ({dataAccess.length})</h3>
          </div>
          <div className="data-table-container">
            <table className="data-table-white">
              <thead>
                <tr>
                  <th>Catalog</th>
                  <th>Schema</th>
                  <th>Table</th>
                  <th>Privilege</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {dataAccess.map((item, index) => {
                  // getMyAccess returns: [catalog_name, schema_name, table_pattern, privilege]
                  const catalog = item[0];
                  const schema = item[1];
                  const table = item[2];
                  const privilege = item[3];
                  const active = true; // is_active filter applied in SQL (WHERE is_active = true)

                  return (
                    <tr key={index}>
                      <td className="mono">{catalog}</td>
                      <td className="mono">{schema}</td>
                      <td className="mono">{table}</td>
                      <td>{privilege}</td>
                      <td>
                        <span className={`status-badge status-${active ? 'granted' : 'disabled'}`}>
                          {active ? 'Granted' : 'Disabled'}
                        </span>
                      </td>
                      <td>
                        {active && (
                          <button
                            className="open-btn-white"
                            onClick={() => openTable(catalog, schema, table)}
                          >
                            Open Data →
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataAccess;
