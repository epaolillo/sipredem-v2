const axios = require('axios');
const { queryCh, clickhouse } = require('../database.js');
const fs = require('fs');
const csvParser = require('csv-parser');
const path = require('path');

const processCsv = async (csvFilePath) => {
    const results = [];

    // Lee y parsea el archivo CSV
    fs.createReadStream(csvFilePath)
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            for (const row of results) {
                const dni = row['dni'];
                const lat = parseFloat(row['lat'])?? 0;
                const lon = parseFloat(row['lng'])?? 0;                
                
                try {
                    if(lat && lon && dni){
                        const updateQuery = {
                            query: `ALTER TABLE padron.persona UPDATE lat = ${lat}, lon = ${lon} WHERE NU_MATRICULA = ${parseInt(dni.replace(/'/g, "''"))} AND lat = 0 AND lon = 0`,
                            format: 'JSONEachRow'
                        };
                        console.log(`Actualizando latitud y longitud para DNI ${dni} con valores lat: ${lat} y lon: ${lon}`)
                        let response = await queryCh(updateQuery);
                        console.log(response)
                    }
                    else{
                        console.log(`No se pudo actualizar latitud y longitud para DNI ${dni} con valores lat: ${lat} y lon: ${lon}`)
                    }
                } catch (e) {
                    console.log(e);
                }
            }
        });
};


// Ruta al archivo CSV
const csvFilePath = 'ciudadanos.csv';

// Ejecuta la función para procesar el archivo CSV
processCsv(csvFilePath);