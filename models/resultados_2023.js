const { queryCh, clickhouse } = require('../database.js');
const axios = require('axios');
const mapa = require('../mapa.js');

async function resultados_2023(req, res) {
    /* custom_query */



    try {
        // Parámetros de paginación
        const limit = parseInt(req.query._limit) || 5000000;  // Uso un valor por defecto más razonable
        const offset = parseInt(req.query._offset) || 0;

        // Parámetros de ordenación
        const sortField = req.query._sort || 'NU_MATRICULA';
        const sortOrder = req.query._order === 'DESC' ? 'DESC' : 'ASC';
        let complete_response = [];

        let custom_query = req.query.custom_query?? null;

        if(custom_query){

            custom_query += ` ORDER BY ${sortField} LIMIT ${limit} OFFSET ${offset}`
    
            const query = {
                query: custom_query,
                format: 'JSONEachRow',
            };

            const query_total = {
                query: `SELECT count(*) as total FROM persona ${whereClause}`,
                format: 'JSONEachRow',
            };
            const personas = await queryCh(query);

            const total_personas = await queryCh(query_total);

            // Ejecuta la consulta para obtener el total de registros (considerando los filtros)
            const total = total_personas[0]['total'];
    
            // Establece los encabezados necesarios para la paginación en ng-admin
            res.set('X-Total-Count', total);
            res.set('Access-Control-Expose-Headers', 'X-Total-Count');

            res.json(personas);
            return;
    
        }

        // Construir la cláusula WHERE para los filtros

        req.query.TX_SECCION = '105 - SAN FERNANDO';

        const filters = Object.keys(req.query)
            .filter(key => !key.startsWith('_') && req.query[key])
            .map(key => {
                if (isNaN(req.query[key])) {
                    return `lower(${key}) LIKE lower('%${req.query[key]}%')`;
                } else {
                    return `${key} = ${req.query[key]}`;
                }
            })
            .join(' AND ');

        const whereClause = filters ? `WHERE ${filters}` : '';

        const query = {
            query: `SELECT * FROM persona ${whereClause} ORDER BY ${sortField} ${sortOrder} LIMIT ${limit} OFFSET ${offset}`,
            format: 'JSONEachRow',
        };

        

        const query_total = {
            query: `SELECT count(*) as total FROM persona ${whereClause}`,
            format: 'JSONEachRow',
        };
        const personas = await queryCh(query);

        const total_personas = await queryCh(query_total);

        // Ejecuta la consulta para obtener el total de registros (considerando los filtros)
        const total = total_personas[0]['total'];

        // Establece los encabezados necesarios para la paginación en ng-admin
        res.set('X-Total-Count', total);
        res.set('Access-Control-Expose-Headers', 'X-Total-Count');

        res.json(personas);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error interno del servidor');
    }

}



// Funciones auxiliares

async function obtenerResultados(distrito, seccion, mesa) {
    const url = `http://resultados.mininterior.gob.ar/api/resultados/getResultados?anioEleccion=2023&tipoRecuento=1&tipoEleccion=2&categoriaId=1&distritoId=${distrito}&seccionId=${seccion}&mesaId=${mesa}`;

    try {
        const response = await axios.get(url);
        const resultados = response.data;
    
        const objetoResultados = {};

        for (const agr of resultados.valoresTotalizadosPositivos) {
            let sigla = agr.nombreAgrupacion.split(' ').map(palabra => palabra[0].toLowerCase()).join('');
            if(sigla == 'fdiydt-u'){
                sigla = 'fdiydt';
            }
            objetoResultados[`${sigla}_2023`] = agr.votosPorcentaje;
        }


        return objetoResultados;
    } catch (error) {
        console.error('Error al obtener resultados:', error);
        return '';
    }
}


function extraerPrimerosDigitos(str) {
    const resultado = str.match(/^\d+/);
    return resultado ? parseInt(resultado[0], 10) : null;
}

function obtenerIdDistrito(mapa, nombre) {
    // Función para normalizar, convertir a minúsculas y eliminar espacios innecesarios
    function normalizar(texto) {
        return texto.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

    nombre = normalizar(nombre); // Normaliza el nombre de entrada

    for (const item of mapa) {
        for (const distrito of item.Cargos.flatMap(cargo => cargo.Distritos)) {
            // Comprueba si el nombre normalizado coincide con el nombre del distrito normalizado
            if (normalizar(distrito.Distrito) === nombre) {
                return distrito.IdDistrito;
            }
            // Comprueba si el nombre normalizado coincide con alguna de las secciones de las secciones provinciales del distrito normalizado
            for (const seccionProvincial of distrito.SeccionesProvinciales) {
                for (const seccion of seccionProvincial.Secciones) {
                    if (seccion.Seccion && (normalizar(seccion.Seccion) === nombre)) {
                        return distrito.IdDistrito;
                    }
                }
            }
        }
    }
    return null; // Devuelve null si no se encuentra el nombre
}

module.exports = { resultados_2023, obtenerResultados, extraerPrimerosDigitos, obtenerIdDistrito };