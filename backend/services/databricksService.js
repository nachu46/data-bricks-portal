"use strict";

const axios = require("axios");

const HOST = process.env.DATABRICKS_HOST;
const TOKEN = process.env.DATABRICKS_TOKEN;
const WAREHOUSE_ID = process.env.WAREHOUSE_ID || process.env.DATABRICKS_WAREHOUSE_ID;

// ─────────────────────────────────────────────────────────────────────────────
// CORE: escape a value for safe SQL string injection
// ─────────────────────────────────────────────────────────────────────────────
const esc = (value) => {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
};

// ─────────────────────────────────────────────────────────────────────────────
// CORE: execute any SQL statement against Databricks SQL Warehouse (async poll)
// ─────────────────────────────────────────────────────────────────────────────
async function executeSQL(sql) {
  // Submit the statement
  const submit = await axios.post(
    `${HOST}/api/2.0/sql/statements`,
    { statement: sql, warehouse_id: WAREHOUSE_ID },
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );

  const statementId = submit.data.statement_id;

  // If already done (fast path)
  if (submit.data.status?.state === "SUCCEEDED") return submit.data;
  if (submit.data.status?.state === "FAILED") {
    throw new Error(submit.data.status.error?.message || "SQL execution failed");
  }

  // Poll until SUCCEEDED or FAILED
  let state = submit.data.status?.state || "PENDING";
  let result = submit.data;

  while (state === "PENDING" || state === "RUNNING") {
    await new Promise((r) => setTimeout(r, 1200));
    const check = await axios.get(
      `${HOST}/api/2.0/sql/statements/${statementId}`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    state = check.data.status?.state;
    result = check.data;
  }

  if (state !== "SUCCEEDED") {
    throw new Error(result.status?.error?.message || `SQL failed with state: ${state}`);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE: execute SQL and return only the data_array rows (for SELECT)
// ─────────────────────────────────────────────────────────────────────────────
async function fetchRows(sql) {
  const result = await executeSQL(sql);
  return result?.result?.data_array || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// USER: login
// ─────────────────────────────────────────────────────────────────────────────
async function loginUser(email, password) {
  return executeSQL(`
    SELECT email, password, role
    FROM workspace.governance.users
    WHERE email = ${esc(email)} AND password = ${esc(password)}
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// USER: register
// ─────────────────────────────────────────────────────────────────────────────
async function registerUser(email, password, role) {
  return executeSQL(`
    INSERT INTO workspace.governance.users (email, password, role)
    VALUES (${esc(email)}, ${esc(password)}, ${esc(role)})
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// USER: get all users (with department via join)
// ─────────────────────────────────────────────────────────────────────────────
async function getAllUsers() {
  return executeSQL(`
    SELECT u.email, u.role, MAX(p.department) AS department
    FROM workspace.governance.users u
    LEFT JOIN workspace.governance.access_policies p
      ON u.email = p.principal_name AND p.principal_type = 'USER'
    GROUP BY u.email, u.role
    ORDER BY u.email
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// USER: update role
// ─────────────────────────────────────────────────────────────────────────────
async function updateUserRole(email, role) {
  return executeSQL(`
    UPDATE workspace.governance.users
    SET role = ${esc(role)}
    WHERE email = ${esc(email)}
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// USER: update department
// ─────────────────────────────────────────────────────────────────────────────
async function updateUserDepartment(email, department) {
  return executeSQL(`
    UPDATE workspace.governance.access_policies
    SET department = ${esc(department)}
    WHERE principal_name = ${esc(email)}
      AND principal_type = 'USER'
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// USER: delete user (policies first, then user)
// ─────────────────────────────────────────────────────────────────────────────
async function deleteUser(email) {
  await executeSQL(`
    DELETE FROM workspace.governance.access_policies
    WHERE principal_name = ${esc(email)}
      AND principal_type = 'USER'
  `);
  return executeSQL(`
    DELETE FROM workspace.governance.users
    WHERE email = ${esc(email)}
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// USER: get department for a user
// ─────────────────────────────────────────────────────────────────────────────
async function getUserDepartment(email) {
  try {
    const rows = await fetchRows(`
      SELECT department
      FROM workspace.governance.access_policies
      WHERE principal_name = ${esc(email)}
        AND principal_type = 'USER'
      LIMIT 1
    `);
    return rows?.[0]?.[0] || null;
  } catch (e) {
    // Department is optional — don't block login if this fails
    console.warn("⚠️  getUserDepartment failed (non-fatal):", e.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// USER: get resources available to a user (by department)
// ─────────────────────────────────────────────────────────────────────────────
async function getUserResources(email) {
  const dept = await getUserDepartment(email);
  if (!dept) return { catalogs: [], schemas: [], tables: [] };

  const [catRes, schRes, tblRes] = await Promise.all([
    fetchRows(`SELECT DISTINCT table_catalog FROM system.information_schema.tables WHERE table_schema = ${esc(dept)}`),
    fetchRows(`SELECT DISTINCT table_schema  FROM system.information_schema.tables WHERE table_schema = ${esc(dept)}`),
    fetchRows(`SELECT table_name             FROM system.information_schema.tables WHERE table_schema = ${esc(dept)}`),
  ]);

  return {
    catalogs: catRes.map(r => r[0]),
    schemas: schRes.map(r => r[0]),
    tables: tblRes.map(r => r[0]),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCESS REQUEST: submit
// ─────────────────────────────────────────────────────────────────────────────
async function submitAccessRequest(user, catalog, schema, table, access) {
  return executeSQL(`
    INSERT INTO workspace.governance.user_requests (user, catalog_name, schema_name, table_name, access_type, status, requested_at)
    VALUES (${esc(user)}, ${esc(catalog)}, ${esc(schema)}, ${esc(table)}, ${esc(access)}, 'PENDING', current_timestamp())
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCESS REQUEST: get my requests
// ─────────────────────────────────────────────────────────────────────────────
async function getMyRequests(email) {
  return executeSQL(`
    SELECT catalog, schema, \`table\`, access, status
    FROM workspace.governance.user_requests
    WHERE user = ${esc(email)}
    ORDER BY created_at DESC
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCESS REQUEST: get pending (admin)
// ─────────────────────────────────────────────────────────────────────────────
async function getPendingRequests() {
  return executeSQL(`
    SELECT * FROM workspace.governance.user_requests
    WHERE status = 'PENDING'
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCESS REQUEST: approve
// ─────────────────────────────────────────────────────────────────────────────
async function approveRequest(user, table) {
  return executeSQL(`
    UPDATE workspace.governance.user_requests
    SET status = 'APPROVED'
    WHERE user = ${esc(user)} AND \`table\` = ${esc(table)}
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCESS REQUEST: reject
// ─────────────────────────────────────────────────────────────────────────────
async function rejectRequest(user, table) {
  return executeSQL(`
    UPDATE workspace.governance.user_requests
    SET status = 'REJECTED'
    WHERE user = ${esc(user)} AND \`table\` = ${esc(table)}
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// POLICY: get all policies (from access_policies table)
// ─────────────────────────────────────────────────────────────────────────────
async function getAllPolicies() {
  return executeSQL(`
    SELECT principal_name AS user_email, catalog_name, schema_name, table_pattern, privilege, is_active
    FROM workspace.governance.access_policies
    WHERE principal_type = 'USER'
    ORDER BY principal_name
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// POLICY: get all policies — enriched for Policies page (with status/created_time)
// ─────────────────────────────────────────────────────────────────────────────
async function getAllPoliciesEnriched() {
  // Real columns: principal_name, principal_type, catalog_name, schema_name,
  //               table_pattern, privilege, is_active, created_at, created_by, department
  try {
    return await executeSQL(`
      SELECT
        concat(principal_name, '|', schema_name, '|', table_pattern) AS policy_id,
        principal_name                                                AS user_email,
        COALESCE(department, '')                                      AS department,
        catalog_name,
        schema_name,
        table_pattern                                                 AS table_name,
        privilege                                                     AS privileges,
        CASE WHEN is_active = true THEN 'ACTIVE' ELSE 'INACTIVE' END AS status,
        created_at                                                    AS created_time
      FROM workspace.governance.access_policies
      WHERE principal_type = 'USER'
      ORDER BY principal_name
    `);
  } catch (e) {
    console.error("❌ getAllPoliciesEnriched failed:", e.message);
    return { result: { data_array: [] }, status: { state: "SUCCEEDED" } };
  }
}



// ─────────────────────────────────────────────────────────────────────────────
// POLICY: get my active access
// ─────────────────────────────────────────────────────────────────────────────
async function getMyAccess(email) {
  return executeSQL(`
    SELECT catalog_name, schema_name, table_pattern, privilege
    FROM workspace.governance.access_policies
    WHERE principal_name = ${esc(email)}
      AND principal_type = 'USER'
      AND is_active = true
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// POLICY: delete a policy
// ─────────────────────────────────────────────────────────────────────────────
async function deletePolicy(email, schema, table) {
  return executeSQL(`
    DELETE FROM workspace.governance.access_policies
    WHERE principal_name = ${esc(email)}
      AND principal_type = 'USER'
      AND schema_name    = ${esc(schema)}
      AND table_pattern  = ${esc(table)}
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// POLICY: toggle active state
// ─────────────────────────────────────────────────────────────────────────────
async function togglePolicy(email, schema, table, active) {
  return executeSQL(`
    UPDATE workspace.governance.access_policies
    SET is_active = ${active ? "true" : "false"}
    WHERE principal_name = ${esc(email)}
      AND principal_type = 'USER'
      AND schema_name   = ${esc(schema)}
      AND table_pattern = ${esc(table)}
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// POLICY: verify table access for a user
// ─────────────────────────────────────────────────────────────────────────────
async function verifyTableAccess(email, table) {
  const rows = await fetchRows(`
    SELECT COUNT(*) as cnt
    FROM workspace.governance.access_policies
    WHERE principal_name = ${esc(email)}
      AND principal_type = 'USER'
      AND table_pattern  = ${esc(table)}
      AND is_active      = true
  `);
  return parseInt(rows?.[0]?.[0] || "0") > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVILEGE MANAGEMENT: assign access + insert policy record
// ─────────────────────────────────────────────────────────────────────────────
// Metastore v1.0: INSERT/UPDATE/DELETE are not valid — use MODIFY for all writes
const ALLOWED_PRIVILEGES = ["SELECT", "MODIFY", "ALL PRIVILEGES"];

async function assignAccess(user, catalog, schema, table, privilege, createdBy) {
  const safeUser = String(user).replace(/`/g, "");
  const safeCatalog = String(catalog).replace(/[^a-zA-Z0-9_\-]/g, "");
  const safeSchema = String(schema).replace(/[^a-zA-Z0-9_\-]/g, "");
  const safeTable = String(table).replace(/[^a-zA-Z0-9_\-]/g, "");
  const safePriv = privilege.toUpperCase();

  // Step 1: Run the Databricks GRANTs — catch but don't abort on sample-table errors
  let grantOk = true;
  let grantWarning = null;
  try {
    console.log(`[ASSIGN ACCESS] Ensuring table ${safeCatalog}.${safeSchema}.${safeTable} exists...`);

    // 1. Auto-create table if it doesn't exist with RLAC schema
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS ${safeCatalog}.${safeSchema}.${safeTable} (
        principal_type STRING,
        principal_name STRING,
        groupcode STRING,
        clustercode STRING,
        companycode STRING,
        plantcode STRING,
        is_active BOOLEAN
      ) USING DELTA
    `);

    console.log(`[ASSIGN ACCESS] Granting USE CATALOG and USE SCHEMA...`);
    // 2. USE CATALOG & USE SCHEMA
    await executeSQL(`GRANT USE CATALOG ON CATALOG ${safeCatalog} TO \`${safeUser}\``);
    await executeSQL(`GRANT USE SCHEMA ON SCHEMA ${safeCatalog}.${safeSchema} TO \`${safeUser}\``);

    console.log(`[ASSIGN ACCESS] Granting ${safePriv} to ${safeUser}...`);
    // 3. TABLE PRIVILEGE
    await executeSQL(`
      GRANT ${safePriv} ON TABLE ${safeCatalog}.${safeSchema}.${safeTable} TO \`${safeUser}\`
    `);
    console.log(`[ASSIGN ACCESS] ✅ Grants successful for ${safeUser}`);
  } catch (grantErr) {
    const msg = grantErr.message || "";
    if (msg.includes("SAMPLE_TABLE_PERMISSIONS") || msg.includes("42832")) {
      // Databricks sample tables don't support GRANT — warn but keep going
      grantOk = false;
      grantWarning = "⚠️ This is a Databricks sample table — GRANT not supported. Policy saved (inactive).";
      console.warn("⚠️  GRANT skipped for sample table:", safeTable);
    } else {
      // Real GRANT error — re-throw so caller sees it
      throw grantErr;
    }
  }

  // MERGE (upsert) using real column names: principal_name, principal_type, created_at, created_by
  // Step 2: Always save policy record; is_active=false if GRANT was blocked
  await executeSQL(`
    MERGE INTO workspace.governance.access_policies t
    USING (
      SELECT
        'USER'               AS principal_type,
        ${esc(user)}         AS principal_name,
        ${esc(catalog)}      AS catalog_name,
        ${esc(schema)}       AS schema_name,
        ${esc(table)}        AS table_pattern,
        ${esc(safePriv)}     AS privilege,
        ${esc(createdBy || user)} AS created_by
    ) s
    ON  t.principal_name = s.principal_name
    AND t.principal_type = s.principal_type
    AND t.catalog_name   = s.catalog_name
    AND t.schema_name    = s.schema_name
    AND t.table_pattern  = s.table_pattern
    WHEN MATCHED THEN UPDATE SET
      privilege   = s.privilege,
      is_active   = ${grantOk ? "true" : "false"},
      created_at  = current_timestamp(),
      created_by  = s.created_by
    WHEN NOT MATCHED THEN INSERT (
      principal_type, principal_name, catalog_name, schema_name, table_pattern, privilege, is_active, created_at, created_by
    ) VALUES (
      s.principal_type, s.principal_name, s.catalog_name, s.schema_name, s.table_pattern, s.privilege,
      ${grantOk ? "true" : "false"}, current_timestamp(), s.created_by
    )
  `);
  return { grantOk, grantWarning };
}

// ─────────────────────────────────────────────────────────────────────────────
// GRANT: execute GRANT for multiple privileges
// ─────────────────────────────────────────────────────────────────────────────
async function grantAccess({ catalog, schema, table, userEmail, privileges }) {
  const safeUser = String(userEmail).replace(/`/g, "");
  const safeCatalog = String(catalog).replace(/[^a-zA-Z0-9_\-]/g, "");
  const safeSchema = String(schema).replace(/[^a-zA-Z0-9_\-]/g, "");
  const safeTable = String(table).replace(/[^a-zA-Z0-9_\-]/g, "");

  const privList = String(privileges)
    .split(",")
    .map(p => p.trim().toUpperCase())
    .filter(p => ALLOWED_PRIVILEGES.includes(p));

  if (!privList.length) throw new Error("No valid privileges provided");

  for (const priv of privList) {
    await executeSQL(
      `GRANT ${priv} ON TABLE ${safeCatalog}.${safeSchema}.${safeTable} TO \`${safeUser}\``
    );
  }
  return privList;
}

// ─────────────────────────────────────────────────────────────────────────────
// GRANT: verify a user exists in SHOW GRANTS result
// ─────────────────────────────────────────────────────────────────────────────
async function checkTableGrants({ catalog, schema, table }) {
  const safeCatalog = String(catalog).replace(/[^a-zA-Z0-9_\-]/g, "");
  const safeSchema = String(schema).replace(/[^a-zA-Z0-9_\-]/g, "");
  const safeTable = String(table).replace(/[^a-zA-Z0-9_\-]/g, "");

  const result = await executeSQL(
    `SHOW GRANTS ON TABLE ${safeCatalog}.${safeSchema}.${safeTable}`
  );
  return result?.result?.data_array || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// POLICY: activate + set created_time (only if NULL)
// ─────────────────────────────────────────────────────────────────────────────
async function activatePolicy({ policyId, userEmail, schemaName, tableName }) {
  // Uses real columns: principal_name, principal_type, created_at (no status column)
  return executeSQL(`
    UPDATE workspace.governance.access_policies
    SET is_active  = true,
        created_at = current_timestamp()
    WHERE principal_name = ${esc(userEmail)}
      AND principal_type = 'USER'
      AND schema_name    = ${esc(schemaName)}
      AND table_pattern  = ${esc(tableName)}
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG: insert success record
// ─────────────────────────────────────────────────────────────────────────────
async function insertAuditLog({ policyId, adminEmail, userEmail, catalog, schema, table, privileges, actionType = "GRANT_ACCESS" }) {
  // audit_logs uses: policy_id, action_type, executed_by, target_user,
  //                  catalog_name, schema_name, table_name, privileges, created_time
  return executeSQL(`
    INSERT INTO workspace.governance.audit_logs
      (policy_id, action_type, executed_by, target_user,
       catalog_name, schema_name, table_name, privileges, created_time)
    VALUES (
      ${esc(policyId)},
      ${esc(actionType)},
      ${esc(adminEmail)},
      ${esc(userEmail)},
      ${esc(catalog)},
      ${esc(schema)},
      ${esc(table)},
      ${esc(privileges)},
      current_timestamp()
    )
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOGS: get all logs
// ─────────────────────────────────────────────────────────────────────────────
async function getAuditLogs() {
  return executeSQL(`
    SELECT policy_id, action_type, executed_by, target_user,
           catalog_name, schema_name, table_name, privileges, created_time
    FROM workspace.governance.audit_logs
    ORDER BY created_time DESC
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOG BROWSING
// ─────────────────────────────────────────────────────────────────────────────
async function listCatalogs() {
  const result = await executeSQL("SHOW CATALOGS");
  return result?.result?.data_array?.map(r => r[0]) || [];
}

async function listSchemas(catalog) {
  const safe = String(catalog).replace(/[^a-zA-Z0-9_\-]/g, "");
  const result = await executeSQL(`SHOW SCHEMAS IN ${safe}`);
  return result?.result?.data_array?.map(r => r[0]) || [];
}

async function listTables(catalog, schema) {
  const safeCat = String(catalog).replace(/[^a-zA-Z0-9_\-]/g, "");
  const safeSch = String(schema).replace(/[^a-zA-Z0-9_\-]/g, "");
  const result = await executeSQL(`SHOW TABLES IN ${safeCat}.${safeSch}`);
  return result?.result?.data_array?.map(r => r[1]) || [];
}

async function getDepartmentTables(department) {
  return executeSQL(`
    SELECT table_name
    FROM system.information_schema.tables
    WHERE table_schema  = ${esc(department)}
      AND table_catalog = 'workspace'
  `);
}

async function getTableData(email, table) {
  const hasAccess = await verifyTableAccess(email, table);
  if (!hasAccess) throw new Error("ACCESS_DENIED");
  const safeTable = String(table).replace(/[^a-zA-Z0-9_]/g, "");
  return executeSQL(`SELECT * FROM workspace.governance.${safeTable} LIMIT 100`);
}

// ─────────────────────────────────────────────────────────────────────────────
// GRANTS: get all grants on a specific table (SHOW GRANTS)
// ─────────────────────────────────────────────────────────────────────────────
async function getAllGrantsForTable(catalog, schema, table) {
  const safeCat = String(catalog).replace(/[^a-zA-Z0-9_\-]/g, "");
  const safeSch = String(schema).replace(/[^a-zA-Z0-9_\-]/g, "");
  const safeTbl = String(table).replace(/[^a-zA-Z0-9_\-]/g, "");
  const result = await executeSQL(
    `SHOW GRANTS ON TABLE ${safeCat}.${safeSch}.${safeTbl}`
  );
  return result?.result?.data_array || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// ROW-LEVEL ACCESS CONTROL: data_access_policy table
// Schema: principal_type, principal_name, groupcode, clustercode,
//         companycode, plantcode, is_active
// ─────────────────────────────────────────────────────────────────────────────
async function getRLACPolicies() {
  return executeSQL(`
    SELECT principal_type, principal_name, groupcode, clustercode,
           companycode, plantcode, is_active
    FROM biztraz_dev.bronze.data_access_policy
    ORDER BY principal_name
  `);
}

async function upsertRLACPolicy({ principalType, principalName, groupcode, clustercode, companycode, plantcode, isActive = true }) {
  return executeSQL(`
    MERGE INTO biztraz_dev.bronze.data_access_policy t
    USING (
      SELECT
        ${esc(principalType)}  AS principal_type,
        ${esc(principalName)}  AS principal_name,
        ${esc(groupcode)}      AS groupcode,
        ${esc(clustercode)}    AS clustercode,
        ${esc(companycode)}    AS companycode,
        ${esc(plantcode)}      AS plantcode,
        ${isActive ? 'true' : 'false'} AS is_active
    ) s
    ON t.principal_type = s.principal_type AND t.principal_name = s.principal_name
    WHEN MATCHED THEN UPDATE SET
      groupcode   = s.groupcode,
      clustercode = s.clustercode,
      companycode = s.companycode,
      plantcode   = s.plantcode,
      is_active   = s.is_active
    WHEN NOT MATCHED THEN INSERT (
      principal_type, principal_name, groupcode, clustercode, companycode, plantcode, is_active
    ) VALUES (
      s.principal_type, s.principal_name, s.groupcode, s.clustercode, s.companycode, s.plantcode, s.is_active
    )
  `);
}

async function deleteRLACPolicy(principalType, principalName) {
  return executeSQL(`
    DELETE FROM biztraz_dev.bronze.data_access_policy
    WHERE principal_type = ${esc(principalType)}
      AND principal_name = ${esc(principalName)}
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// USER ACCESS CONTROL: biztraz_dev.bronze.user_access_control table
// ─────────────────────────────────────────────────────────────────────────────
async function getUserAccessControl() {
  return executeSQL(`
    SELECT user_email, user_name, user_role, user_status,
           groupcode, clustercode, companycode, plantcode, storage_loc_code
    FROM biztraz_dev.bronze.user_access_control
    ORDER BY user_email
  `);
}

async function upsertUserAccessControl({ userEmail, userName, userRole, userStatus, groupcode, clustercode, companycode, plantcode, storageLocCode }) {
  return executeSQL(`
    MERGE INTO biztraz_dev.bronze.user_access_control t
    USING (
      SELECT
        ${esc(userEmail)}      AS user_email,
        ${esc(userName)}       AS user_name,
        ${esc(userRole)}       AS user_role,
        ${esc(userStatus)}     AS user_status,
        ${esc(groupcode)}      AS groupcode,
        ${esc(clustercode)}    AS clustercode,
        ${esc(companycode)}    AS companycode,
        ${esc(plantcode)}      AS plantcode,
        ${esc(storageLocCode)} AS storage_loc_code
    ) s
    ON t.user_email = s.user_email
    WHEN MATCHED THEN UPDATE SET
      user_name        = s.user_name,
      user_role        = s.user_role,
      user_status      = s.user_status,
      groupcode        = s.groupcode,
      clustercode      = s.clustercode,
      companycode      = s.companycode,
      plantcode        = s.plantcode,
      storage_loc_code = s.storage_loc_code
    WHEN NOT MATCHED THEN INSERT (
      user_email, user_name, user_role, user_status,
      groupcode, clustercode, companycode, plantcode, storage_loc_code
    ) VALUES (
      s.user_email, s.user_name, s.user_role, s.user_status,
      s.groupcode, s.clustercode, s.companycode, s.plantcode, s.storage_loc_code
    )
  `);
}

async function deleteUserAccessControl(userEmail) {
  return executeSQL(`
    DELETE FROM biztraz_dev.bronze.user_access_control
    WHERE user_email = ${esc(userEmail)}
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  // core
  executeSQL,
  fetchRows,
  runQuery: executeSQL,
  fetchQuery: fetchRows,

  // users
  loginUser,
  registerUser,
  getAllUsers,
  updateUserRole,
  updateUserDepartment,
  deleteUser,
  getUserDepartment,
  getUserResources,

  // access requests
  submitAccessRequest,
  getMyRequests,
  getPendingRequests,
  approveRequest,
  rejectRequest,

  // policies
  getAllPolicies,
  getAllPoliciesEnriched,
  getMyAccess,
  deletePolicy,
  togglePolicy,
  verifyTableAccess,

  // grants & execute-access flow
  assignAccess,
  grantAccess,
  checkTableGrants,
  getAllGrantsForTable,
  activatePolicy,
  insertAuditLog,
  getAuditLogs,

  // catalog browsing
  listCatalogs,
  listSchemas,
  listTables,
  getDepartmentTables,
  getTableData,

  // row-level access control
  getRLACPolicies,
  upsertRLACPolicy,
  deleteRLACPolicy,
  getUserAccessControl,
  upsertUserAccessControl,
  deleteUserAccessControl,
};
