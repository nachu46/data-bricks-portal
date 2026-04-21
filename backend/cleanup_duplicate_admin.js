/**
 * One-off script: Delete duplicate admin@gmail.com row with role = 'ADMIN' (uppercase)
 * Keeps the correct row: admin@gmail.com / role = 'admin' (lowercase)
 *
 * Run with:  node backend/cleanup_duplicate_admin.js
 */

require("dotenv").config({ path: __dirname + "/.env" });
const axios = require("axios");

const HOST = process.env.DATABRICKS_HOST;
const TOKEN = process.env.DATABRICKS_TOKEN;
const WAREHOUSE_ID = process.env.WAREHOUSE_ID || process.env.DATABRICKS_WAREHOUSE_ID;

async function executeSQL(sql) {
    console.log("▶  Running SQL:", sql.trim());
    const submit = await axios.post(
        `${HOST}/api/2.0/sql/statements`,
        { statement: sql, warehouse_id: WAREHOUSE_ID },
        { headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" } }
    );

    let state = submit.data.status?.state;
    let result = submit.data;
    const statementId = submit.data.statement_id;

    if (state === "SUCCEEDED") return result;
    if (state === "FAILED") throw new Error(result.status?.error?.message || "SQL failed");

    while (state === "PENDING" || state === "RUNNING") {
        await new Promise((r) => setTimeout(r, 1200));
        const check = await axios.get(
            `${HOST}/api/2.0/sql/statements/${statementId}`,
            { headers: { Authorization: `Bearer ${TOKEN}` } }
        );
        state = check.data.status?.state;
        result = check.data;
    }

    if (state !== "SUCCEEDED") throw new Error(result.status?.error?.message || `SQL failed: ${state}`);
    return result;
}

async function main() {
    try {
        // Step 1: Show current rows before deletion
        console.log("\n📋 Current rows for admin@gmail.com:");
        const before = await executeSQL(
            `SELECT email, role FROM workspace.governance.users WHERE email = 'admin@gmail.com'`
        );
        const rows = before?.result?.data_array || [];
        rows.forEach(r => console.log(`   email=${r[0]}  role=${r[1]}`));

        if (rows.length < 2) {
            console.log("\n✅ No duplicate found — nothing to delete.");
            return;
        }

        // Step 2: Delete the UPPERCASE 'ADMIN' duplicate
        console.log("\n🗑️  Deleting duplicate row with role = 'ADMIN' (uppercase)...");
        await executeSQL(
            `DELETE FROM workspace.governance.users WHERE email = 'admin@gmail.com' AND role = 'ADMIN'`
        );

        // Step 3: Confirm remaining rows
        console.log("\n✅ Done! Remaining rows:");
        const after = await executeSQL(
            `SELECT email, role FROM workspace.governance.users WHERE email = 'admin@gmail.com'`
        );
        (after?.result?.data_array || []).forEach(r => console.log(`   email=${r[0]}  role=${r[1]}`));

    } catch (err) {
        console.error("\n❌ Error:", err.message);
        process.exit(1);
    }
}

main();
