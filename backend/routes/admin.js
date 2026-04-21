"use strict";

const express = require("express");
const router = express.Router();
const db = require("../services/databricksService");
const { requireAdmin } = require("../middleware/auth");

// ── GET /admin/pending — All pending access requests
router.get("/pending", requireAdmin, async (req, res) => {
  try {
    const data = await db.getPendingRequests();
    res.json(data);
  } catch (err) {
    console.error("❌ Pending requests:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /admin/approve — Approve a request
router.post("/approve", requireAdmin, async (req, res) => {
  const { user, table } = req.body;
  if (!user || !table)
    return res.status(400).json({ error: "user and table are required" });

  try {
    await db.approveRequest(user, table);
    res.json({ success: true, message: "Request approved successfully" });
  } catch (err) {
    console.error("❌ Approve:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /admin/reject — Reject a request
router.post("/reject", requireAdmin, async (req, res) => {
  const { user, table } = req.body;
  if (!user || !table)
    return res.status(400).json({ error: "user and table are required" });

  try {
    await db.rejectRequest(user, table);
    res.json({ success: true, message: "Request rejected" });
  } catch (err) {
    console.error("❌ Reject:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /admin/logs — All audit logs
router.get("/logs", requireAdmin, async (req, res) => {
  try {
    const data = await db.getAuditLogs();
    res.json(data);
  } catch (err) {
    console.error("❌ Audit logs:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
