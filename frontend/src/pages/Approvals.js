import React, { useEffect, useState } from "react";
import api from "../services/api";

function Approvals() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const res = await api.get("/admin/pending");
    setRequests(res.data.result.data_array);
  };

  const approve = async (user, table) => {
    await api.post("/admin/approve", { user, table });
    alert("Approved");
    load();
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Pending Requests</h2>

      {requests.map((r, index) => (
        <div key={index}>
          {r[0]} → {r[3]}
          <button onClick={() => approve(r[0], r[3])}>
            Approve
          </button>
        </div>
      ))}
    </div>
  );
}

export default Approvals;
