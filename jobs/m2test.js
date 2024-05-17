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
            query: `ALTER TABLE persona ADD COLUMN IF NOT EXISTS m2 Float32`,
            format: 'JSONEachRow'
        };
        await queryCh(alterQuery);
    }

    catch(e){
        console.log(e)
    }

    while (true) {
        const fetchQuery = {
            query: `SELECT DISTINCT TX_DOMICILIO as direccion FROM persona WHERE lower(TX_SECCION) LIKE lower('%105 - SAN FERNANDO%') AND lat != 0 AND lon != 0 LIMIT ${limit} OFFSET ${offset}`,
            format: 'JSONEachRow',
        };

        const direccionesDB = await queryCh(fetchQuery);
        if (direccionesDB.length === 0) {
            console.log("No hay más direcciones para procesar.")
            break; // Salimos del bucle si no hay más datos que procesar
        }
        

        console.log(`Tenemos un total de ${direccionesDB.length} direcciones para procesar.`)
    
        // Agregamos un valor aleatorio para simular el m2
        for (let i = 0; i < direccionesDB.length; i++) {
            const m2 = generateRandomNumber(45_000, 450_000, 10_000);
            const direccion = direccionesDB[i].direccion;
            const updateQuery = {
                query: `ALTER TABLE padron.persona UPDATE m2 = ${m2} WHERE TX_DOMICILIO = '${direccion}'`,
                format: 'JSONEachRow',
            };
            await queryCh(updateQuery);
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


function generateRandomNumber(start, end, step) {
    // Calcular cuántos pasos hay entre el inicio y el final
    const numSteps = (end - start) / step;

    // Generar un índice aleatorio entre 0 y numSteps
    const randomStep = Math.floor(Math.random() * (numSteps + 1));

    // Calcular el número final sumando el número de pasos al inicio
    return start + randomStep * step;
}

obtenerDomicilios();