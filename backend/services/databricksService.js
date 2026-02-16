const axios = require("axios");

async function runQuery(sql) {
  const response = await axios.post(
    `${process.env.DATABRICKS_HOST}/api/2.0/sql/statements`,
    {
      statement: sql,
      warehouse_id: process.env.WAREHOUSE_ID
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.DATABRICKS_TOKEN}`
      }
    }
  );

  return response.data;
}

module.exports = { runQuery };
