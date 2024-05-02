const axios = require('axios');
const queryCh= require('../database.js');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

async function obtenerDomicilios() {
    let offset = 0;
    const limit = 10;

    console.log("Corriendo domicilios")
    while (true) {
        const fetchQuery = {
            query: `SELECT DISTINCT TX_DOMICILIO as direccion FROM persona WHERE lower(TX_SECCION) LIKE lower('%105 - SAN FERNANDO%') LIMIT ${limit} OFFSET ${offset}`,
            format: 'JSONEachRow',
        };

        const direccionesDB = await queryCh(fetchQuery);
        if (direccionesDB.length === 0) {
            break; // Salimos del bucle si no hay más datos que procesar
        }

        console.log(`Tenemos un total de ${direccionesDB.length} direcciones para procesar.`)
        console.log(direccionesDB.map(row => row.direccion))
        const direccionesNormalizadas = await normalizarUnLoteDirecciones(direccionesDB.map(row => row.direccion));

        console.log(`Direcciones normalizadas: ${direccionesNormalizadas?.length}`)
        // Asegúrate de que las columnas existan
        const alterQuery = {
            query: `ALTER TABLE persona ADD COLUMN IF NOT EXISTS lat Float32, ADD COLUMN IF NOT EXISTS lon Float32`,
            format: 'JSONEachRow'
        };
        await queryCh(alterQuery);

        for (let i = 0; i < direccionesNormalizadas.length; i++) {
            const resultado = direccionesNormalizadas[i];
            if (resultado && resultado.direcciones && resultado.direcciones.length > 0) {
                const lat = resultado.direcciones[0].ubicacion.lat;
                const lon = resultado.direcciones[0].ubicacion.lon;
                const dir = direccionesDB[i].direccion;  // Utiliza la dirección directamente desde el array original

                // Actualiza las coordenadas en la base de datos
                const updateQuery = {
                    query: `UPDATE persona SET lat = ${lat}, lon = ${lon} WHERE TX_DOMICILIO = '${dir.replace(/'/g, "''")}' AND lower(TX_SECCION) LIKE lower('%105 - SAN FERNANDO%')`,
                    format: 'JSONEachRow'
                };
                
                await queryCh(updateQuery);
            }
        }

        offset += limit; // Incrementa el offset para la siguiente iteración
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