import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../App.css";
import { useToast } from "../components/Toast";

function MyRequests() {
  const navigate = useNavigate();
  const user = localStorage.getItem("user") || "admin@test.com";
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [displayData, setDisplayData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState("");
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    loadTables();
  }, []);


  const loadTables = async () => {
    try {
      setLoading(true);

      const res = await api.get(`/access/my-access/${user}`);
      console.log("📋 Tables response:", res.data);

      // getMyAccess returns Databricks SQL result: result.data_array
      // each row = [catalog_name, schema_name, table_pattern, privilege]
      const rows = res.data?.result?.data_array || [];
      if (rows.length > 0) {
        setTables(rows);
        showToast(`${rows.length} tables loaded`);
      } else {
        setTables([]);
        showToast("No tables available", "error");
      }
    } catch (error) {
      console.error("❌ Tables error:", error);
      setTables([]);
      showToast(error.response?.data?.error || "Failed to load tables", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadData = async (tableName) => {
    try {
      setTableLoading(tableName);
      setSelectedTable(tableName);
      setDisplayData([]);

      console.log("📊 Loading data for:", tableName);

      const res = await api.get(`/access/table-data/${user}/${tableName}`);
      console.log("📥 Data response:", res.data);

      // Smart parsing - handles all common response formats
      let parsedData = [];
      if (res.data.result?.data_array && Array.isArray(res.data.result.data_array)) {
        parsedData = res.data.result.data_array;
      } else if (res.data.data_array && Array.isArray(res.data.data_array)) {
        parsedData = res.data.data_array;
      } else if (Array.isArray(res.data)) {
        parsedData = res.data;
      }

      setDisplayData(parsedData);

      if (parsedData.length > 0) {
        showToast(`${parsedData.length} rows loaded`);
      } else {
        showToast("No data found");
      }

    } catch (error) {
      console.error("❌ Data error:", error);
      setDisplayData([]);
      showToast(error.response?.data?.error || "Failed to load data", "error");
    } finally {
      setTableLoading("");
    }
  };

  return (
    <div className="myrequests-container-white">
      {ToastComponent}

      {/* Header */}
      <div className="page-header-white">
        <button className="back-btn-white" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1>My Tables ({tables.length})</h1>
        <button className="refresh-btn-white" onClick={loadTables} disabled={loading}>
          {loading ? "🔄" : "⟳"}
        </button>
      </div>

      {loading ? (
        <div className="loading-state-white">
          <div className="spinner-white"></div>
          <p>Loading your tables...</p>
        </div>
      ) : tables.length === 0 ? (
        <div className="empty-state-white">
          <div style={{ marginBottom: "20px", color: "#cbd5e1" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
          </div>
          <h3>No Tables Available</h3>
          <p>You don't have access to any tables yet.</p>
          <button className="primary-btn-white" onClick={loadTables}>
            Refresh Tables
          </button>
        </div>
      ) : (
        <>
          {/* Table Selector */}
          <div className="table-selector-white">
            <h3>Available Tables ({tables.length})</h3>
            <div className="tables-grid">
              {tables.map((t, i) => (
                <button
                  key={i}
                  className={`table-btn-white 
                    ${selectedTable === t[1] ? 'active' : ''} 
                    ${tableLoading === t[1] ? 'loading' : ''}
                  `}
                  onClick={() => loadData(t[1])}
                  disabled={tableLoading === t[1]}
                  title={`View ${t[1]} data`}
                >
                  {tableLoading === t[1] ? (
                    <span className="spinner-small"></span>
                  ) : (
                    <>
                      <span className="table-icon">DB</span>
                      <span>{t[1]}</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Data Table */}
          {selectedTable && (
            <div className="table-data-container-white">
              <div className="table-header-white">
                <h3>{selectedTable} ({displayData.length} rows)</h3>
                <button
                  className="close-table-btn"
                  onClick={() => {
                    setSelectedTable("");
                    setDisplayData([]);
                  }}
                >
                  × Close
                </button>
              </div>

              {displayData.length === 0 ? (
                <div className="empty-data-state">
                  <div className="empty-icon">—</div>
                  <p>No data available for this table</p>
                  <button
                    className="secondary-btn"
                    onClick={() => loadData(selectedTable)}
                  >
                    Reload
                  </button>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="hr-data-table-white">
                    <thead>
                      <tr>
                        {Array.isArray(displayData[0]) && displayData[0].map((_, colIndex) => (
                          <th key={colIndex}>Column {colIndex + 1}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayData.slice(0, 50).map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {Array.isArray(row) ? row.map((cell, colIndex) => (
                            <td key={colIndex} className="data-cell">
                              {String(cell || '').slice(0, 50) || '—'}
                              {String(cell || '').length > 50 ? '...' : ''}
                            </td>
                          )) : (
                            <td colSpan={4} className="data-cell">
                              {String(row)}
                            </td>
                          )}
                        </tr>
                      ))}
                      {displayData.length > 50 && (
                        <tr className="more-rows-row">
                          <td colSpan={displayData[0]?.length || 1} className="more-rows-text">
                            ... and {displayData.length - 50} more rows
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default MyRequests;
