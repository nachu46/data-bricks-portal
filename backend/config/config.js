require("dotenv").config();

module.exports = {
  DATABRICKS_HOST: process.env.DATABRICKS_HOST,
  DATABRICKS_TOKEN: process.env.DATABRICKS_TOKEN,
  DATABRICKS_WAREHOUSE_ID: process.env.DATABRICKS_WAREHOUSE_ID
};
