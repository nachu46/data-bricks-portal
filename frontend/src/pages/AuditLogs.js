import React, { useEffect, useState } from "react";
import api from "../services/api";

function AuditLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await api.get("/admin/logs");

      console.log("API Response:", res.data);

      if (res.data.result && res.data.result.data_array) {
        setLogs(res.data.result.data_array);
      } else {
        setLogs([]);
      }

    } catch (error) {
      console.log("Error:", error);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Audit Logs</h2>

      {logs.length === 0 && <p>No logs found</p>}

      {logs.map((log, index) => (
        <div key={index} style={{ marginBottom: 10 }}>
          <b>User:</b> {log[0]} |
          <b> Table:</b> {log[3]} |
          <b> Access:</b> {log[4]} |
          <b> Status:</b> {log[5]}
        </div>
      ))}
    </div>
  );
}

export default AuditLogs;
