const express = require("express");
const router = express.Router();
const { runQuery } = require("../services/databricksService");

// Get all pending requests
router.get("/pending", async (req, res) => {
  try {
    const sql = `
      SELECT * FROM governance.user_requests
      WHERE status='PENDING'
    `;

    const data = await runQuery(sql);

    res.send(data);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Approve a request
router.post("/approve", async (req, res) => {
  try {
    const { user, table } = req.body;

    const sql = `
      UPDATE governance.user_requests
      SET status='APPROVED'
      WHERE user='${user}' AND table='${table}'
    `;

    await runQuery(sql);

    res.send({ message: "Request approved successfully" });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});
// Get all audit logs
router.get("/logs", async (req, res) => {
  try {
    const sql = `
      SELECT * FROM governance.user_requests
    `;

    const data = await runQuery(sql);

    res.send(data);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

module.exports = router;
