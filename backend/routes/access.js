const express = require("express");
const router = express.Router();

const { runQuery } = require("../services/databricksService");
const { requireAdmin } = require("../middleware/auth");


// ============================================
// Submit access request (Customer)
// ============================================
router.post("/request", async (req, res) => {

  try {

    const { user, catalog, schema, table, access } = req.body;

    const sql = `
      INSERT INTO workspace.governance.user_requests
      VALUES ('${user}', '${catalog}', '${schema}', '${table}', '${access}', 'PENDING')
    `;

    await runQuery(sql);

    res.send({ success: true, message: "Request submitted" });

  } catch (error) {

    res.status(500).send({ error: error.message });

  }

});


// ============================================
// Get request history
// ============================================
router.get("/history/:user", async (req, res) => {

  try {

    const requestedUser = req.params.user;
    const role = req.headers.role;
    const loggedUser = req.headers.user;

    if (role === "customer" && requestedUser !== loggedUser) {
      return res.status(403).send({ message: "Access denied" });
    }

    const sql = `
      SELECT *
      FROM workspace.governance.user_requests
      WHERE user='${requestedUser}'
      ORDER BY status DESC
    `;

    const data = await runQuery(sql);

    res.send(data);

  } catch (error) {

    res.status(500).send({ error: error.message });

  }

});


// ============================================
// Login
// ============================================
router.post("/login", async (req, res) => {

  try {

    const { email, password } = req.body;

    const sql = `
      SELECT *
      FROM workspace.governance.users
      WHERE email='${email}'
      AND password='${password}'
    `;

    const data = await runQuery(sql);

    if (
      data.result &&
      data.result.data_array &&
      data.result.data_array.length > 0
    ) {

      const user = data.result.data_array[0];

      // get department also
      const deptSql = `
        SELECT department
        FROM workspace.governance.access_policies
        WHERE user_email='${email}'
        LIMIT 1
      `;

      const deptData = await runQuery(deptSql);

      let department = null;

      if (
        deptData.result &&
        deptData.result.data_array &&
        deptData.result.data_array.length > 0
      ) {
        department = deptData.result.data_array[0][0];
      }

      res.send({
        success: true,
        email: user[0],
        role: user[2],
        department: department
      });

    }
    else {

      res.send({
        success: false,
        message: "Invalid login"
      });

    }

  }
  catch (error) {

    res.status(500).send({ error: error.message });

  }

});


// ============================================
// Register new user
// ============================================
router.post("/register", requireAdmin, async (req, res) => {

  try {

    const { email, password, role } = req.body;

    const sql = `
      INSERT INTO workspace.governance.users
      VALUES ('${email}', '${password}', '${role}')
    `;

    await runQuery(sql);

    res.send({
      success: true,
      message: "User created successfully"
    });

  }
  catch (error) {

    res.status(500).send({ error: error.message });

  }

});


// ============================================
// Get all users WITH department
// ============================================
router.get("/all-users", requireAdmin, async (req, res) => {

  try {

    const sql = `
      SELECT 
        u.email,
        u.password,
        u.role,
        p.department
      FROM workspace.governance.users u
      LEFT JOIN workspace.governance.access_policies p
      ON u.email = p.user_email
      ORDER BY u.email
    `;

    const data = await runQuery(sql);

    res.send(data);

  }
  catch (error) {

    res.status(500).send({ error: error.message });

  }

});


// ============================================
// Delete user
// ============================================
router.post("/delete-user", requireAdmin, async (req, res) => {

  try {

    const { email } = req.body;

    await runQuery(`
      DELETE FROM workspace.governance.users
      WHERE email='${email}'
    `);

    await runQuery(`
      DELETE FROM workspace.governance.access_policies
      WHERE user_email='${email}'
    `);

    res.send({
      success: true,
      message: "User deleted"
    });

  }
  catch (error) {

    res.status(500).send({ error: error.message });

  }

});


// ============================================
// Update role
// ============================================
router.post("/update-role", requireAdmin, async (req, res) => {

  try {

    const { email, role } = req.body;

    const sql = `
      UPDATE workspace.governance.users
      SET role='${role}'
      WHERE email='${email}'
    `;

    await runQuery(sql);

    res.send({
      success: true,
      message: "Role updated"
    });

  }
  catch (error) {

    res.status(500).send({ error: error.message });

  }

});


// ============================================
// Update department
// ============================================
router.post("/update-department", requireAdmin, async (req, res) => {

  try {

    const { email, department } = req.body;

    const sql = `
      UPDATE workspace.governance.access_policies
      SET department='${department}'
      WHERE user_email='${email}'
    `;

    await runQuery(sql);

    res.send({
      success: true,
      message: "Department updated"
    });

  }
  catch (error) {

    res.status(500).send({ error: error.message });

  }

});


// ============================================
// Get policies
// ============================================
router.get("/policies", requireAdmin, async (req, res) => {

  try {

    const sql = `
      SELECT *
      FROM workspace.governance.access_policies
      ORDER BY created_at DESC
    `;

    const data = await runQuery(sql);

    res.send(data);

  }
  catch (error) {

    res.status(500).send({ error: error.message });

  }

});


// ============================================
// Delete policy
// ============================================
router.post("/delete-policy", requireAdmin, async (req, res) => {

  try {

    const { email, schema, table } = req.body;

    const sql = `
      DELETE FROM workspace.governance.access_policies
      WHERE user_email='${email}'
      AND schema_name='${schema}'
      AND table_pattern='${table}'
    `;

    await runQuery(sql);

    res.send({
      success: true,
      message: "Policy deleted"
    });

  }
  catch (error) {

    res.status(500).send({ error: error.message });

  }

});


// ============================================
// Toggle policy
// ============================================
router.post("/toggle-policy", requireAdmin, async (req, res) => {

  try {

    const { email, schema, table, active } = req.body;

    const sql = `
      UPDATE workspace.governance.access_policies
      SET is_active=${active}
      WHERE user_email='${email}'
      AND schema_name='${schema}'
      AND table_pattern='${table}'
    `;

    await runQuery(sql);

    res.send({
      success: true,
      message: "Policy updated"
    });

  }
  catch (error) {

    res.status(500).send({ error: error.message });

  }

});
// ============================================
// Get allowed resources for user department
// ============================================
router.get("/resources/:email", async (req, res) => {

  try {

    const email = req.params.email;

    const sql = `
      SELECT department
      FROM workspace.governance.access_policies
      WHERE user_email='${email}'
      LIMIT 1
    `;

    const result = await runQuery(sql);

    if (
      !result.result ||
      !result.result.data_array ||
      result.result.data_array.length === 0
    ) {

      return res.send({
        catalogs: [],
        schemas: [],
        tables: []
      });

    }

    const department = result.result.data_array[0][0];

    res.send({
      catalogs: ["workspace"],
      schemas: [department],
      tables: ["orders_jan","orders_feb","customers"]
    });

  }
  catch (error) {

    res.status(500).send({ error: error.message });

  }

});


// ============================================
// Get my requests
// ============================================
router.get("/my-requests/:email", async (req, res) => {

  try {

    const email = req.params.email;

    const sql = `
      SELECT catalog, schema, table, access, status
      FROM workspace.governance.user_requests
      WHERE user='${email}'
      ORDER BY status DESC
    `;

    const data = await runQuery(sql);

    res.send(data);

  }
  catch (error) {

    res.status(500).send({ error: error.message });

  }

});
// Get accessible tables for logged user
router.get("/my-access/:email", async (req, res) => {

  try {

    const email = req.params.email;

    // get department
    const deptSql = `
      SELECT department
      FROM workspace.governance.access_policies
      WHERE user_email='${email}'
      LIMIT 1
    `;

    const deptResult = await runQuery(deptSql);

    if (!deptResult.result.data_array.length)
      return res.send([]);

    const department = deptResult.result.data_array[0][0];

    // get tables in that department schema
    const tableSql = `
      SHOW TABLES IN workspace.${department}
    `;

    const tables = await runQuery(tableSql);

    res.send({
      department,
      tables: tables.result.data_array
    });

  }
  catch (error) {

    res.status(500).send({ error: error.message });

  }

});
router.get("/table-data/:email/:table", async (req, res) => {

  try {

    const email = req.params.email;
    const table = req.params.table;

    const deptSql = `
      SELECT department
      FROM workspace.governance.access_policies
      WHERE user_email='${email}'
      LIMIT 1
    `;

    const deptResult = await runQuery(deptSql);

    if (!deptResult.result.data_array.length)
      return res.send([]);

    const department = deptResult.result.data_array[0][0];

    const sql = `
      SELECT *
      FROM workspace.${department}.${table}
      LIMIT 100
    `;

    const data = await runQuery(sql);

    res.send(data);

  }
  catch (error) {

    res.status(500).send({ error: error.message });

  }

});


module.exports = router;
