import React, { useEffect, useState } from "react";
import axios from "axios";

function Policies() {

  const [policies, setPolicies] = useState([]);

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {

    const res = await axios.get(
      "http://localhost:5000/api/access/policies",
      {
        headers: {
          role: localStorage.getItem("role"),
          user: localStorage.getItem("user")
        }
      }
    );

    setPolicies(res.data.result.data_array || []);

  };

  const deletePolicy = async (email, schema, table) => {

    await axios.post(
      "http://localhost:5000/api/access/delete-policy",
      { email, schema, table },
      {
        headers: {
          role: localStorage.getItem("role"),
          user: localStorage.getItem("user")
        }
      }
    );

    loadPolicies();

  };

  const togglePolicy = async (email, schema, table, active) => {

    await axios.post(
      "http://localhost:5000/api/access/toggle-policy",
      { email, schema, table, active },
      {
        headers: {
          role: localStorage.getItem("role"),
          user: localStorage.getItem("user")
        }
      }
    );

    loadPolicies();

  };

  return (

    <div style={{ padding: 20 }}>

      <h2>Access Policies</h2>

      <table border="1" cellPadding="10">

        <thead>
          <tr>
            <th>User</th>
            <th>Schema</th>
            <th>Table</th>
            <th>Privilege</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {policies.map((p, i) => (

            <tr key={i}>

              <td>{p[0]}</td>
              <td>{p[2]}</td>
              <td>{p[3]}</td>
              <td>{p[4]}</td>
              <td>{p[5] ? "Active" : "Disabled"}</td>

              <td>

                <button onClick={() =>
                  togglePolicy(p[0], p[2], p[3], !p[5])
                }>
                  Toggle
                </button>

                <button onClick={() =>
                  deletePolicy(p[0], p[2], p[3])
                }>
                  Delete
                </button>

              </td>

            </tr>

          ))}
        </tbody>

      </table>

    </div>

  );

}

export default Policies;
