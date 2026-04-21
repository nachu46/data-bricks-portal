require('dotenv').config();
const axios = require('axios');
const HOST = process.env.DATABRICKS_HOST;
const TOKEN = process.env.DATABRICKS_TOKEN;
const WH = process.env.WAREHOUSE_ID;

async function executeSQL(sql) {
    const submit = await axios.post(HOST + '/api/2.0/sql/statements',
        { statement: sql, warehouse_id: WH },
        { headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' } }
    );
    let state = submit.data.status?.state;
    let result = submit.data;
    const statementId = submit.data.statement_id;

    while (state === "PENDING" || state === "RUNNING") {
        await new Promise((r) => setTimeout(r, 2000));
        const check = await axios.get(`${HOST}/api/2.0/sql/statements/${statementId}`,
            { headers: { Authorization: 'Bearer ' + TOKEN } }
        );
        state = check.data.status?.state;
        result = check.data;
    }
    return result;
}

async function main() {
    console.log('Fetching all users from workspace.governance.users...');
    try {
        const res = await executeSQL("SELECT * FROM workspace.governance.users");
        console.log('Users:', JSON.stringify(res.result?.data_array, null, 2));
    } catch (e) {
        console.error('Error:', e.response?.data || e.message);
    }
}
main();
