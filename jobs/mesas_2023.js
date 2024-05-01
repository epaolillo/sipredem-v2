const { obtenerResultados } = require('../models/resultados_2023');
const queryCh= require('../database.js');
const fs = require('fs');
const path = require('path');

require('dotenv').config();


async function obtenerMesasDistintas() {
    const query =  {
        query: `SELECT DISTINCT NUMERO_MESA as mesa FROM persona WHERE lower(TX_SECCION) LIKE lower('%105 - SAN FERNANDO%')`,
        format: 'JSONEachRow',
    };

    const resultados = await queryCh(query);
    return resultados.map(row => row.mesa);
}

async function actualizarResultadosEnDB() {
    try {

        // Crear las columnas si no existen
        const columnas = ['lla_2023', 'jpec_2023', 'uplp_2023', 'hpnp_2023', 'fdiydt_2023'];


        for (const columna of columnas) {
            const queryCrearColumna = {
                    query: `ALTER TABLE padron.persona DROP COLUMN IF EXISTS ${columna}`,
                    format: 'JSONEachRow',
            }
            log(JSON.stringify(queryCrearColumna))
            await queryCh(queryCrearColumna);
        }


        for (const columna of columnas) {
            const queryCrearColumna = {
                    query: `ALTER TABLE padron.persona ADD COLUMN IF NOT EXISTS ${columna} Float32 DEFAULT 0`,
                    format: 'JSONEachRow',
            }
            log(JSON.stringify(queryCrearColumna))
            await queryCh(queryCrearColumna);
        }
        

        // Obtener todos los valores distintos de mesa
        const mesasDistintas = await obtenerMesasDistintas();

        // Iterar sobre cada valor de mesa y ejecutar la actualización
        for (const mesa of mesasDistintas) {
            // Llamada a obtener los resultados
            const resultados = await obtenerResultados(2, 105, mesa); // Ignoramos el primer parámetro

            // Actualizar los valores en la base de datos
            const siglas = ['lla', 'jpec', 'uplp', 'hpnp', 'fdiydt'];
            for (const sigla of siglas) {
                const votosPorcentaje = resultados[`${sigla}_2023`];
                if (votosPorcentaje !== undefined) {
                    const queryActualizar = {
                        query: `ALTER TABLE padron.persona UPDATE ${sigla}_2023 = toFloat32(ifNull(${votosPorcentaje}, 0)) WHERE lower(TX_SECCION) LIKE lower('%105 - SAN FERNANDO%') AND NUMERO_MESA = ${mesa}`,
                        format: 'JSONEachRow',
                    }
                    log(JSON.stringify(queryActualizar));
                    await queryCh(queryActualizar);
                }
            }
        }

        console.log('Resultados actualizados correctamente en la base de datos');
    } catch (error) {
        console.error('Error al actualizar resultados en la base de datos:', error);
    }
}

/**
 * Appends text to a file, creating the file if it does not already exist.
 * @param {string} filePath - The path to the file.
 * @param {string} text - The text to append to the file.
 */
function log(text, filePath = 'mesas_2023.js.log') {
    fs.appendFile(filePath, text+"\n", (err) => {
        if (err) {
            console.error('Error writing to file:', err);
            return;
        }
        console.log('Text appended successfully!');
    });
}


// Llamada a la función para actualizar los resultados en la base de datos
actualizarResultadosEnDB();
