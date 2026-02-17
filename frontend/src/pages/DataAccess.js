import React, { useEffect, useState } from "react";
import api from "../services/api";
import "../App.css";

function DataAccess() {

  const [dataAccess, setDataAccess] = useState([]);

  const user = localStorage.getItem("user");
  const department = localStorage.getItem("department");
  const role = localStorage.getItem("role");

  useEffect(() => {
    loadAccess();
  }, []);

  const loadAccess = async () => {
    try {

      const res = await api.get(`/access/my-access/${user}`);

      if (res.data.result && res.data.result.data_array) {
        setDataAccess(res.data.result.data_array);
      }

    } catch (error) {
      console.log("Error loading access:", error);
    }
  };

  const openTable = (catalog, schema, table) => {

    // Databricks URL format
    const url = `https://dbc-your-workspace-url/explore/data/${catalog}/${schema}/${table}`;

    window.open(url, "_blank");

  };

  return (

    <div className="outer-wrapper">

      <div className="dashboard-box">

        <div className="content full-width">

          {/* HEADER */}
          <div className="section-box full-width">

            <h2>My Data Access</h2>

            <div className="info-row">
              <span><strong>User:</strong></span>
              <span>{user}</span>
            </div>

            <div className="info-row">
              <span><strong>Department:</strong></span>
              <span>{department}</span>
            </div>

          </div>

          {/* TABLE */}
          <div className="section-box full-width">

            {dataAccess.length === 0 ? (

              <p>No data access granted yet.</p>

            ) : (

              <table className="data-table">

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

                    const catalog = item[1];
                    const schema = item[2];
                    const table = item[3];
                    const privilege = item[4];
                    const active = item[5];

                    return (

                      <tr key={index}>

                        <td>{catalog}</td>

                        <td>{schema}</td>

                        <td>{table}</td>

                        <td>{privilege}</td>

                        <td>

                          {active ? (
                            <span style={{ color: "green" }}>
                              Granted
                            </span>
                          ) : (
                            <span style={{ color: "gray" }}>
                              Disabled
                            </span>
                          )}

                        </td>

                        <td>

                          {active && (
                            <button
                              className="quick-btn"
                              onClick={() =>
                                openTable(catalog, schema, table)
                              }
                            >
                              Open Data
                            </button>
                          )}

                        </td>

                      </tr>

                    );

                  })}

                </tbody>

              </table>

            )}

          </div>

        </div>

      </div>

    </div>

  );

}

export default DataAccess;
