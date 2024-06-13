const fs = require('fs');
const csv = require('csv-parser');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { queryCh, clickhouse } = require('../database.js');

const argv = yargs(hideBin(process.argv))
    .option('update', {
        alias: 'u',
        type: 'boolean',
        description: 'Agregar filas a la tabla existente',
    })
    .option('table', {
        alias: 't',
        type: 'string',
        description: 'Nombre de la tabla a importar',
        demandOption: true
    })
    .argv;

const filePath = argv._[0];
const tableName = argv.table;

async function main() {
    if (!filePath) {
        console.error('Debe proporcionar el archivo CSV como primer parámetro.');
        process.exit(1);
    }

    const columns = [];
    const dataTypes = [];
    const rows = [];

    // Leer el archivo CSV para obtener los encabezados y los tipos de datos
    fs.createReadStream(filePath)
        .pipe(csv())
        .on('headers', (headers) => {
            headers.forEach(header => {
                columns.push(header);
                dataTypes.push('String'); // Inicialmente asumimos que todos son String
            });
        })
        .on('data', (row) => {
            // Determinar tipos de datos basados en los valores de la primera fila
            const parsedRow = {};
            columns.forEach((col, index) => {
                let value = row[col];
                if (typeof value === 'string' && value.includes(',')) {
                    value = value.replace(',', '.');
                }
                if (!isNaN(value)) {
                    dataTypes[index] = 'Float64';
                    value = parseFloat(value);
                } else if (isValidCoordinate(value)) {
                    dataTypes[index] = 'Float64'; // Asumimos que las coordenadas son Strings
                }
                parsedRow[col] = value;
            });
            rows.push(parsedRow);
        })
        .on('end', async () => {
            if (!argv.update) {
                // Eliminar la tabla si existe
                const dropTableQuery = {
                    query: `DROP TABLE IF EXISTS ${tableName}`,
                    format: 'JSONEachRow'
                };
                await queryCh(dropTableQuery);
            }

            // Crear la tabla
            const createTableQuery = {
                query: `
                CREATE TABLE IF NOT EXISTS ${tableName} (
                    ${columns.map((col, index) => `${col} ${dataTypes[index]}`).join(', ')}
                ) ENGINE = MergeTree() ORDER BY tuple()
                `,
                format: 'JSONEachRow'
            };
            await queryCh(createTableQuery);

            // Insertar los datos uno a uno usando clickhouse.insert
            for (const row of rows) {
                const inmuebleData = {};
                columns.forEach(col => {
                    inmuebleData[col] = row[col];
                });

                console.log(inmuebleData)
                await clickhouse.insert({
                    table: tableName,
                    values: [inmuebleData],
                    format: 'JSONEachRow',
                    columns: columns
                });
            }

            console.log('Importación completada.');
        });
}

// Función para validar coordenadas
function isValidCoordinate(value) {
    const coordRegex = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/;
    return coordRegex.test(value);
}

main().catch(err => {
    console.error('Error:', err);
});
