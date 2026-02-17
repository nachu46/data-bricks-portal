const express = require("express");
const router = express.Router();
const { runQuery } = require("../services/databricksService");


// Get department tables
router.get("/department/:department", async (req, res) => {

  try {

    const department = req.params.department;

    const sql = `
      SELECT table_name
      FROM system.information_schema.tables
      WHERE table_schema='${department}'
      AND table_catalog='workspace'
    `;

    const data = await runQuery(sql);

    res.send(data);

  } catch (err) {

    res.status(500).send({ error: err.message });

  }

});


module.exports = router;
