const axios = require('axios');
const { queryCh, clickhouse } = require('../database.js');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

async function obtenerDomicilios() {
    let offset = 0;
    const limit = 100;

    console.log("Corriendo domicilios")

    try{
        /*
        const queryCrearColumna = {
            query: `ALTER TABLE padron.persona DROP COLUMN IF EXISTS lat, DROP COLUMN IF EXISTS lon`,
            format: 'JSONEachRow',
        }
        await queryCh(queryCrearColumna);
        */

        const alterQuery = {
            query: `ALTER TABLE persona ADD COLUMN IF NOT EXISTS lat Float64, ADD COLUMN IF NOT EXISTS lon Float64`,
            format: 'JSONEachRow'
        };
        await queryCh(alterQuery);
    }

    catch(e){
        console.log(e)
    }

    while (true) {
        const fetchQuery = {
            query: `SELECT DISTINCT TX_DOMICILIO as direccion FROM persona WHERE lower(TX_SECCION) LIKE lower('%105 - SAN FERNANDO%') AND lat = 0 AND lon = 0 LIMIT ${limit} OFFSET ${offset}`,
            format: 'JSONEachRow',
        };

        const direccionesDB = await queryCh(fetchQuery);
        if (direccionesDB.length === 0) {
            console.log("No hay más direcciones para procesar.")
            break; // Salimos del bucle si no hay más datos que procesar
        }
        

        console.log(`Tenemos un total de ${direccionesDB.length} direcciones para procesar.`)
    
        const direccionesNormalizadas = await normalizarUnLoteDirecciones(direccionesDB.map(row => row.direccion));

        console.log(`Direcciones normalizadas: ${direccionesNormalizadas?.length}`)


        for (let i = 0; i < direccionesNormalizadas.length; i++) {
            const resultado = direccionesNormalizadas[i];
            if (resultado && resultado.direcciones && resultado.direcciones.length > 0) {
                const lat = resultado.direcciones[0].ubicacion.lat;
                const lon = resultado.direcciones[0].ubicacion.lon;
                const dir = direccionesDB[i].direccion;  // Utiliza la dirección directamente desde el array original

                // Actualiza las coordenadas en la base de datos
                const updateQuery = {
                    query: `ALTER TABLE padron.persona UPDATE lat = ${lat}, lon = ${lon} WHERE TX_DOMICILIO = '${dir.replace(/'/g, "''")}' AND lower(TX_SECCION) LIKE lower('%105 - SAN FERNANDO%')`,
                    format: 'JSONEachRow'
                };
         
                console.log(updateQuery)
                try{
                    await queryChWithRetry(updateQuery);
                }
                catch(e){
                    console.log(e)
                }
            }
        }

        offset += limit; // Incrementa el offset para la siguiente iteración
    }
}

async function queryChWithRetry(queryObj, maxRetries = 10) {
    let attempts = 0;

    while (attempts < maxRetries) {
        try {
            // Intenta ejecutar la consulta
            return await queryCh(queryObj);
        } catch (error) {
            attempts++;
            console.error(`Intento ${attempts}: Error al ejecutar la consulta`, error);

            // Si se han alcanzado el máximo de reintentos, lanza el error
            if (attempts === maxRetries) {
                throw new Error(`No se pudo ejecutar la consulta después de ${maxRetries} intentos: ${error}`);
            }

            // Espera un poco antes del siguiente reintento (opcional)
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}



async function normalizarUnLoteDirecciones(direcciones) {
    const url = 'https://apis.datos.gob.ar/georef/api/direcciones';
    const data = {
        direcciones: direcciones.map(direccion => ({
            direccion,
            provincia: "buenos aires",
            localidad: "san fernando"
        }))
    };


        const response = await axios.post(url, data, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        // Extrae el resultado normalizado de la respuesta
        return response.data.resultados;

}

obtenerDomicilios();