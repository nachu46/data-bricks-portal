import React, { useEffect, useState } from "react";
import api from "../services/api";

function MyRequests() {

  const user = localStorage.getItem("user");

  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [data, setData] = useState([]);

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {

    const res = await api.get(`/access/my-access/${user}`);

    if (res.data.tables)
      setTables(res.data.tables);

  };

  const loadData = async (table) => {

    setSelectedTable(table);

    const res = await api.get(`/access/table-data/${user}/${table}`);

    if (res.data.result)
      setData(res.data.result.data_array);

  };

  return (

    <div style={{ padding:20 }}>

      <h2>My Accessible HR Data</h2>

      <div>

        {tables.map((t, i) => (

          <button
            key={i}
            onClick={() => loadData(t[1])}
            style={{ margin:5 }}
          >
            {t[1]}
          </button>

        ))}

      </div>

      <br/>

      {selectedTable && (

        <div>

          <h3>{selectedTable} Data</h3>

          <table border="1" cellPadding="5">

            <tbody>

              {data.map((row, i) => (

                <tr key={i}>
                  {row.map((col, j) => (
                    <td key={j}>{col}</td>
                  ))}
                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}

    </div>

  );

}

export default MyRequests;
