const { obtenerResultados, obtenerResultadosGenerico } = require('../models/resultados_2023');
const { queryCh, clickhouse } = require('../database.js');
const fs = require('fs');
const path = require('path');

require('dotenv').config();


const ANIO = 2011;

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
        

        // Obtener todos los valores distintos de mesa
        const mesasDistintas = await obtenerMesasDistintas();

        // Iterar sobre cada valor de mesa y ejecutar la actualización
        for (const mesa of mesasDistintas) {
            // Llamada a obtener los resultados
            const resultados = await obtenerResultadosGenerico(ANIO,2, 105, mesa); // Ignoramos el primer parámetro


            // Obtenemos las siglas de las keys del array
            const siglas_ = Object.keys(resultados);


            // Creamos las columnas para estas siglas si es que no existen
            for (const sigla of siglas_) {
                const queryCrearColumna = {
                    query: `ALTER TABLE padron.persona ADD COLUMN IF NOT EXISTS ${sigla} Float32 DEFAULT 0`,
                    format: 'JSONEachRow',
                }
                log(JSON.stringify(queryCrearColumna))
                await queryCh(queryCrearColumna);
            }

    
        
            for (const sigla of siglas_) {
                const votosPorcentaje = resultados[`${sigla}`];
                if (votosPorcentaje !== undefined) {
                    const queryActualizar = {
                        query: `ALTER TABLE padron.persona UPDATE ${sigla} = toFloat32(ifNull(${votosPorcentaje}, 0)) WHERE lower(TX_SECCION) LIKE lower('%105 - SAN FERNANDO%') AND NUMERO_MESA = ${mesa}`,
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
function log(text, filePath = 'mesas_2019.js.log') {
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
