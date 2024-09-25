const axios = require('axios');
const { queryCh } = require('../database.js');
require('dotenv').config();

async function obtenerDomicilios() {
    let offset = 0;
    const limit = 100;
    let direccionesDB;

    console.log("Corriendo domicilios");

    try {
        const alterQuery = {
            query: `ALTER TABLE persona ADD COLUMN IF NOT EXISTS lat Float64, ADD COLUMN IF NOT EXISTS lon Float64`,
            format: 'JSONEachRow'
        };
        await queryCh(alterQuery);
    } catch (e) {
        console.log(e);
    }

    // Bucle controlado basado en el número de direcciones obtenidas
    do {
        const fetchQuery = {
            query: `SELECT DISTINCT TX_DOMICILIO as direccion FROM persona WHERE lower(TX_SECCION) LIKE lower('%105 - SAN FERNANDO%') LIMIT ${limit} OFFSET ${offset}`,
            format: 'JSONEachRow',
        };

        direccionesDB = await queryCh(fetchQuery);
        if (direccionesDB.length === 0) {
            console.log("No hay más direcciones para procesar.");
            break;
        }

        console.log(`Tenemos un total de ${direccionesDB.length} direcciones para procesar.`);

        for (let i = 0; i < direccionesDB.length; i++) {
            const dir = direccionesDB[i].direccion;

            try {
                const resultado = await geocodificarDireccion(dir);
                if (resultado && resultado.length > 0) {
                    const lat = resultado[0].lat;
                    const lon = resultado[0].lon;

                    // Actualiza las coordenadas en la base de datos
                    const updateQuery = {
                        query: `ALTER TABLE padron.persona UPDATE lat = ${lat}, lon = ${lon} WHERE TX_DOMICILIO = '${dir.replace(/'/g, "''")}' AND lower(TX_SECCION) LIKE lower('%105 - SAN FERNANDO%')`,
                        format: 'JSONEachRow'
                    };

                    console.log(updateQuery);
                    await queryChWithRetry(updateQuery);
                }
            } catch (e) {
                console.log(`Error al geocodificar la dirección ${dir}:`, e);
            }
        }

        offset += limit; // Incrementa el offset para la siguiente iteración
    } while (direccionesDB.length === limit); // Continúa mientras se devuelvan direcciones
}

async function geocodificarDireccion(direccion) {
    const url = `https://geocode.sectc.app/search.php`;
    const params = {
        secret: 'ea8ac2b5220152f87e183aaea3ed4e42',
        q: `${direccion}, san fernando, Buenos Aires, Argentina`
    };

    try {
        const response = await axios.get(url, { params });
        return response.data;
    } catch (error) {
        console.error(`Error al geocodificar la dirección ${direccion}:`, error);
        return null;
    }
}

async function queryChWithRetry(queryObj, maxRetries = 10) {
    let attempts = 0;

    while (attempts < maxRetries) {
        try {
            return await queryCh(queryObj);
        } catch (error) {
            attempts++;
            console.error(`Intento ${attempts}: Error al ejecutar la consulta`, error);

            if (attempts === maxRetries) {
                throw new Error(`No se pudo ejecutar la consulta después de ${maxRetries} intentos: ${error}`);
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

obtenerDomicilios();
