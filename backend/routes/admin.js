"use strict";

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const db = require("../services/databricksService");
const { sendAccessNotification } = require("../services/emailService");
const { requireAdmin } = require("../middleware/auth");

const JWT_SECRET = process.env.JWT_SECRET || "your-default-secret-key-change-this-in-prod";

/**
 * POST /api/admin/login
 * - Validates against workspace.governance.users
 * - Only allows role = 'admin'
 * - Returns JWT (8h expiry)
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: "Email and password required" });
  }

  try {
    const result = await db.loginUser(email, password);
    const userRows = result?.result?.data_array || [];

    if (userRows.length === 0) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const [uEmail, uPass, uRole] = userRows[0];

    if (uRole !== "admin") {
      return res.status(403).json({ success: false, error: "Access denied: Admin role required" });
    }

    const token = jwt.sign(
      { email: uEmail, role: uRole },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      success: true,
      data: {
        token,
        user: { email: uEmail, role: uRole }
      }
    });
  } catch (err) {
    console.error("❌ Login error:", err.message, err.stack);
    res.status(500).json({ 
      success: false, 
      error: "Server error during login",
      details: err.message
    });
  }
});

/**
 * POST /api/admin/grant-access
 * - verifyToken (via requireAdmin)
 * - Direct execution + Audit log + Email notification
 */
router.post("/grant-access", requireAdmin, async (req, res) => {
  const { user, catalog, schema, table } = req.body;
  
  if (!user || !catalog || !schema || !table) {
    return res.status(400).json({ success: false, error: "All fields are required" });
  }

  try {
    // 1. Execute Grant + Update Metadata Table
    const adminEmail = req.user.email;
    await db.assignAccess(user, catalog, schema, table, "SELECT", adminEmail);

    // 2. Insert Audit Log
    const tableName = `${catalog}.${schema}.${table}`;
    const policyId = `${user}|${schema}|${table}`;
    await db.insertAuditLog("GRANT", user, tableName, adminEmail, catalog, schema, policyId, "SELECT");

    // 3. Trigger Email (Non-blocking)
    sendAccessNotification(user, "GRANT", tableName).catch(err => {
      console.error("❌ Background email failed:", err.message);
    });

    res.json({ success: true, message: "Access granted successfully" });
  } catch (err) {
    console.error("❌ Grant Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/revoke-access
 */
router.post("/revoke-access", requireAdmin, async (req, res) => {
  const { user, catalog, schema, table } = req.body;

  if (!user || !catalog || !schema || !table) {
    return res.status(400).json({ success: false, error: "All fields are required" });
  }

  try {
    // 1. Execute Revoke
    await db.revokeDirectAccess(user, catalog, schema, table);

    // 2. Update Metadata Table (Remove from UI)
    await db.deletePolicy(user, schema, table);

    // 3. Insert Audit Log
    const tableName = `${catalog}.${schema}.${table}`;
    const adminEmail = req.user.email; // From JWT
    const policyId = `${user}|${schema}|${table}`;
    await db.insertAuditLog("REVOKE", user, tableName, adminEmail, catalog, schema, policyId, null);

    // 3. Trigger Email (Non-blocking)
    sendAccessNotification(user, "REVOKE", tableName).catch(err => {
      console.error("❌ Background email failed:", err.message);
    });

    res.json({ success: true, message: "Access revoked successfully" });
  } catch (err) {
    console.error("❌ Revoke Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/audit-logs
 * - Return logs ordered by timestamp DESC
 */
router.get("/audit-logs", requireAdmin, async (req, res) => {
  try {
    const result = await db.getAuditLogs();
    const logs = result?.result?.data_array || [];
    
    // Map rows to objects for the UI
    const data = logs.map(row => ({
      action: row[0],
      user_email: row[1],
      table_name: row[2],
      executed_by: row[3],
      catalog_name: row[4],
      schema_name: row[5],
      policy_id: row[6],
      privileges: row[7],
      timestamp: row[8],
      created_time: row[9]
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error("❌ Audit logs error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/users-list
 * - Fetches all users from Databricks for suggestions
 */
router.get("/users-list", requireAdmin, async (req, res) => {
  try {
    const users = await db.listAllUsersFromDatabricks();
    res.json({ success: true, users });
  } catch (err) {
    console.error("❌ Users list error:", err.message);
    res.status(500).json({ success: false, error: "Failed to load users list" });
  }
});

/**
 * GET /api/admin/groups-list
 * - Fetches all groups from Databricks for suggestions
 */
router.get("/groups-list", requireAdmin, async (req, res) => {
  try {
    const groups = await db.listAllGroupsFromDatabricks();
    res.json({ success: true, groups });
  } catch (err) {
    console.error("❌ Groups list error:", err.message);
    res.status(500).json({ success: false, error: "Failed to load groups list" });
  }
});

/**
 * GET /api/admin/live-grants
 * - Reads ALL actual grants from Databricks Unity Catalog system tables
 * - Includes manual grants made directly via Databricks SQL Editor
 */
router.get("/live-grants", requireAdmin, async (req, res) => {
  try {
    const rows = await db.getLiveGrantsFromDatabricks();
    // rows: [principal_name, privilege, catalog_name, schema_name, table_pattern, is_grantable]

    // Also fetch our portal metadata to cross-reference (with timestamp)
    let portalMap = new Map(); // key -> created_at timestamp
    try {
      const portalResult = await db.executeSQL(`
        SELECT principal_name, privilege, catalog_name, schema_name, table_pattern, created_at
        FROM workspace.governance.access_policies
      `);
      const portalRows = portalResult?.result?.data_array || [];
      portalRows.forEach(r => {
        const key = `${r[0]}|${r[1]}|${r[2]}|${r[3]}|${r[4]}`.toLowerCase();
        portalMap.set(key, r[5] || null); // store created_at
      });
    } catch (e) {
      console.warn("⚠️  Could not fetch portal metadata for cross-reference:", e.message);
    }

    const data = rows.map(r => {
      const key = `${r[0]}|${r[1]}|${r[2]}|${r[3]}|${r[4]}`.toLowerCase();
      const isPortal = portalMap.has(key);
      return {
        user_email:   r[0],
        privilege:    r[1],
        catalog_name: r[2],
        schema_name:  r[3],
        table_name:   r[4],
        is_grantable: r[5],
        source:       isPortal ? "portal" : "manual",
        created_at:   isPortal ? portalMap.get(key) : null // only portal grants have timestamp
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error("❌ Live grants error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
