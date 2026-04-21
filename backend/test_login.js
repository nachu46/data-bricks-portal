require('dotenv').config();
const axios = require('axios');
const HOST = process.env.DATABRICKS_HOST;
const TOKEN = process.env.DATABRICKS_TOKEN;
const WH = process.env.WAREHOUSE_ID;

async function test() {
    const sql = "SELECT email, password, role FROM workspace.governance.users WHERE email = 'admin@gmail.com' LIMIT 5";
    console.log('Testing login query...');
    const r = await axios.post(HOST + '/api/2.0/sql/statements',
        { statement: sql, warehouse_id: WH },
        { headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' } }
    );
    console.log('State:', r.data.status?.state);
    console.log('Rows:', JSON.stringify(r.data.result?.data_array));
    if (r.data.status?.error) console.log('SQL Error:', r.data.status.error);

    // Also test posting to the local login endpoint
    console.log('\nTesting local API login...');
    const loginRes = await axios.post('http://localhost:5000/api/access/login',
        { email: 'admin@gmail.com', password: 'admin123' },
        { headers: { 'Content-Type': 'application/json' } }
    );
    console.log('Login API result:', JSON.stringify(loginRes.data));
}

test().catch(e => {
    console.log('ERROR:', e.response?.data || e.message);
});
