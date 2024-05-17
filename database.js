const { createClient } = require('@clickhouse/client');
require('dotenv').config();

const clickhouse = createClient({
    database: 'padron',
    //host
    url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
    password: process.env.CLICKHOUSE_PASSWORD,
    clickhouse_settings: {
      // https://clickhouse.com/docs/en/operations/settings/settings#async-insert
      async_insert: 1,
    },
    // Agrega otras opciones de configuración si son necesarias
});


async function queryCh(query) {
    const rows = await clickhouse.query(query);
    const stream = rows.stream();
    const results = [];

    return new Promise((resolve, reject) => {
        stream.on('data', (rows) => {
            rows.forEach((row) => {
                results.push(row.json());
            });
        });
        stream.on('end', () => {
            resolve(results);
        });
        stream.on('error', reject);
    });
}


module.exports = { queryCh, clickhouse };