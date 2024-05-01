const axios = require('axios');
const queryCh= require('../database.js');
const fs = require('fs');
const path = require('path');

require('dotenv').config();


async function obtenerDomicilios() {
    const query =  {
        query: `SELECT DISTINCT TX_DOMICILIO as direccion FROM persona WHERE lower(TX_SECCION) LIKE lower('%105 - SAN FERNANDO%') LIMIT 1000`,
        format: 'JSONEachRow',
    };

    const resultados = await queryCh(query);
    const array_domicilio = resultados.map(row => row.direccion);
    const direcciones = await normalizarUnaDireccion(array_domicilio);

    const direcciones_encontradas = direcciones.resultados.filter(direccion => direccion.cantidad > 0);

    const direcciones_mapeadas = direcciones.resultados.map((direccion,index) => {
        if(direccion?.direcciones[0]?.ubicacion?.lat){
            return {
                direccion: array_domicilio[index],
                coordenadas: direccion?.direcciones[0]?.ubicacion?.lat + ', ' + direccion?.direcciones[0]?.ubicacion?.lon
            }
        }
        else{
            return {
                direccion: array_domicilio[index],
                coordenadas: 'No encontradas'
            }
        }
    });


    console.log(`Direcciones encontradas: ${direcciones_encontradas.length}`)
    console.log(`Direcciones totales: ${array_domicilio.length}`)


    console.log(direcciones_mapeadas);
}

async function normalizarUnaDireccion(direcciones) {
    const url = 'https://apis.datos.gob.ar/georef/api/direcciones';

    // hago una query a la api de direcciones donde provincia y localidad son fijas
    // y la dirección es la que se pasa por parámetro
    const data = {
        direcciones: direcciones.map(direccion => ({
            direccion: direccion,
            max: "1",
            provincia: "buenos aires",
            localidad: "san fernando"
        }))
    };

    console.log("Yendo a buscar a la api de direcciones...")
    console.table(direcciones)

    const response = await axios.post(url, data, {
        headers: {
            'Content-Type': 'application/json'
        }
    });

    // Extrae el resultado normalizado de la respuesta

    return response?.data // Asegúrate de ajustar esta línea según la estructura real de la respuesta 
}

obtenerDomicilios();