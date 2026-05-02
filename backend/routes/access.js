"use strict";

const express = require("express");
const router = express.Router();
const db = require("../services/databricksService");
const { requireAdmin } = require("../middleware/auth");

/**
 * USER ACCESS
 */
router.get("/my-access/:email", async (req, res) => {
  try {
    const result = await db.getMyAccess(req.params.email);
    res.json({ success: true, result: { data_array: result } });
  } catch (err) {
    console.error("❌ my-access error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * CATALOG BROWSING (Keep for Admin Panel dropdowns)
 */

router.get("/catalogs", requireAdmin, async (req, res) => {
  try {
    const catalogs = await db.listCatalogs();
    res.json({ success: true, catalogs });
  } catch (err) {
    console.error("❌ SHOW CATALOGS:", err.message);
    res.status(500).json({ error: "Failed to load catalogs" });
  }
});

router.get("/schemas/:catalog", requireAdmin, async (req, res) => {
  try {
    const schemas = await db.listSchemas(req.params.catalog);
    res.json({ success: true, schemas });
  } catch (err) {
    console.error("❌ SHOW SCHEMAS:", err.message);
    res.status(500).json({ error: "Failed to load schemas" });
  }
});

router.get("/tables/:catalog/:schema", requireAdmin, async (req, res) => {
  try {
    const tables = await db.listTables(req.params.catalog, req.params.schema);
    res.json({ success: true, tables });
  } catch (err) {
    console.error("❌ SHOW TABLES:", err.message);
    res.status(500).json({ error: "Failed to load tables" });
  }
});

/**
 * POLICIES & GRANTS (Feed the "Granted Access Policies" table)
 */

router.get("/policies-all", requireAdmin, async (req, res) => {
  try {
    // Current UI expects data_array from EnrichedPolicies
    const data = await db.getAllPoliciesEnriched();
    res.json(data);
  } catch (err) {
    console.error("❌ Policies-all:", err.message);
    res.json({ result: { data_array: [] }, status: { state: "SUCCEEDED" } });
  }
});

router.post("/delete-policy", requireAdmin, async (req, res) => {
  const { email, schema, table } = req.body;
  try {
    await db.deletePolicy(email, schema, table);
    res.json({ success: true, message: "Policy deleted" });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/toggle-policy", requireAdmin, async (req, res) => {
  const { email, schema, table, active } = req.body;
  try {
    await db.togglePolicy(email, schema, table, active);
    res.json({ success: true, message: "Policy toggled" });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/policy-grants/:catalog/:schema/:table", requireAdmin, async (req, res) => {
  try {
    const grants = await db.getAllGrantsForTable(req.params.catalog, req.params.schema, req.params.table);
    res.json({ success: true, grants });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/all-grants/:catalog/:schema/:table", requireAdmin, async (req, res) => {
  try {
    const grants = await db.getAllGrantsForTable(req.params.catalog, req.params.schema, req.params.table);
    res.json({ success: true, grants });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/execute-access", requireAdmin, async (req, res) => {
  const { policy_id, user_email, catalog_name, schema_name, table_name, privileges } = req.body;
  try {
    const adminEmail = req.user?.email || "admin@gmail.com";
    
    // Execute multiple privileges if they are comma separated
    const privList = String(privileges).split(",").map(p => p.trim());
    for (const priv of privList) {
      await db.assignAccess(user_email, catalog_name, schema_name, table_name, priv, adminEmail);
    }
    
    await db.insertAuditLog(
      "GRANT_ACCESS", user_email, `${catalog_name}.${schema_name}.${table_name}`,
      adminEmail, catalog_name, schema_name, policy_id, privileges
    );

    res.json({ success: true, message: "Access executed" });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});


/**
 * ROW-LEVEL ACCESS CONTROL (RLACTab logic)
 */

router.get("/rlac-policies", requireAdmin, async (req, res) => {
  try {
    const data = await db.getRLACPolicies();
    res.json(data);
  } catch (err) {
    console.error("❌ rlac-policies GET:", err.message);
    res.status(500).json({ error: "Failed to load RLAC policies: " + err.message });
  }
});

router.post("/rlac-policies", requireAdmin, async (req, res) => {
  const { principalType, principalName, groupcode, clustercode, companycode, plantcode, isActive } = req.body;
  if (!principalType || !principalName)
    return res.status(400).json({ error: "principalType and principalName are required" });
  try {
    const adminEmail = req.user.email;
    await db.upsertRLACPolicy({ principalType, principalName, groupcode, clustercode, companycode, plantcode, isActive });
    
    // Log to audit history
    await db.insertAuditLog(
      "UPSERT_RLAC_POLICY", principalName, `RLAC:${principalType}`, 
      adminEmail, "SYSTEM", "RLAC", `RLAC|${principalName}`, 
      JSON.stringify({ groupcode, clustercode, companycode, plantcode, isActive })
    );

    res.json({ success: true, message: "RLAC policy saved" });
  } catch (err) {
    console.error("❌ rlac-policies POST:", err.message);
    res.status(500).json({ error: "Failed to save RLAC policy: " + err.message });
  }
});

router.delete("/rlac-policies", requireAdmin, async (req, res) => {
  const { principalType, principalName } = req.body;
  if (!principalType || !principalName)
    return res.status(400).json({ error: "principalType and principalName are required" });
  try {
    const adminEmail = req.user.email;
    await db.deleteRLACPolicy(principalType, principalName);

    // Log to audit history
    await db.insertAuditLog(
      "DELETE_RLAC_POLICY", principalName, `RLAC:${principalType}`, 
      adminEmail, "SYSTEM", "RLAC", `RLAC|${principalName}`, 
      "DELETED"
    );

    res.json({ success: true, message: "RLAC policy deleted" });
  } catch (err) {
    console.error("❌ rlac-policies DELETE:", err.message);
    res.status(500).json({ error: "Failed to delete RLAC policy: " + err.message });
  }
});

/**
 * USER MANAGEMENT (Manage Users page)
 */

// GET /api/access/all-users - return all users from governance.users table
router.get("/all-users", requireAdmin, async (req, res) => {
  try {
    const result = await db.getAllUsers();
    res.json(result);
  } catch (err) {
    console.error("❌ all-users:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/access/policies - return all policies (fallback for Manage Users)
router.get("/policies", requireAdmin, async (req, res) => {
  try {
    const result = await db.getAllPolicies();
    res.json(result);
  } catch (err) {
    console.error("❌ policies:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/access/delete-user - delete a user from governance.users
router.post("/delete-user", requireAdmin, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });
  try {
    await db.deleteUser(email);
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    console.error("❌ delete-user:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
