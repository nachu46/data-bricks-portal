const axios = require("axios");

const HOST = process.env.DATABRICKS_HOST;
const TOKEN = process.env.DATABRICKS_TOKEN;
const WAREHOUSE_ID = process.env.WAREHOUSE_ID;

// Run query
async function runQuery(sql) {

  const response = await axios.post(
    `${HOST}/api/2.0/sql/statements`,
    {
      statement: sql,
      warehouse_id: WAREHOUSE_ID,
      wait_timeout: "30s"
    },
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json"
      }
    }
  );

  return response.data;
}

// Fetch query results (for SELECT)
async function fetchQuery(sql) {

  const result = await runQuery(sql);

  if (
    result.result &&
    result.result.data_array
  ) {
    return result.result.data_array;
  }

  return [];

}

module.exports = {
  runQuery,
  fetchQuery
};
