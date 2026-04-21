"use strict";

const express = require("express");
const router = express.Router();
const db = require("../services/databricksService");

// ── GET /data-access/department/:department
router.get("/department/:department", async (req, res) => {
  try {
    const data = await db.getDepartmentTables(req.params.department);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
