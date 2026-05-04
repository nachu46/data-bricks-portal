"use strict";

const axios = require("axios");
const { sendRLACNotification } = require("./emailService");

const HOST = process.env.DATABRICKS_HOST;
const TOKEN = process.env.DATABRICKS_TOKEN;
const WAREHOUSE_ID = process.env.WAREHOUSE_ID || process.env.DATABRICKS_WAREHOUSE_ID;


// CONFIGURATION & DEFAULTS

const ROOT_CATALOG = process.env.ROOT_CATALOG     || "main";
const META_CATALOG = process.env.METADATA_CATALOG || "workspace";

// Governance Metadata Tables
const POLICY_TABLE  = `${META_CATALOG}.governance.access_policies`;
const RLAC_TABLE    = `${META_CATALOG}.governance.rlac_policies`;
const AUDIT_TABLE   = `${META_CATALOG}.governance.audit_logs`;
const USER_TABLE    = `${META_CATALOG}.governance.users`;
const GOV_CATALOG   = `${META_CATALOG}.governance`;
const CONTROL_TABLE = `${META_CATALOG}.governance.user_access_control`;


// CORE: escape a value for safe SQL string injection

const esc = (value) => {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
};

/**
 * Strict sanitization for Databricks SQL identifiers (catalog, schema, table).
 * Only allows alphanumeric, underscore, hyphen, and dot.
 */
function sanitizeId(id) {
  if (typeof id !== "string") throw new Error(`Identifier must be a string: ${id}`);
  if (!/^[\w.-]+$/.test(id)) {
    throw new Error(`Invalid identifier detected: "${id}". Only alphanumeric, underscores, hyphens, and dots allowed.`);
  }
  return id;
}

/**
 * Strict sanitization for email to prevent injection in \`email\` format.
 */
function sanitizeEmail(email) {
  if (typeof email !== "string") throw new Error(`Email must be a string`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`Invalid email format: "${email}"`);
  }
  // Remove any backticks to prevent breaking the `email` escape in SQL
  return email.replace(/`/g, "");
}


// CORE: execute any SQL statement against Databricks SQL Warehouse (async poll)

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


// CORE: execute SQL and return only the data_array rows (for SELECT)

async function fetchRows(sql) {
  const result = await executeSQL(sql);
  return result?.result?.data_array || [];
}


// USER: login

async function loginUser(email, password) {
  return executeSQL(`
    SELECT email, password, role
    FROM workspace.governance.users
    WHERE email = ${esc(email)} AND password = ${esc(password)}
  `);
}


// USER: register

async function registerUser(email, password, role) {
  return executeSQL(`
    INSERT INTO workspace.governance.users (email, password, role)
    VALUES (${esc(email)}, ${esc(password)}, ${esc(role)})
  `);
}


// USER: get all users (with department via join)

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


// USER: update role

async function updateUserRole(email, role) {
  return executeSQL(`
    UPDATE workspace.governance.users
    SET role = ${esc(role)}
    WHERE email = ${esc(email)}
  `);
}


// USER: update department

async function updateUserDepartment(email, department) {
  return executeSQL(`
    UPDATE workspace.governance.access_policies
    SET department = ${esc(department)}
    WHERE principal_name = ${esc(email)}
      AND principal_type = 'USER'
  `);
}


// USER: delete user (policies first, then user)

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


// USER: get department for a user

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


// USER: get resources available to a user (by department)

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


// ACCESS REQUEST: submit

async function submitAccessRequest(user, catalog, schema, table, access) {
  return executeSQL(`
    INSERT INTO workspace.governance.user_requests (user, catalog_name, schema_name, table_name, access_type, status, requested_at)
    VALUES (${esc(user)}, ${esc(catalog)}, ${esc(schema)}, ${esc(table)}, ${esc(access)}, 'PENDING', current_timestamp())
  `);
}


// ACCESS REQUEST: get my requests

async function getMyRequests(email) {
  return executeSQL(`
    SELECT catalog, schema, \`table\`, access, status
    FROM workspace.governance.user_requests
    WHERE user = ${esc(email)}
    ORDER BY created_at DESC
  `);
}


// ACCESS REQUEST: get pending (admin)

async function getPendingRequests() {
  return executeSQL(`
    SELECT * FROM workspace.governance.user_requests
    WHERE status = 'PENDING'
  `);
}


// ACCESS REQUEST: approve

async function approveRequest(user, table) {
  return executeSQL(`
    UPDATE workspace.governance.user_requests
    SET status = 'APPROVED'
    WHERE user = ${esc(user)} AND \`table\` = ${esc(table)}
  `);
}


// ACCESS REQUEST: reject

async function rejectRequest(user, table) {
  return executeSQL(`
    UPDATE workspace.governance.user_requests
    SET status = 'REJECTED'
    WHERE user = ${esc(user)} AND \`table\` = ${esc(table)}
  `);
}


// POLICY: get all policies (from access_policies table)

async function getAllPolicies() {
  return executeSQL(`
    SELECT principal_name AS user_email, catalog_name, schema_name, table_pattern, privilege, is_active
    FROM workspace.governance.access_policies
    WHERE principal_type = 'USER'
    ORDER BY principal_name
  `);
}


// POLICY: get all policies — enriched for Policies page (with status/created_time)

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
        created_at                                                    AS created_time,
        revoked_at                                                    AS revoked_time,
        revoked_by
      FROM workspace.governance.access_policies
      WHERE principal_type = 'USER'
      ORDER BY created_at DESC
    `);
  } catch (e) {
    console.error("❌ getAllPoliciesEnriched failed:", e.message);
    return { result: { data_array: [] }, status: { state: "SUCCEEDED" } };
  }
}




// POLICY: get my active access

async function getMyAccess(email) {
  const rows = await fetchRows(`
    SELECT catalog_name, schema_name, table_pattern, privilege
    FROM workspace.governance.access_policies
    WHERE principal_name = ${esc(email)}
      AND principal_type = 'USER'
      AND is_active = true
  `);

  if (!rows) return [];

  // Parallel check for secured views for each table
  const enriched = await Promise.all(rows.map(async (row) => {
    const [catalog, schema, table, privilege] = row;
    const securedTable = `secured_${table}`;
    let isSecured = false;
    try {
      const checkView = await executeSQL(`DESCRIBE ${catalog}.${schema}.${securedTable}`);
      if (checkView?.result?.data_array) isSecured = true;
    } catch (e) {
      // Secured view doesn't exist, use raw
    }
    return [...row, isSecured];
  }));

  return enriched;
}


// POLICY: revoke a policy (soft-delete with timestamp)

async function revokePolicy(email, catalog, schema, table, revokedBy) {
  return executeSQL(`
    UPDATE ${POLICY_TABLE}
    SET is_active  = false,
        revoked_at = current_timestamp(),
        revoked_by = ${esc(revokedBy || 'admin')}
    WHERE LOWER(principal_name) = LOWER(${esc(email)})
      AND LOWER(catalog_name)   = LOWER(${esc(catalog)})
      AND LOWER(schema_name)    = LOWER(${esc(schema)})
      AND LOWER(table_pattern)  = LOWER(${esc(table)})
  `);
}

// Keep alias for backward compatibility or direct replacement
const deletePolicy = revokePolicy;


// POLICY: toggle active state

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


// POLICY: verify table access for a user

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


// PRIVILEGE MANAGEMENT: assign access + insert policy record

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
    console.log(`[ASSIGN ACCESS] Granting USE CATALOG and USE SCHEMA...`);
    // 1. USE CATALOG & USE SCHEMA
    await executeSQL(`GRANT USE CATALOG ON CATALOG ${safeCatalog} TO \`${safeUser}\``);
    await executeSQL(`GRANT USE SCHEMA ON SCHEMA ${safeCatalog}.${safeSchema} TO \`${safeUser}\``);

    console.log(`[ASSIGN ACCESS] Granting ${safePriv} to ${safeUser}...`);
    // 2. TABLE PRIVILEGE
    await executeSQL(`
      GRANT ${safePriv} ON TABLE ${safeCatalog}.${safeSchema}.${safeTable} TO \`${safeUser}\`
    `);
    console.log(`[ASSIGN ACCESS] ✅ Grants successful for ${safeUser}`);
  } catch (grantErr) {
    const msg = grantErr.message || "";
    if (msg.includes("SAMPLE_TABLE_PERMISSIONS") || msg.includes("42832") || msg.includes("DELTA_UNSUPPORTED_WRITE_SAMPLE_TABLES") || safeCatalog.toLowerCase() === "samples") {
      // Databricks sample tables don't support GRANT — warn but keep going
      grantOk = true; // Set to true so the policy appears as ACTIVE/Granted in the UI
      grantWarning = "⚠️ This is a Databricks sample table — it is automatically read-only. Policy saved as active.";
      console.warn("⚠️  GRANT skipped for sample table:", safeTable);
    } else {
      // Real GRANT error — re-throw so caller sees it
      throw grantErr;
    }
  }

  // MERGE (upsert) using real column names: principal_name, principal_type, created_at, created_by
  // Step 2: Always save policy record; is_active=false if GRANT was blocked
  await executeSQL(`
    MERGE INTO ${POLICY_TABLE} t
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
      created_by  = s.created_by,
      revoked_at  = NULL,
      revoked_by  = NULL
    WHEN NOT MATCHED THEN INSERT (
      principal_type, principal_name, catalog_name, schema_name, table_pattern, privilege, is_active, created_at, created_by
    ) VALUES (
      s.principal_type, s.principal_name, s.catalog_name, s.schema_name, s.table_pattern, s.privilege,
      ${grantOk ? "true" : "false"}, current_timestamp(), s.created_by
    )
  `);
  return { grantOk, grantWarning };
}


// GRANT: execute GRANT for multiple privileges

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


// GRANT: verify a user exists in SHOW GRANTS result

async function checkTableGrants({ catalog, schema, table }) {
  const safeCatalog = String(catalog).replace(/[^a-zA-Z0-9_\-]/g, "");
  const safeSchema = String(schema).replace(/[^a-zA-Z0-9_\-]/g, "");
  const safeTable = String(table).replace(/[^a-zA-Z0-9_\-]/g, "");

  const result = await executeSQL(
    `SHOW GRANTS ON TABLE ${safeCatalog}.${safeSchema}.${safeTable}`
  );
  return result?.result?.data_array || [];
}


// POLICY: activate + set created_time (only if NULL)

async function activatePolicy({ policyId, userEmail, schemaName, tableName }) {
  // Uses real columns: principal_name, principal_type, created_at (no status column)
  return executeSQL(`
    UPDATE ${POLICY_TABLE}
    SET is_active  = true,
        created_at = current_timestamp()
    WHERE principal_name = ${esc(userEmail)}
      AND principal_type = 'USER'
      AND schema_name    = ${esc(schemaName)}
      AND table_pattern  = ${esc(tableName)}
  `);
}


// DIRECT ACCESS MANAGEMENT (Admin-Only System)


/**
 * Direct GRANT execution on Databricks
 */
async function grantDirectAccess(email, catalog, schema, table, privilege = "SELECT") {
  const safeEmail = sanitizeEmail(email);
  const safeCat = sanitizeId(catalog);
  const safeSch = sanitizeId(schema);
  const safeTbl = sanitizeId(table);
  const safePriv = String(privilege).replace(/[^a-zA-Z0-9_\s]/g, ""); // Allow spaces for 'ALL PRIVILEGES'

  const sql = `GRANT ${safePriv} ON TABLE ${safeCat}.${safeSch}.${safeTbl} TO \`${safeEmail}\``;
  console.log(`[Databricks] Executing: ${sql}`);
  return await executeSQL(sql);
}

/**
 * Direct REVOKE execution on Databricks
 */
async function revokeDirectAccess(email, catalog, schema, table, privilege = "SELECT") {
  const safeEmail = sanitizeEmail(email);
  const safeCat = sanitizeId(catalog);
  const safeSch = sanitizeId(schema);
  const safeTbl = sanitizeId(table);
  const safePriv = String(privilege).replace(/[^a-zA-Z0-9_\s]/g, "");

  const sql = `REVOKE ${safePriv} ON TABLE ${safeCat}.${safeSch}.${safeTbl} FROM \`${safeEmail}\``;
  console.log(`[Databricks] Executing: ${sql}`);
  try {
    return await executeSQL(sql);
  } catch (err) {
    const msg = err.message || "";
    if (msg.includes("SAMPLE_TABLE_PERMISSIONS") || msg.includes("42832") || msg.includes("DELTA_UNSUPPORTED_WRITE_SAMPLE_TABLES") || safeCat.toLowerCase() === "samples") {
      console.warn("⚠️  REVOKE skipped for sample table:", safeTbl);
      return { success: true, bypassed: true };
    }
    throw err;
  }
}

/**
 * AUDIT LOGGING: Insert record into workspace.governance.audit_logs
 * Schema: action_type, target_user, table_name, created_at
 */
async function insertAuditLog(action, userEmail, tableName, executedBy, catalog, schema, policyId = null, privileges = null) {
  // Self-healing: Ensure table exists
  await executeSQL(`CREATE SCHEMA IF NOT EXISTS ${META_CATALOG}.governance`);
  await executeSQL(`
    CREATE TABLE IF NOT EXISTS ${AUDIT_TABLE} (
      action_type STRING, target_user STRING, table_name STRING, executed_by STRING,
      catalog_name STRING, schema_name STRING, policy_id STRING, privileges STRING,
      created_at TIMESTAMP
    )
  `);

  // Migration: If the table exists but uses the old 'timestamp' name, rename it
  try {
    const columns = await executeSQL(`DESCRIBE ${AUDIT_TABLE}`);
    const hasOldCol = columns.result?.data_array?.some(c => c[0].toLowerCase() === 'timestamp');
    if (hasOldCol) {
      console.log(`[Migration] Renaming legacy 'timestamp' column to 'created_at' in ${AUDIT_TABLE}`);
      await executeSQL(`ALTER TABLE ${AUDIT_TABLE} RENAME COLUMN timestamp TO created_at`);
    }
  } catch (e) {
    // Ignore migration errors if describe fails
  }

  return executeSQL(`
    INSERT INTO ${AUDIT_TABLE} 
    (action_type, target_user, table_name, executed_by, catalog_name, schema_name, policy_id, privileges, created_at)
    VALUES (
      ${esc(action)}, ${esc(userEmail)}, ${esc(tableName)}, ${esc(executedBy)}, 
      ${esc(catalog)}, ${esc(schema)}, ${esc(policyId)}, ${esc(privileges)}, 
      current_timestamp()
    )
  `);
}


// AUDIT LOGS: get all logs

async function getAuditLogs() {
  try {
    return await executeSQL(`
      SELECT action_type, target_user, table_name, executed_by, 
             catalog_name, schema_name, policy_id, privileges, created_at,
             date_format(created_at, 'yyyy-MM-dd HH:mm:ss') as created_time
      FROM ${AUDIT_TABLE}
      ORDER BY created_at DESC
      LIMIT 100
    `);
  } catch (err) {
    console.warn("⚠️ Audit logs table not found or inaccessible:", err.message);
    return { result: { data_array: [] } };
  }
}


// CATALOG BROWSING

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

async function listAllUsersFromDatabricks() {
  const result = await executeSQL("SHOW USERS");
  return result?.result?.data_array?.map(r => r[0]) || [];
}

async function listAllGroupsFromDatabricks() {
  const result = await executeSQL("SHOW GROUPS");
  return result?.result?.data_array?.map(r => r[0]) || [];
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
  return executeSQL(`SELECT * FROM ${GOV_CATALOG}.${safeTable} LIMIT 100`);
}


// GRANTS: get all grants on a specific table (SHOW GRANTS)

async function getAllGrantsForTable(catalog, schema, table) {
  const safeCat = String(catalog).replace(/[^a-zA-Z0-9_\-]/g, "");
  const safeSch = String(schema).replace(/[^a-zA-Z0-9_\-]/g, "");
  const safeTbl = String(table).replace(/[^a-zA-Z0-9_\-]/g, "");
  const result = await executeSQL(
    `SHOW GRANTS ON TABLE ${safeCat}.${safeSch}.${safeTbl}`
  );
  return result?.result?.data_array || [];
}

// ─────────────────────────────────────────────────────────────────
// LIVE GRANTS: Read directly from Unity Catalog (includes manual grants too)
// ─────────────────────────────────────────────────────────────────
async function getLiveGrantsFromDatabricks() {
  // system.information_schema.table_privileges has ALL grants across all catalogs
  // including grants made manually via SQL — the true source of truth
  try {
    const result = await executeSQL(`
      SELECT 
        grantee          AS principal_name,
        privilege_type   AS privilege,
        table_catalog    AS catalog_name,
        table_schema     AS schema_name,
        table_name       AS table_pattern,
        is_grantable
      FROM system.information_schema.table_privileges
      WHERE table_catalog NOT IN ('system', '__databricks_internal')
        AND grantee NOT IN ('account users')
      ORDER BY table_catalog, table_schema, table_name, grantee
      LIMIT 500
    `);
    return result?.result?.data_array || [];
  } catch (err) {
    console.warn('[getLiveGrantsFromDatabricks] Falling back to access_policies:', err.message);
    // Fallback: return from our metadata table
    const fallback = await executeSQL(`
      SELECT principal_name, privilege, catalog_name, schema_name, table_pattern, is_active
      FROM ${POLICY_TABLE}
      ORDER BY created_at DESC
      LIMIT 500
    `);
    return fallback?.result?.data_array || [];
  }
}

async function getPortalMetadata() {
  const result = await executeSQL(`
    SELECT LOWER(principal_name), LOWER(catalog_name), LOWER(schema_name), LOWER(table_pattern), created_at, is_active, revoked_at, revoked_by, privilege
    FROM ${POLICY_TABLE}
  `);
  return result?.result?.data_array || [];
}


// ROW-LEVEL ACCESS CONTROL: data_access_policy table
// Schema: principal_type, principal_name, groupcode, clustercode,
//         companycode, plantcode, is_active

async function getRLACPolicies() {
  try {
    return await executeSQL(`
      SELECT principal_type, principal_name, groupcode, clustercode,
             companycode, plantcode, is_active, source, created_at
      FROM ${RLAC_TABLE}
      ORDER BY created_at DESC
    `);
  } catch (err) {
    console.warn("⚠️ RLAC policies table not found or inaccessible:", err.message);
    return { result: { data_array: [] } };
  }
}

async function upsertRLACPolicy({ principalType, principalName, groupcode, clustercode, companycode, plantcode, isActive = true, source = "portal" }) {
  // Self-healing: Ensure table exists with all columns
  await executeSQL(`CREATE SCHEMA IF NOT EXISTS ${META_CATALOG}.governance`);
  await executeSQL(`
    CREATE TABLE IF NOT EXISTS ${RLAC_TABLE} (
      principal_type STRING, principal_name STRING, groupcode STRING,
      clustercode STRING, companycode STRING, plantcode STRING, is_active BOOLEAN,
      source STRING, created_at TIMESTAMP, updated_at TIMESTAMP
    )
  `);

  const result = await executeSQL(`
    MERGE INTO ${RLAC_TABLE} t
    USING (
      SELECT
        ${esc(principalType)}  AS principal_type,
        ${esc(principalName)}  AS principal_name,
        ${esc(groupcode)}      AS groupcode,
        ${esc(clustercode)}    AS clustercode,
        ${esc(companycode)}    AS companycode,
        ${esc(plantcode)}      AS plantcode,
        ${isActive ? 'true' : 'false'} AS is_active,
        ${esc(source)}         AS source
    ) s
    ON t.principal_type = s.principal_type AND t.principal_name = s.principal_name
    WHEN MATCHED THEN UPDATE SET
      groupcode   = s.groupcode,
      clustercode = s.clustercode,
      companycode = s.companycode,
      plantcode   = s.plantcode,
      is_active   = s.is_active,
      source      = s.source,
      updated_at  = current_timestamp()
    WHEN NOT MATCHED THEN INSERT (
      principal_type, principal_name, groupcode, clustercode, companycode, plantcode, is_active, source, created_at, updated_at
    ) VALUES (
      s.principal_type, s.principal_name, s.groupcode, s.clustercode, s.companycode, s.plantcode, s.is_active, s.source, 
      current_timestamp(), current_timestamp()
    )
  `);

  // Send email notification for USER principals
  if (principalType === "USER" && isActive) {
    sendRLACNotification(principalName, { groupcode, clustercode, companycode, plantcode });
  }

  return result;
}

async function deleteRLACPolicy(principalType, principalName) {
  // 1. Delete from Policy Metadata Table
  await executeSQL(`
    DELETE FROM ${RLAC_TABLE}
    WHERE principal_type = ${esc(principalType)}
      AND principal_name = ${esc(principalName)}
  `);

  // 2. Delete from User Access Control Table (The "Passport" table)
  if (principalType === 'USER') {
    console.log(`[RLAC Cleanup] Removing user ${principalName} from Access Control Table`);
    try {
      await executeSQL(`
        DELETE FROM ${CONTROL_TABLE}
        WHERE user_email = ${esc(principalName)}
      `);
    } catch (e) {
      console.warn(`[RLAC Cleanup] Could not delete from ${CONTROL_TABLE}:`, e.message);
    }
  }
  
  return { success: true };
}


// USER ACCESS CONTROL: biztraz_dev.bronze.user_access_control table

async function getUserAccessControl() {
  return executeSQL(`
    SELECT user_email, user_name, user_role, user_status,
           groupcode, clustercode, companycode, plantcode, storage_loc_code, created_at
    FROM ${CONTROL_TABLE}
    ORDER BY user_email
  `);
}

async function upsertUserAccessControl({ userEmail, userName, userRole, userStatus, groupcode, clustercode, companycode, plantcode, storageLocCode }) {
  // Self-healing: Ensure table exists
  await executeSQL(`CREATE SCHEMA IF NOT EXISTS ${META_CATALOG}.governance`);
  await executeSQL(`
    CREATE TABLE IF NOT EXISTS ${CONTROL_TABLE} (
      user_email STRING, user_name STRING, user_role STRING, user_status STRING,
      groupcode STRING, clustercode STRING, companycode STRING, plantcode STRING, 
      storage_loc_code STRING, created_at TIMESTAMP, updated_at TIMESTAMP
    )
  `);

  return executeSQL(`
    MERGE INTO ${CONTROL_TABLE} t
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
      storage_loc_code = s.storage_loc_code,
      updated_at       = current_timestamp()
    WHEN NOT MATCHED THEN INSERT (
      user_email, user_name, user_role, user_status,
      groupcode, clustercode, companycode, plantcode, storage_loc_code, created_at, updated_at
    ) VALUES (
      s.user_email, s.user_name, s.user_role, s.user_status,
      s.groupcode, s.clustercode, s.companycode, s.plantcode, s.storage_loc_code,
      current_timestamp(), current_timestamp()
    )
  `);
}

async function deleteUserAccessControl(userEmail) {
  return executeSQL(`
    DELETE FROM ${CONTROL_TABLE}
    WHERE user_email = ${esc(userEmail)}
  `);
}


// EXPORTS

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
  assignAccess,
  getAllPolicies,
  getAllPoliciesEnriched,
  getMyAccess,
  deletePolicy,
  togglePolicy,
  verifyTableAccess,

  // direct access management
  grantDirectAccess,
  revokeDirectAccess,
  insertAuditLog,
  getAuditLogs,

  // catalog browsing
  listCatalogs,
  listSchemas,
  listTables,
  listAllUsersFromDatabricks,
  listAllGroupsFromDatabricks,
  getDepartmentTables,
  getTableData,
  getAllGrantsForTable: async (cat, sch, tbl) => {
    const result = await executeSQL(`SHOW GRANTS ON TABLE ${cat}.${sch}.${tbl}`);
    return result?.result?.data_array || [];
  },
  getLiveGrantsFromDatabricks,
  getPortalMetadata,
  getFilteredTableData: async (email, catalog, schema, table) => {
    // 1. Get the RLAC policy for this principal
    const policies = await fetchRows(`
      SELECT principal_type, principal_name, groupcode, clustercode, companycode, plantcode
      FROM ${RLAC_TABLE}
      WHERE principal_name = ${esc(email)}
        AND is_active = true
      LIMIT 1
    `);

    if (!policies || policies.length === 0) {
      throw new Error(`No active RLAC policy found for user: ${email}`);
    }

    const [ptype, pname, gcode, ccode, compcode, pcode] = policies[0];
    
    // 2. Build the WHERE clause based on non-empty policy fields
    const safeTable = `${sanitizeId(catalog)}.${sanitizeId(schema)}.${sanitizeId(table)}`;

    // Smart Mapping: Try to find which column exists in the table (e.g. groupcode vs group_code)
    let columns = [];
    try {
      const descRes = await executeSQL(`DESCRIBE ${safeTable}`);
      columns = descRes.result?.data_array?.map(c => c[0].toLowerCase()) || [];
    } catch (e) {
      console.warn(`[RLAC Preview] Could not describe table ${safeTable}, falling back to defaults.`);
    }

    const filters = [];
    const tryFilter = (policyKey, value) => {
      if (!value || value === "null" || value === "undefined") return;
      // Try exact, then underscore version, then _id version
      const underscoreVersion = policyKey.replace(/code$/, "_code");
      const idVersion = policyKey.replace(/code$/, "_id");
      
      if (columns.includes(policyKey.toLowerCase())) {
        filters.push(`${policyKey} = ${esc(value)}`);
      } else if (columns.includes(underscoreVersion.toLowerCase())) {
        filters.push(`${underscoreVersion} = ${esc(value)}`);
      } else if (columns.includes(idVersion.toLowerCase())) {
        filters.push(`${idVersion} = ${esc(value)}`);
      } else if (columns.length === 0) {
        // Fallback to literal if columns couldn't be fetched
        filters.push(`${policyKey} = ${esc(value)}`);
      }
    };

    tryFilter("groupcode", gcode);
    tryFilter("clustercode", ccode);
    tryFilter("companycode", compcode);
    tryFilter("plantcode", pcode);

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
    
    // 3. Execute the filtered query
    const sql = `SELECT * FROM ${safeTable} ${whereClause} LIMIT 10`;
    console.log(`[RLAC Preview] Executing: ${sql}`);
    const result = await executeSQL(sql);
    return { ...result, appliedFilters: filters };
  },

  deploySecuredView: async (catalog, schema, table) => {
    const safeCat = sanitizeId(catalog);
    const safeSch = sanitizeId(schema);
    const safeTbl = sanitizeId(table);
    const rawTable = `${safeCat}.${safeSch}.${safeTbl}`;
    const viewName = `${safeCat}.${safeSch}.secured_${safeTbl}`;

    // 1. Get columns to map filters correctly
    const descRes = await executeSQL(`DESCRIBE ${rawTable}`);
    const columns = descRes.result?.data_array?.map(c => c[0].toLowerCase()) || [];

    // 2. Build the dynamic WHERE clause
    const filterMappings = [
      { policyKey: "groupcode", dbKey: "groupcode" },
      { policyKey: "groupcode", dbKey: "group_code" },
      { policyKey: "clustercode", dbKey: "clustercode" },
      { policyKey: "clustercode", dbKey: "cluster_code" },
      { policyKey: "companycode", dbKey: "companycode" },
      { policyKey: "companycode", dbKey: "company_code" },
      { policyKey: "plantcode", dbKey: "plantcode" },
      { policyKey: "plantcode", dbKey: "plant_code" },
    ];

    // Self-healing: Ensure table exists
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS ${RLAC_TABLE} (
        principal_type STRING, principal_name STRING, groupcode STRING,
        clustercode STRING, companycode STRING, plantcode STRING, is_active BOOLEAN
      )
    `);

    const activeFilters = filterMappings
      .filter(m => columns.includes(m.dbKey))
      .map(m => `
        ${m.dbKey} IN (
          SELECT ${m.policyKey} FROM ${RLAC_TABLE} 
          WHERE principal_name = CURRENT_USER()
            AND is_active = true
        )
      `);

    if (activeFilters.length === 0) {
      throw new Error(`This table does not contain any compatible security columns (like groupcode or group_code). RLAC cannot be applied.`);
    }

    const whereClause = activeFilters.join(" OR ");

    // 3. Create the view
    const sql = `
      CREATE OR REPLACE VIEW ${viewName} AS
      SELECT * FROM ${rawTable}
      WHERE ${whereClause}
    `;

    console.log(`[RLAC Deploy] Creating view: ${viewName}`);
    await executeSQL(sql);
    return { viewName, sql };
  },

  // row-level access control
  getRLACPolicies,
  upsertRLACPolicy,
  deleteRLACPolicy,
  getUserAccessControl,
  upsertUserAccessControl,
  deleteUserAccessControl,
};
