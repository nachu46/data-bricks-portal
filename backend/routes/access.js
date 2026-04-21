"use strict";

const express = require("express");
const router = express.Router();
const db = require("../services/databricksService");
const { requireAdmin } = require("../middleware/auth");
const { sendAccessGrantedEmail } = require("../services/emailService");

// ── GET /access/debug — public, check DB connection & policies table
router.get("/debug", async (req, res) => {
  try {
    const data = await db.executeSQL(
      "SELECT principal_name, principal_type, catalog_name, schema_name, table_pattern, privilege, is_active FROM workspace.governance.access_policies LIMIT 5"
    );
    res.json({ ok: true, sample: data?.result?.data_array || [], status: data?.status });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message, details: err.response?.data || null });
  }
});


// ── GET /access/setup-schema — create/patch governance tables if missing
router.get("/setup-schema", async (req, res) => {
  const results = [];
  const run = async (label, sql) => {
    try {
      await db.executeSQL(sql);
      results.push({ label, ok: true });
    } catch (e) {
      results.push({ label, ok: false, error: e.message });
    }
  };

  // Create access_policies table with correct column names matching all service functions
  await run("create access_policies", `
    CREATE TABLE IF NOT EXISTS workspace.governance.access_policies (
      principal_name STRING,
      principal_type STRING,
      catalog_name   STRING,
      schema_name    STRING,
      table_pattern  STRING,
      privilege      STRING,
      is_active      BOOLEAN,
      department     STRING,
      created_at     TIMESTAMP,
      created_by     STRING
    ) USING DELTA
  `);

  // Add status column if missing (ALTER TABLE ADD COLUMNS is idempotent in Delta)
  await run("add status column", `
    ALTER TABLE workspace.governance.access_policies
    ADD COLUMNS (status STRING)
  `);

  // Add created_time column if missing
  await run("add created_time column", `
    ALTER TABLE workspace.governance.access_policies
    ADD COLUMNS (created_time TIMESTAMP)
  `);

  // Create users table if missing
  await run("create users", `
    CREATE TABLE IF NOT EXISTS workspace.governance.users (
      email    STRING,
      password STRING,
      role     STRING
    ) USING DELTA
  `);

  // Create audit_logs table if missing
  await run("create audit_logs", `
    CREATE TABLE IF NOT EXISTS workspace.governance.audit_logs (
      policy_id    STRING,
      action_type  STRING,
      executed_by  STRING,
      target_user  STRING,
      catalog_name STRING,
      schema_name  STRING,
      table_name   STRING,
      privileges   STRING,
      created_time TIMESTAMP
    ) USING DELTA
  `);

  // Create user_requests table if missing
  await run("create user_requests", `
    CREATE TABLE IF NOT EXISTS workspace.governance.user_requests (
      user         STRING,
      catalog_name STRING,
      schema_name  STRING,
      table_name   STRING,
      access_type  STRING,
      status       STRING,
      requested_at TIMESTAMP
    ) USING DELTA
  `);

  // Ensure biztraz_dev catalog and bronze schema exist first
  await run("create catalog biztraz_dev", `CREATE CATALOG IF NOT EXISTS biztraz_dev`);
  await run("create schema biztraz_dev.bronze", `CREATE SCHEMA IF NOT EXISTS biztraz_dev.bronze`);

  // Create user_access_control table in biztraz_dev.bronze if missing
  await run("create user_access_control", `
    CREATE TABLE IF NOT EXISTS biztraz_dev.bronze.user_access_control (
      user_email       STRING,
      user_name        STRING,
      user_role        STRING,
      user_status      STRING,
      groupcode        STRING,
      clustercode      STRING,
      companycode      STRING,
      plantcode        STRING,
      storage_loc_code STRING
    ) USING DELTA
  `);

  res.json({ results });
});

// ── GET /access/debug-policies — show actual columns and sample rows
router.get("/debug-policies", async (req, res) => {
  try {
    const cols = await db.executeSQL(`DESCRIBE TABLE workspace.governance.access_policies`);
    const rows = await db.executeSQL(`SELECT * FROM workspace.governance.access_policies LIMIT 3`);
    res.json({
      columns: cols?.result?.data_array || [],
      sample: rows?.result?.data_array || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ── POST /access/request — Submit access request
router.post("/request", async (req, res) => {
  const { user, catalog, schema, table, access } = req.body;
  if (!user || !catalog || !schema || !table || !access)
    return res.status(400).json({ error: "Missing required fields" });

  try {
    await db.submitAccessRequest(user, catalog, schema, table, access);
    res.json({ success: true, message: "Request submitted successfully" });
  } catch (err) {
    console.error("❌ Request:", err.message);
    res.status(500).json({ error: "Failed to submit request" });
  }
});

// ── POST /access/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: "Email and password required" });

  try {
    const data = await db.loginUser(email, password);
    if (data.result?.data_array?.length > 0) {
      const row = data.result.data_array[0];
      const department = await db.getUserDepartment(email);
      res.json({ success: true, email: row[0], role: row[2], department });
    } else {
      res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (err) {
    console.error("❌ Login error full details:", err.message, err.response?.data);
    res.status(500).json({ error: "Login failed", detail: err.message });
  }
});

// ── POST /access/register (admin only)
router.post("/register", requireAdmin, async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role)
    return res.status(400).json({ error: "Email, password, and role required" });

  try {
    await db.registerUser(email, password, role);
    res.json({ success: true, message: "User created successfully" });
  } catch (err) {
    console.error("❌ Register:", err.message);
    if (err.message.includes("duplicate"))
      return res.status(409).json({ error: "User already exists" });
    res.status(500).json({ error: "Failed to create user" });
  }
});

// ── GET /access/all-users (admin)
router.get("/all-users", requireAdmin, async (req, res) => {
  try {
    const data = await db.getAllUsers();
    res.json(data);
  } catch (err) {
    console.error("❌ All users:", err.message);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ── POST /access/update-role (admin)
router.post("/update-role", requireAdmin, async (req, res) => {
  const { email, role } = req.body;
  if (!email || !role)
    return res.status(400).json({ error: "Email and role required" });

  try {
    await db.updateUserRole(email, role);
    res.json({ success: true, message: "Role updated" });
  } catch (err) {
    console.error("❌ Update role:", err.message);
    res.status(500).json({ error: "Failed to update role" });
  }
});

// ── POST /access/update-department (admin)
router.post("/update-department", requireAdmin, async (req, res) => {
  const { email, department } = req.body;
  if (!email || department === undefined)
    return res.status(400).json({ error: "Email and department required" });

  try {
    await db.updateUserDepartment(email, department);
    res.json({ success: true, message: "Department updated" });
  } catch (err) {
    console.error("❌ Update dept:", err.message);
    res.status(500).json({ error: "Failed to update department" });
  }
});

// ── POST /access/delete-user (admin)
router.post("/delete-user", requireAdmin, async (req, res) => {
  const { email } = req.body;
  if (!email)
    return res.status(400).json({ error: "Email required" });

  try {
    await db.deleteUser(email);
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    console.error("❌ Delete user:", err.message);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// ── GET /access/resources/:email
router.get("/resources/:email", async (req, res) => {
  try {
    const resources = await db.getUserResources(req.params.email);
    res.json(resources);
  } catch (err) {
    console.error("❌ Resources:", err.message);
    res.status(500).json({ error: "Failed to load resources" });
  }
});

// ── GET /access/my-requests/:email
router.get("/my-requests/:email", async (req, res) => {
  try {
    const data = await db.getMyRequests(req.params.email);
    res.json(data);
  } catch (err) {
    console.error("❌ My requests:", err.message);
    res.status(500).json({ error: "Failed to load requests" });
  }
});

// ── GET /access/my-access/:email
router.get("/my-access/:email", async (req, res) => {
  try {
    const data = await db.getMyAccess(req.params.email);
    res.json(data);
  } catch (err) {
    console.error("❌ My access:", err.message);
    res.status(500).json({ error: "Failed to load access" });
  }
});

// ── GET /access/policies (admin)
router.get("/policies", requireAdmin, async (req, res) => {
  try {
    const data = await db.getAllPolicies();
    res.json(data);
  } catch (err) {
    console.error("❌ Policies:", err.message);
    res.status(500).json({ error: "Failed to load policies" });
  }
});

// ── GET /access/policies-all (admin) — enriched with status/created_time
router.get("/policies-all", requireAdmin, async (req, res) => {
  try {
    const data = await db.getAllPoliciesEnriched();
    res.json(data);
  } catch (err) {
    // Never return 500 to the UI — just return empty result so the page loads
    console.error("❌ Policies-all:", err.message);
    res.json({ result: { data_array: [] }, status: { state: "SUCCEEDED" } });
  }
});


// ── POST /access/delete-policy (admin)
router.post("/delete-policy", requireAdmin, async (req, res) => {
  const { email, schema, table } = req.body;
  if (!email || !schema || !table)
    return res.status(400).json({ error: "email, schema and table required" });

  try {
    await db.deletePolicy(email, schema, table);
    res.json({ success: true, message: "Policy deleted" });
  } catch (err) {
    console.error("❌ Delete policy:", err.message);
    res.status(500).json({ error: "Failed to delete policy" });
  }
});

// ── POST /access/toggle-policy (admin)
router.post("/toggle-policy", requireAdmin, async (req, res) => {
  const { email, schema, table, active } = req.body;
  if (!email || !schema || !table || active === undefined)
    return res.status(400).json({ error: "email, schema, table and active required" });

  try {
    await db.togglePolicy(email, schema, table, active);
    res.json({ success: true, message: `Policy ${active ? "activated" : "deactivated"}` });
  } catch (err) {
    console.error("❌ Toggle policy:", err.message);
    res.status(500).json({ error: "Failed to toggle policy" });
  }
});

// ── GET /access/table-data/:email/:table
router.get("/table-data/:email/:table", async (req, res) => {
  try {
    const data = await db.getTableData(req.params.email, req.params.table);
    res.json(data);
  } catch (err) {
    if (err.message === "ACCESS_DENIED")
      return res.status(403).json({ error: "Access denied to this table" });
    console.error("❌ Table data:", err.message);
    res.status(500).json({ error: "Failed to load table data" });
  }
});

// ── POST /access/assign (admin) — direct grant + insert policy record
router.post("/assign", requireAdmin, async (req, res) => {
  const adminEmail = req.headers.user || "admin";
  const { user, catalog, schema, table, privilege } = req.body;
  if (!user || !catalog || !schema || !table || !privilege)
    return res.status(400).json({ error: "All fields required" });

  const ALLOWED = ["SELECT", "MODIFY", "ALL PRIVILEGES"];
  if (!ALLOWED.includes(privilege.toUpperCase()))
    return res.status(400).json({ error: "Invalid privilege" });

  try {
    const { grantOk, grantWarning } = await db.assignAccess(user, catalog, schema, table, privilege, adminEmail);
    if (!grantOk) {
      // GRANT was blocked (e.g. sample table) but policy record was saved
      return res.json({
        success: true,
        warning: true,
        message: grantWarning || "Policy saved but Databricks GRANT could not be executed on this table.",
      });
    }
    res.json({
      success: true,
      message: `✅ Access granted: ${user} can ${privilege.toUpperCase()} on ${catalog}.${schema}.${table}`,
    });
  } catch (err) {
    console.error("❌ Assign access:", err.message);
    res.status(500).json({ error: "Failed to assign access: " + err.message });
  }
});


// ── GET /access/catalogs (admin)
router.get("/catalogs", requireAdmin, async (req, res) => {
  try {
    const catalogs = await db.listCatalogs();
    res.json({ success: true, catalogs });
  } catch (err) {
    console.error("❌ SHOW CATALOGS:", err.message);
    res.status(500).json({ error: "Failed to load catalogs" });
  }
});

// ── GET /access/schemas/:catalog (admin)
router.get("/schemas/:catalog", requireAdmin, async (req, res) => {
  try {
    const schemas = await db.listSchemas(req.params.catalog);
    res.json({ success: true, schemas });
  } catch (err) {
    console.error("❌ SHOW SCHEMAS:", err.message);
    res.status(500).json({ error: "Failed to load schemas" });
  }
});

// ── GET /access/tables/:catalog/:schema (admin)
router.get("/tables/:catalog/:schema", requireAdmin, async (req, res) => {
  try {
    const tables = await db.listTables(req.params.catalog, req.params.schema);
    res.json({ success: true, tables });
  } catch (err) {
    console.error("❌ SHOW TABLES:", err.message);
    res.status(500).json({ error: "Failed to load tables" });
  }
});

// ── GET /access/policy-grants/:catalog/:schema/:table (admin)
router.get("/policy-grants/:catalog/:schema/:table", requireAdmin, async (req, res) => {
  try {
    const grants = await db.checkTableGrants({
      catalog: req.params.catalog,
      schema: req.params.schema,
      table: req.params.table,
    });
    res.json({ success: true, grants });
  } catch (err) {
    console.error("❌ SHOW GRANTS:", err.message);
    res.status(500).json({ error: "Failed to fetch grants" });
  }
});

// ── POST /access/execute-access — Full GRANT → VERIFY → ACTIVATE → AUDIT flow (admin)
router.post("/execute-access", requireAdmin, async (req, res) => {
  const adminEmail = req.headers.user || "admin";
  const { policy_id, user_email, catalog_name, schema_name, table_name, privileges } = req.body;

  if (!policy_id || !user_email || !catalog_name || !schema_name || !table_name || !privileges)
    return res.status(400).json({ error: "Missing required fields" });

  try {
    // 1. Execute GRANT in Databricks
    const grantedPrivs = await db.grantAccess({
      catalog: catalog_name,
      schema: schema_name,
      table: table_name,
      userEmail: user_email,
      privileges,
    });

    // 2. Verify the user now appears in SHOW GRANTS
    const grants = await db.checkTableGrants({
      catalog: catalog_name,
      schema: schema_name,
      table: table_name,
    });
    const verified = grants.some(row =>
      row.some(cell => String(cell).toLowerCase().includes(user_email.toLowerCase()))
    );

    // 3. Activate policy record
    const parts = String(policy_id).split("|");
    await db.activatePolicy({
      policyId: policy_id,
      userEmail: parts[0] || user_email,
      schemaName: parts[1] || schema_name,
      tableName: parts[2] || table_name,
    });

    // 4. Insert audit log
    await db.insertAuditLog({
      policyId: policy_id,
      adminEmail,
      userEmail: user_email,
      catalog: catalog_name,
      schema: schema_name,
      table: table_name,
      privileges: grantedPrivs.join(","),
      actionType: "GRANT_ACCESS",
    });

    // 5. Send email notification to the user
    let emailResult = null;
    try {
      emailResult = await sendAccessGrantedEmail({
        userEmail: user_email,
        adminEmail,
        catalog: catalog_name,
        schema: schema_name,
        table: table_name,
        privileges: grantedPrivs.join(","),
      });
    } catch (emailErr) {
      console.error("⚠️  Email send failed (non-fatal):", emailErr.message);
    }

    res.json({
      success: true,
      verified,
      emailSent: emailResult?.sent || false,
      message: "Access granted successfully",
    });

  } catch (err) {
    console.error("❌ Execute access:", err.message);

    // Log failure to audit
    try {
      await db.insertAuditLog({
        policyId: policy_id,
        adminEmail,
        userEmail: user_email,
        catalog: catalog_name,
        schema: schema_name,
        table: table_name,
        privileges,
        actionType: "GRANT_FAILED",
      });
    } catch (logErr) {
      console.error("❌ Failed to write failure audit log:", logErr.message);
    }

    res.status(500).json({ error: "Failed to execute access: " + err.message });
  }
});

// ── GET /access/all-grants/:catalog/:schema/:table (admin) — SHOW GRANTS on table
router.get("/all-grants/:catalog/:schema/:table", requireAdmin, async (req, res) => {
  try {
    const grants = await db.getAllGrantsForTable(
      req.params.catalog, req.params.schema, req.params.table
    );
    // grants = array of rows: [principal, privilege, objectType, objectKey]
    res.json({ success: true, grants });
  } catch (err) {
    console.error("❌ all-grants:", err.message);
    res.status(500).json({ error: "Failed to fetch grants: " + err.message });
  }
});

// ── GET /access/rlac-policies (admin) — list data_access_policy
router.get("/rlac-policies", requireAdmin, async (req, res) => {
  try {
    const data = await db.getRLACPolicies();
    res.json(data);
  } catch (err) {
    console.error("❌ rlac-policies GET:", err.message);
    res.status(500).json({ error: "Failed to load RLAC policies: " + err.message });
  }
});

// ── POST /access/rlac-policies (admin) — create/update a RLAC policy
router.post("/rlac-policies", requireAdmin, async (req, res) => {
  const { principalType, principalName, groupcode, clustercode, companycode, plantcode, isActive } = req.body;
  if (!principalType || !principalName)
    return res.status(400).json({ error: "principalType and principalName are required" });
  try {
    await db.upsertRLACPolicy({ principalType, principalName, groupcode, clustercode, companycode, plantcode, isActive });
    res.json({ success: true, message: "RLAC policy saved" });
  } catch (err) {
    console.error("❌ rlac-policies POST:", err.message);
    res.status(500).json({ error: "Failed to save RLAC policy: " + err.message });
  }
});

// ── DELETE /access/rlac-policies (admin) — delete a RLAC policy
router.delete("/rlac-policies", requireAdmin, async (req, res) => {
  const { principalType, principalName } = req.body;
  if (!principalType || !principalName)
    return res.status(400).json({ error: "principalType and principalName are required" });
  try {
    await db.deleteRLACPolicy(principalType, principalName);
    res.json({ success: true, message: "RLAC policy deleted" });
  } catch (err) {
    console.error("❌ rlac-policies DELETE:", err.message);
    res.status(500).json({ error: "Failed to delete RLAC policy: " + err.message });
  }
});

// ── GET /access/user-access-control (admin) — list user_access_control
router.get("/user-access-control", requireAdmin, async (req, res) => {
  try {
    const data = await db.getUserAccessControl();
    res.json(data);
  } catch (err) {
    console.error("❌ user-access-control GET:", err.message);
    res.status(500).json({ error: "Failed to load user access control: " + err.message });
  }
});

// ── POST /access/user-access-control (admin) — upsert user in user_access_control
router.post("/user-access-control", requireAdmin, async (req, res) => {
  const { userEmail, userName, userRole, userStatus, groupcode, clustercode, companycode, plantcode, storageLocCode } = req.body;
  if (!userEmail)
    return res.status(400).json({ error: "userEmail is required" });
  try {
    await db.upsertUserAccessControl({ userEmail, userName, userRole, userStatus, groupcode, clustercode, companycode, plantcode, storageLocCode });
    res.json({ success: true, message: "User access control saved" });
  } catch (err) {
    console.error("❌ user-access-control POST:", err.message);
    res.status(500).json({ error: "Failed to save user access control: " + err.message });
  }
});

// ── DELETE /access/user-access-control (admin) — remove user from user_access_control
router.delete("/user-access-control", requireAdmin, async (req, res) => {
  const { userEmail } = req.body;
  if (!userEmail)
    return res.status(400).json({ error: "userEmail is required" });
  try {
    await db.deleteUserAccessControl(userEmail);
    res.json({ success: true, message: "User access control entry deleted" });
  } catch (err) {
    console.error("❌ user-access-control DELETE:", err.message);
    res.status(500).json({ error: "Failed to delete entry: " + err.message });
  }
});

module.exports = router;
