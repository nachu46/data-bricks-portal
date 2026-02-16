import React, { useState, useEffect } from "react";
import api from "../services/api";

function RequestAccess() {

  const user = localStorage.getItem("user");

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

  useEffect(() => {
    loadResources();
    loadRequests();
  }, []);

  const loadResources = async () => {

    const res = await api.get(`/access/resources/${user}`);

    setResources(res.data);

  };

  const loadRequests = async () => {

    const res = await api.get(`/access/my-requests/${user}`);

    if (res.data.result)
      setRequests(res.data.result.data_array);

  };

  const submit = async () => {

    await api.post("/access/request", form);

    alert("Request submitted. Waiting for approval.");

    loadRequests();

  };

  return (

    <div style={{ padding: 20 }}>

      <h2>Request Data Access</h2>

      {/* Catalog dropdown */}
      <select
        onChange={e => setForm({ ...form, catalog: e.target.value })}
      >
        <option>Select Catalog</option>
        {resources.catalogs.map(c =>
          <option key={c}>{c}</option>
        )}
      </select>

      {/* Schema dropdown */}
      <select
        onChange={e => setForm({ ...form, schema: e.target.value })}
      >
        <option>Select Schema</option>
        {resources.schemas.map(s =>
          <option key={s}>{s}</option>
        )}
      </select>

      {/* Table dropdown */}
      <select
        onChange={e => setForm({ ...form, table: e.target.value })}
      >
        <option>Select Table</option>
        {resources.tables.map(t =>
          <option key={t}>{t}</option>
        )}
      </select>

      {/* Access type dropdown */}
      <select
        onChange={e => setForm({ ...form, access: e.target.value })}
      >
        <option value="SELECT">SELECT</option>
        <option value="MODIFY">MODIFY</option>
        <option value="ALL">ALL</option>
      </select>

      <br/><br/>

      <button onClick={submit}>
        Submit Request
      </button>

      <hr/>

      <h3>My Requests</h3>

      {requests.map((r, i) => (

        <div key={i}>

          {r[1]} . {r[2]} . {r[3]} — {r[4]}

          {r[4] === "PENDING" &&
            <span style={{ color:"orange" }}> Waiting for approval</span>
          }

          {r[4] === "APPROVED" &&
            <span style={{ color:"green" }}> Approved</span>
          }

          {r[4] === "APPLIED" &&
            <span style={{ color:"blue" }}> Access Granted</span>
          }

        </div>

      ))}

    </div>

  );

}

export default RequestAccess;
