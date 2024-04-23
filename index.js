const express = require('express');
const path = require('path');
const axios = require('axios');
const app = express();
const port = 3000;
require('dotenv').config();

const { createClient } = require('@clickhouse/client');


const clickhouse = createClient({
    database: 'padron',
    password: process.env.CLICKHOUSE_PASSWORD,
    clickhouse_settings: {
      // https://clickhouse.com/docs/en/operations/settings/settings#async-insert
      async_insert: 1,
    },
    // Agrega otras opciones de configuración si son necesarias
  });
  

const users = [
    { id: 1, name: 'Ezequiel Paolillo', username: 'paolilloe@gmail.com'},
    { id: 2, name: 'Guillermo Ferino', username: 'guillermoferino@gmail.com'},
];

app.get('/users', (req, res) => {
    // Parámetros de paginación
    const page = parseInt(req.query._page) || 1;
    const limit = parseInt(req.query._limit) || 10;
    const start = (page - 1) * limit;
    const end = page * limit;

    // Ordenación (opcional)
    const sortField = req.query._sort || 'id';
    const sortOrder = req.query._order === 'DESC' ? -1 : 1;

    // Ordena los usuarios según el campo y el orden especificado
    const sortedUsers = users.sort((a, b) => {
        return (a[sortField] > b[sortField] ? 1 : -1) * sortOrder;
    });

    // Obtiene los usuarios para la página actual
    const paginatedUsers = sortedUsers.slice(start, end);

    // Establece los encabezados necesarios para la paginación en ng-admin
    res.set('X-Total-Count', users.length);
    res.set('Access-Control-Expose-Headers', 'X-Total-Count');

    res.json(paginatedUsers);
});

app.get('/personas', async (req, res) => {

    /* custom_query */



    try {
        // Parámetros de paginación
        const page = parseInt(req.query._page) || 1;
        const limit = parseInt(req.query._limit) || 5000000;
        const start = (page - 1) * limit;

        // Parámetros de ordenación
        let sortField = req.query._sort || 'NU_MATRICULA';
        if(sortField = 'id'){
            sortField = 'NU_MATRICULA';
        }
        const sortOrder = req.query._order === 'DESC' ? 'DESC' : 'ASC';

        let custom_query = req.query.custom_query?? null;

        if(custom_query){

            custom_query += ` ORDER BY ${sortField} LIMIT ${limit} OFFSET ${start}`
    
            const query = {
                query: custom_query,
                format: 'JSONEachRow',
            };

     
            const personas = await queryCh(query);

            const total = personas.length

            // Establece los encabezados necesarios para la paginación en ng-admin
            res.set('X-Total-Count', total);
            res.set('Access-Control-Expose-Headers', 'X-Total-Count');

            res.json(personas);
            return;
    
        }

        // Construir la cláusula WHERE para los filtros
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
            query: `SELECT * FROM persona ${whereClause} ORDER BY ${sortField} ${sortOrder} LIMIT ${limit} OFFSET ${start}`,
            format: 'JSONEachRow',
        };

        // Ejecuta la consulta para obtener las personas
        const personas = await queryCh(query);

        // Ejecuta la consulta para obtener el total de registros (considerando los filtros)

        const total = personas.length

        // Establece los encabezados necesarios para la paginación en ng-admin
        res.set('X-Total-Count', total);
        res.set('Access-Control-Expose-Headers', 'X-Total-Count');

        res.json(personas);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error interno del servidor');
    }
});


app.get('/resultados_2023', async (req, res) => {

    /* custom_query */



    try {
        // Parámetros de paginación
        const page = parseInt(req.query._page) || 1;
        const limit = parseInt(req.query._limit) || 10;
        const start = (page - 1) * limit;

        // Parámetros de ordenación
        const sortField = req.query._sort || 'NU_MATRICULA';
        const sortOrder = req.query._order === 'DESC' ? 'DESC' : 'ASC';
        let complete_response = [];

        let custom_query = req.query.custom_query?? null;

        if(custom_query){

            custom_query += ` ORDER BY ${sortField} LIMIT ${limit} OFFSET ${start}`
    
            const query = {
                query: custom_query,
                format: 'JSONEachRow',
            };

            console.log("Query: ", query.query);
            const personas = await queryCh(query);

            const total = personas.length

            // Establece los encabezados necesarios para la paginación en ng-admin
            res.set('X-Total-Count', total);
            res.set('Access-Control-Expose-Headers', 'X-Total-Count');

            res.json(personas);
            return;
    
        }

        // Construir la cláusula WHERE para los filtros
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
            query: `SELECT * FROM persona ${whereClause} ORDER BY ${sortField} ${sortOrder} LIMIT ${limit} OFFSET ${start}`,
            format: 'JSONEachRow',
        };

        

        // Ejecuta la consulta para obtener las personas
        const personas = await queryCh(query);

        // Ejecuta la consulta para obtener el total de registros (considerando los filtros)

        const total = personas.length

        // Establece los encabezados necesarios para la paginación en ng-admin
        res.set('X-Total-Count', total);
        res.set('Access-Control-Expose-Headers', 'X-Total-Count');

        // Para cada persona vamos a buscar los datos a la API
        for (let persona of personas) {
            let distrito = null;
            try{
                distrito = obtenerIdDistrito(mapa, persona.TX_LOCALIDAD);
            }
            catch(e){
                console.log("Error al obtener distrito", e);
            }

            const seccion = extraerPrimerosDigitos(persona.TX_SECCION);
            const mesa = persona.NUMERO_MESA;


            try {
                const resultados = await obtenerResultados(distrito, seccion, mesa);

                persona = {...persona, ...resultados};

                complete_response.push(persona);
                console.log(persona)

            } catch (error) {
                persona.resultados = '';
            }
        }

        console.log(complete_response)

        res.json(complete_response);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error interno del servidor');
    }
});


// Servir archivos estáticos desde el directorio raíz
app.use(express.static(path.join(__dirname)));

// Ruta principal que sirve el archivo index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});



// Funciones auxiliares

async function queryCh(query) {
    const rows = await clickhouse.query(query);
    const stream = rows.stream();
    const results = [];

    return new Promise((resolve, reject) => {
        stream.on('data', (rows) => {
            rows.forEach((row) => {
                results.push(row.json());
            });
        });
        stream.on('end', () => {
            resolve(results);
        });
        stream.on('error', reject);
    });
}

async function obtenerResultados(distrito, seccion, mesa) {
    const url = `http://resultados.mininterior.gob.ar/api/resultados/getResultados?anioEleccion=2023&tipoRecuento=1&tipoEleccion=2&categoriaId=1&distritoId=${distrito}&seccionId=${seccion}&mesaId=${mesa}`;

    try {
        const response = await axios.get(url);
        const resultados = response.data;
    
        const objetoResultados = {};

        for (const agr of resultados.valoresTotalizadosPositivos) {
            const sigla = agr.nombreAgrupacion.split(' ').map(palabra => palabra[0].toLowerCase()).join('');
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
                        console.log("ES IGUAL!");
                        return distrito.IdDistrito;
                    }
                }
            }
        }
    }
    return null; // Devuelve null si no se encuentra el nombre
}




const mapa = [
    {
        "_id": "654259682160513fe4cd2f65",
        "Año": 2023,
        "Recuento": "Provisorio",
        "Fecha": "22-10-2023",
        "IdEleccion": 2,
        "Elecciones": "Generales",
        "Cargos": [
            {
                "_id": "66134fd690a68119101b6a55",
                "IdCargo": "1",
                "Cargo": "PRESIDENTE/A",
                "Distritos": [
                    {
                        "_id": "66134fd690a68119101b6a56",
                        "IdDistrito": 0,
                        "Distrito": "ARGENTINA",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6a57",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6a58",
                                        "IdSeccion": null,
                                        "Seccion": null
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6a59",
                        "IdDistrito": 1,
                        "Distrito": "CIUDAD DE BUENOS AIRES",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6a5a",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6a5b",
                                        "IdSeccion": 1,
                                        "Seccion": "Comuna 01"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a5c",
                                        "IdSeccion": 2,
                                        "Seccion": "Comuna 02"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a5d",
                                        "IdSeccion": 3,
                                        "Seccion": "Comuna 03"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a5e",
                                        "IdSeccion": 4,
                                        "Seccion": "Comuna 04"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a5f",
                                        "IdSeccion": 5,
                                        "Seccion": "Comuna 05"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a60",
                                        "IdSeccion": 6,
                                        "Seccion": "Comuna 06"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a61",
                                        "IdSeccion": 7,
                                        "Seccion": "Comuna 07"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a62",
                                        "IdSeccion": 8,
                                        "Seccion": "Comuna 08"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a63",
                                        "IdSeccion": 9,
                                        "Seccion": "Comuna 09"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a64",
                                        "IdSeccion": 10,
                                        "Seccion": "Comuna 10"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a65",
                                        "IdSeccion": 11,
                                        "Seccion": "Comuna 11"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a66",
                                        "IdSeccion": 12,
                                        "Seccion": "Comuna 12"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a67",
                                        "IdSeccion": 13,
                                        "Seccion": "Comuna 13"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a68",
                                        "IdSeccion": 14,
                                        "Seccion": "Comuna 14"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a69",
                                        "IdSeccion": 15,
                                        "Seccion": "Comuna 15"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6a6a",
                        "IdDistrito": 2,
                        "Distrito": "Buenos Aires",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6a6b",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6a6c",
                                        "IdSeccion": 1,
                                        "Seccion": "Adolfo Alsina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a6d",
                                        "IdSeccion": 2,
                                        "Seccion": "Alberti"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a6e",
                                        "IdSeccion": 3,
                                        "Seccion": "Almirante Brown"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a6f",
                                        "IdSeccion": 4,
                                        "Seccion": "Avellaneda"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a70",
                                        "IdSeccion": 5,
                                        "Seccion": "Ayacucho"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a71",
                                        "IdSeccion": 6,
                                        "Seccion": "Azul"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a72",
                                        "IdSeccion": 7,
                                        "Seccion": "Bahía Blanca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a73",
                                        "IdSeccion": 8,
                                        "Seccion": "Balcarce"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a74",
                                        "IdSeccion": 9,
                                        "Seccion": "Baradero"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a75",
                                        "IdSeccion": 10,
                                        "Seccion": "Arrecifes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a76",
                                        "IdSeccion": 11,
                                        "Seccion": "Berazategui"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a77",
                                        "IdSeccion": 12,
                                        "Seccion": "Berisso"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a78",
                                        "IdSeccion": 13,
                                        "Seccion": "Bolívar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a79",
                                        "IdSeccion": 14,
                                        "Seccion": "Bragado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a7a",
                                        "IdSeccion": 15,
                                        "Seccion": "Brandsen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a7b",
                                        "IdSeccion": 16,
                                        "Seccion": "Campana"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a7c",
                                        "IdSeccion": 17,
                                        "Seccion": "Cañuelas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a7d",
                                        "IdSeccion": 18,
                                        "Seccion": "Capitán Sarmiento"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a7e",
                                        "IdSeccion": 19,
                                        "Seccion": "Carlos Casares"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a7f",
                                        "IdSeccion": 20,
                                        "Seccion": "Carlos Tejedor"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a80",
                                        "IdSeccion": 21,
                                        "Seccion": "Carmen de Areco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a81",
                                        "IdSeccion": 22,
                                        "Seccion": "Patagones"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a82",
                                        "IdSeccion": 23,
                                        "Seccion": "Castelli"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a83",
                                        "IdSeccion": 24,
                                        "Seccion": "Colón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a84",
                                        "IdSeccion": 25,
                                        "Seccion": "Coronel Dorrego"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a85",
                                        "IdSeccion": 26,
                                        "Seccion": "Coronel Pringles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a86",
                                        "IdSeccion": 27,
                                        "Seccion": "Coronel de Marina L. Rosales"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a87",
                                        "IdSeccion": 28,
                                        "Seccion": "Coronel Suárez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a88",
                                        "IdSeccion": 29,
                                        "Seccion": "Chacabuco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a89",
                                        "IdSeccion": 30,
                                        "Seccion": "Chascomús"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a8a",
                                        "IdSeccion": 31,
                                        "Seccion": "Chivilcoy"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a8b",
                                        "IdSeccion": 32,
                                        "Seccion": "Daireaux"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a8c",
                                        "IdSeccion": 33,
                                        "Seccion": "Dolores"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a8d",
                                        "IdSeccion": 34,
                                        "Seccion": "Ensenada"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a8e",
                                        "IdSeccion": 35,
                                        "Seccion": "Escobar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a8f",
                                        "IdSeccion": 36,
                                        "Seccion": "Esteban Echeverría"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a90",
                                        "IdSeccion": 37,
                                        "Seccion": "Exaltación de la Cruz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a91",
                                        "IdSeccion": 38,
                                        "Seccion": "Florencio Varela"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a92",
                                        "IdSeccion": 39,
                                        "Seccion": "General Alvarado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a93",
                                        "IdSeccion": 40,
                                        "Seccion": "General Alvear"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a94",
                                        "IdSeccion": 41,
                                        "Seccion": "General Arenales"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a95",
                                        "IdSeccion": 42,
                                        "Seccion": "General Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a96",
                                        "IdSeccion": 43,
                                        "Seccion": "General Guido"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a97",
                                        "IdSeccion": 44,
                                        "Seccion": "General La Madrid"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a98",
                                        "IdSeccion": 45,
                                        "Seccion": "General Las Heras"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a99",
                                        "IdSeccion": 46,
                                        "Seccion": "General Lavalle"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a9a",
                                        "IdSeccion": 47,
                                        "Seccion": "General Juan Madariaga"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a9b",
                                        "IdSeccion": 48,
                                        "Seccion": "General Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a9c",
                                        "IdSeccion": 49,
                                        "Seccion": "General Pinto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a9d",
                                        "IdSeccion": 50,
                                        "Seccion": "General Pueyrredón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a9e",
                                        "IdSeccion": 51,
                                        "Seccion": "General Rodríguez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6a9f",
                                        "IdSeccion": 52,
                                        "Seccion": "General San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6aa0",
                                        "IdSeccion": 53,
                                        "Seccion": "San Miguel"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6aa1",
                                        "IdSeccion": 54,
                                        "Seccion": "General Viamonte"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6aa2",
                                        "IdSeccion": 55,
                                        "Seccion": "General Villegas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6aa3",
                                        "IdSeccion": 56,
                                        "Seccion": "Adolfo Gonzales Chaves"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6aa4",
                                        "IdSeccion": 57,
                                        "Seccion": "Guaminí"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6aa5",
                                        "IdSeccion": 58,
                                        "Seccion": "Hipólito Yrigoyen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6aa6",
                                        "IdSeccion": 59,
                                        "Seccion": "Benito Juárez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6aa7",
                                        "IdSeccion": 60,
                                        "Seccion": "Junín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6aa8",
                                        "IdSeccion": 61,
                                        "Seccion": "La Matanza"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6aa9",
                                        "IdSeccion": 62,
                                        "Seccion": "Lanús"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6aaa",
                                        "IdSeccion": 63,
                                        "Seccion": "La Plata"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6aab",
                                        "IdSeccion": 64,
                                        "Seccion": "Laprida"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6aac",
                                        "IdSeccion": 65,
                                        "Seccion": "Las Flores"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6aad",
                                        "IdSeccion": 66,
                                        "Seccion": "Leandro N. Alem"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6aae",
                                        "IdSeccion": 67,
                                        "Seccion": "Lincoln"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6aaf",
                                        "IdSeccion": 68,
                                        "Seccion": "Lobería"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ab0",
                                        "IdSeccion": 69,
                                        "Seccion": "Lobos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ab1",
                                        "IdSeccion": 70,
                                        "Seccion": "Lomas de Zamora"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ab2",
                                        "IdSeccion": 71,
                                        "Seccion": "Luján"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ab3",
                                        "IdSeccion": 72,
                                        "Seccion": "Magdalena"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ab4",
                                        "IdSeccion": 73,
                                        "Seccion": "Maipú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ab5",
                                        "IdSeccion": 74,
                                        "Seccion": "Mar Chiquita"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ab6",
                                        "IdSeccion": 75,
                                        "Seccion": "Marcos Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ab7",
                                        "IdSeccion": 76,
                                        "Seccion": "Mercedes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ab8",
                                        "IdSeccion": 77,
                                        "Seccion": "Merlo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ab9",
                                        "IdSeccion": 78,
                                        "Seccion": "Monte"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6aba",
                                        "IdSeccion": 79,
                                        "Seccion": "Moreno"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6abb",
                                        "IdSeccion": 80,
                                        "Seccion": "Morón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6abc",
                                        "IdSeccion": 81,
                                        "Seccion": "Navarro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6abd",
                                        "IdSeccion": 82,
                                        "Seccion": "Necochea"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6abe",
                                        "IdSeccion": 83,
                                        "Seccion": "9 de Julio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6abf",
                                        "IdSeccion": 84,
                                        "Seccion": "Olavarría"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ac0",
                                        "IdSeccion": 85,
                                        "Seccion": "Pehuajó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ac1",
                                        "IdSeccion": 86,
                                        "Seccion": "Pellegrini"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ac2",
                                        "IdSeccion": 87,
                                        "Seccion": "Pergamino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ac3",
                                        "IdSeccion": 88,
                                        "Seccion": "Pila"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ac4",
                                        "IdSeccion": 89,
                                        "Seccion": "Pilar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ac5",
                                        "IdSeccion": 90,
                                        "Seccion": "Pinamar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ac6",
                                        "IdSeccion": 91,
                                        "Seccion": "Puan"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ac7",
                                        "IdSeccion": 92,
                                        "Seccion": "Quilmes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ac8",
                                        "IdSeccion": 93,
                                        "Seccion": "Ramallo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ac9",
                                        "IdSeccion": 94,
                                        "Seccion": "Rauch"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6aca",
                                        "IdSeccion": 95,
                                        "Seccion": "Rivadavia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6acb",
                                        "IdSeccion": 96,
                                        "Seccion": "Rojas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6acc",
                                        "IdSeccion": 97,
                                        "Seccion": "Roque Pérez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6acd",
                                        "IdSeccion": 98,
                                        "Seccion": "Saavedra"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ace",
                                        "IdSeccion": 99,
                                        "Seccion": "Saladillo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6acf",
                                        "IdSeccion": 100,
                                        "Seccion": "Salliqueló"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ad0",
                                        "IdSeccion": 101,
                                        "Seccion": "Salto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ad1",
                                        "IdSeccion": 102,
                                        "Seccion": "San Andrés de Giles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ad2",
                                        "IdSeccion": 103,
                                        "Seccion": "San Antonio de Areco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ad3",
                                        "IdSeccion": 104,
                                        "Seccion": "San Cayetano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ad4",
                                        "IdSeccion": 105,
                                        "Seccion": "San Fernando"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ad5",
                                        "IdSeccion": 106,
                                        "Seccion": "San Isidro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ad6",
                                        "IdSeccion": 107,
                                        "Seccion": "San Nicolás"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ad7",
                                        "IdSeccion": 108,
                                        "Seccion": "San Pedro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ad8",
                                        "IdSeccion": 109,
                                        "Seccion": "San Vicente"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ad9",
                                        "IdSeccion": 110,
                                        "Seccion": "Suipacha"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ada",
                                        "IdSeccion": 111,
                                        "Seccion": "Tandil"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6adb",
                                        "IdSeccion": 112,
                                        "Seccion": "Tapalqué"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6adc",
                                        "IdSeccion": 113,
                                        "Seccion": "Tigre"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6add",
                                        "IdSeccion": 114,
                                        "Seccion": "Tornquist"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ade",
                                        "IdSeccion": 115,
                                        "Seccion": "Trenque Lauquen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6adf",
                                        "IdSeccion": 116,
                                        "Seccion": "Tordillo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ae0",
                                        "IdSeccion": 117,
                                        "Seccion": "Tres Arroyos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ae1",
                                        "IdSeccion": 118,
                                        "Seccion": "Tres de Febrero"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ae2",
                                        "IdSeccion": 119,
                                        "Seccion": "La Costa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ae3",
                                        "IdSeccion": 120,
                                        "Seccion": "Monte Hermoso"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ae4",
                                        "IdSeccion": 121,
                                        "Seccion": "25 de Mayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ae5",
                                        "IdSeccion": 122,
                                        "Seccion": "Vicente López"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ae6",
                                        "IdSeccion": 123,
                                        "Seccion": "Villa Gesell"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ae7",
                                        "IdSeccion": 124,
                                        "Seccion": "Villarino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ae8",
                                        "IdSeccion": 125,
                                        "Seccion": "Zárate"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ae9",
                                        "IdSeccion": 126,
                                        "Seccion": "Tres Lomas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6aea",
                                        "IdSeccion": 127,
                                        "Seccion": "Florentino Ameghino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6aeb",
                                        "IdSeccion": 128,
                                        "Seccion": "Presidente Perón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6aec",
                                        "IdSeccion": 129,
                                        "Seccion": "José C. Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6aed",
                                        "IdSeccion": 130,
                                        "Seccion": "Malvinas Argentinas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6aee",
                                        "IdSeccion": 131,
                                        "Seccion": "Punta Indio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6aef",
                                        "IdSeccion": 132,
                                        "Seccion": "Ezeiza"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6af0",
                                        "IdSeccion": 133,
                                        "Seccion": "Ituzaingó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6af1",
                                        "IdSeccion": 134,
                                        "Seccion": "Hurlingham"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6af2",
                                        "IdSeccion": 135,
                                        "Seccion": "Lezama"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6af3",
                        "IdDistrito": 3,
                        "Distrito": "Catamarca",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6af4",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6af5",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6af6",
                                        "IdSeccion": 2,
                                        "Seccion": "Capayán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6af7",
                                        "IdSeccion": 3,
                                        "Seccion": "La Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6af8",
                                        "IdSeccion": 4,
                                        "Seccion": "Ancasti"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6af9",
                                        "IdSeccion": 5,
                                        "Seccion": "El Alto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6afa",
                                        "IdSeccion": 6,
                                        "Seccion": "Santa Rosa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6afb",
                                        "IdSeccion": 7,
                                        "Seccion": "Paclín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6afc",
                                        "IdSeccion": 8,
                                        "Seccion": "Valle Viejo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6afd",
                                        "IdSeccion": 9,
                                        "Seccion": "Fray Mamerto Esquiú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6afe",
                                        "IdSeccion": 10,
                                        "Seccion": "Ambato"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6aff",
                                        "IdSeccion": 11,
                                        "Seccion": "Pomán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b00",
                                        "IdSeccion": 12,
                                        "Seccion": "Andalgalá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b01",
                                        "IdSeccion": 13,
                                        "Seccion": "Belén"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b02",
                                        "IdSeccion": 14,
                                        "Seccion": "Antofagasta de la Sierra"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b03",
                                        "IdSeccion": 15,
                                        "Seccion": "Tinogasta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b04",
                                        "IdSeccion": 16,
                                        "Seccion": "Santa María"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6b05",
                        "IdDistrito": 4,
                        "Distrito": "Córdoba",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6b06",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6b07",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b08",
                                        "IdSeccion": 2,
                                        "Seccion": "Calamuchita"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b09",
                                        "IdSeccion": 3,
                                        "Seccion": "Colón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b0a",
                                        "IdSeccion": 4,
                                        "Seccion": "Cruz del Eje"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b0b",
                                        "IdSeccion": 5,
                                        "Seccion": "General Roca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b0c",
                                        "IdSeccion": 6,
                                        "Seccion": "General San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b0d",
                                        "IdSeccion": 7,
                                        "Seccion": "Ischilín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b0e",
                                        "IdSeccion": 8,
                                        "Seccion": "Juárez Celman"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b0f",
                                        "IdSeccion": 9,
                                        "Seccion": "Marcos Juárez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b10",
                                        "IdSeccion": 10,
                                        "Seccion": "Minas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b11",
                                        "IdSeccion": 11,
                                        "Seccion": "Pocho"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b12",
                                        "IdSeccion": 12,
                                        "Seccion": "Punilla"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b13",
                                        "IdSeccion": 13,
                                        "Seccion": "Río Cuarto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b14",
                                        "IdSeccion": 14,
                                        "Seccion": "Río Primero"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b15",
                                        "IdSeccion": 15,
                                        "Seccion": "Río Seco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b16",
                                        "IdSeccion": 16,
                                        "Seccion": "Río Segundo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b17",
                                        "IdSeccion": 17,
                                        "Seccion": "Presidente Roque Sáenz Peña"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b18",
                                        "IdSeccion": 18,
                                        "Seccion": "San Alberto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b19",
                                        "IdSeccion": 19,
                                        "Seccion": "San Javier"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b1a",
                                        "IdSeccion": 20,
                                        "Seccion": "San Justo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b1b",
                                        "IdSeccion": 21,
                                        "Seccion": "Santa María"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b1c",
                                        "IdSeccion": 22,
                                        "Seccion": "Sobremonte"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b1d",
                                        "IdSeccion": 23,
                                        "Seccion": "Tercero Arriba"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b1e",
                                        "IdSeccion": 24,
                                        "Seccion": "Totoral"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b1f",
                                        "IdSeccion": 25,
                                        "Seccion": "Tulumba"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b20",
                                        "IdSeccion": 26,
                                        "Seccion": "Unión"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6b21",
                        "IdDistrito": 5,
                        "Distrito": "Corrientes",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6b22",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6b23",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b24",
                                        "IdSeccion": 2,
                                        "Seccion": "Goya"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b25",
                                        "IdSeccion": 3,
                                        "Seccion": "Curuzú Cuatiá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b26",
                                        "IdSeccion": 4,
                                        "Seccion": "Mercedes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b27",
                                        "IdSeccion": 5,
                                        "Seccion": "Esquina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b28",
                                        "IdSeccion": 6,
                                        "Seccion": "Lavalle"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b29",
                                        "IdSeccion": 7,
                                        "Seccion": "Santo Tomé"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b2a",
                                        "IdSeccion": 8,
                                        "Seccion": "Paso de los Libres"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b2b",
                                        "IdSeccion": 9,
                                        "Seccion": "Monte Caseros"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b2c",
                                        "IdSeccion": 10,
                                        "Seccion": "San Luis del Palmar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b2d",
                                        "IdSeccion": 11,
                                        "Seccion": "Bella Vista"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b2e",
                                        "IdSeccion": 12,
                                        "Seccion": "Empedrado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b2f",
                                        "IdSeccion": 13,
                                        "Seccion": "San Roque"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b30",
                                        "IdSeccion": 14,
                                        "Seccion": "General Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b31",
                                        "IdSeccion": 15,
                                        "Seccion": "Saladas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b32",
                                        "IdSeccion": 16,
                                        "Seccion": "San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b33",
                                        "IdSeccion": 17,
                                        "Seccion": "Concepción"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b34",
                                        "IdSeccion": 18,
                                        "Seccion": "Mburucuyá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b35",
                                        "IdSeccion": 19,
                                        "Seccion": "Ituzaingó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b36",
                                        "IdSeccion": 20,
                                        "Seccion": "Sauce"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b37",
                                        "IdSeccion": 21,
                                        "Seccion": "San Cosme"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b38",
                                        "IdSeccion": 22,
                                        "Seccion": "General Alvear"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b39",
                                        "IdSeccion": 23,
                                        "Seccion": "San Miguel"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b3a",
                                        "IdSeccion": 24,
                                        "Seccion": "Itatí"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b3b",
                                        "IdSeccion": 25,
                                        "Seccion": "Berón de Astrada"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6b3c",
                        "IdDistrito": 6,
                        "Distrito": "Chaco",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6b3d",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6b3e",
                                        "IdSeccion": 1,
                                        "Seccion": "San Fernando"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b3f",
                                        "IdSeccion": 2,
                                        "Seccion": "1º de Mayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b40",
                                        "IdSeccion": 3,
                                        "Seccion": "Libertad"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b41",
                                        "IdSeccion": 4,
                                        "Seccion": "General Donovan"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b42",
                                        "IdSeccion": 5,
                                        "Seccion": "Sargento Cabral"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b43",
                                        "IdSeccion": 6,
                                        "Seccion": "Presidencia de la Plaza"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b44",
                                        "IdSeccion": 7,
                                        "Seccion": "Bermejo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b45",
                                        "IdSeccion": 8,
                                        "Seccion": "Libertador General San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b46",
                                        "IdSeccion": 9,
                                        "Seccion": "Tapenagá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b47",
                                        "IdSeccion": 10,
                                        "Seccion": "San Lorenzo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b48",
                                        "IdSeccion": 11,
                                        "Seccion": "Mayor Luis J. Fontana"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b49",
                                        "IdSeccion": 12,
                                        "Seccion": "O'Higgins"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b4a",
                                        "IdSeccion": 13,
                                        "Seccion": "Comandante Fernández"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b4b",
                                        "IdSeccion": 14,
                                        "Seccion": "Quitilipi"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b4c",
                                        "IdSeccion": 15,
                                        "Seccion": "25 de Mayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b4d",
                                        "IdSeccion": 16,
                                        "Seccion": "Maipú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b4e",
                                        "IdSeccion": 17,
                                        "Seccion": "Independencia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b4f",
                                        "IdSeccion": 18,
                                        "Seccion": "General Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b50",
                                        "IdSeccion": 19,
                                        "Seccion": "9 de Julio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b51",
                                        "IdSeccion": 20,
                                        "Seccion": "Chacabuco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b52",
                                        "IdSeccion": 21,
                                        "Seccion": "12 de Octubre"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b53",
                                        "IdSeccion": 22,
                                        "Seccion": "2 de Abril"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b54",
                                        "IdSeccion": 23,
                                        "Seccion": "Fray Justo Santa María de Oro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b55",
                                        "IdSeccion": 24,
                                        "Seccion": "Almirante Brown"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b56",
                                        "IdSeccion": 25,
                                        "Seccion": "General Güemes"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6b57",
                        "IdDistrito": 7,
                        "Distrito": "Chubut",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6b58",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6b59",
                                        "IdSeccion": 1,
                                        "Seccion": "Rawson"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b5a",
                                        "IdSeccion": 2,
                                        "Seccion": "Biedma"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b5b",
                                        "IdSeccion": 3,
                                        "Seccion": "Telsen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b5c",
                                        "IdSeccion": 4,
                                        "Seccion": "Gastre"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b5d",
                                        "IdSeccion": 5,
                                        "Seccion": "Cushamen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b5e",
                                        "IdSeccion": 6,
                                        "Seccion": "Futaleufú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b5f",
                                        "IdSeccion": 7,
                                        "Seccion": "Languiñeo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b60",
                                        "IdSeccion": 8,
                                        "Seccion": "Tehuelches"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b61",
                                        "IdSeccion": 9,
                                        "Seccion": "Paso de Indios"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b62",
                                        "IdSeccion": 10,
                                        "Seccion": "Mártires"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b63",
                                        "IdSeccion": 11,
                                        "Seccion": "Florentino Ameghino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b64",
                                        "IdSeccion": 12,
                                        "Seccion": "Gaiman"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b65",
                                        "IdSeccion": 13,
                                        "Seccion": "Río Senguer"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b66",
                                        "IdSeccion": 14,
                                        "Seccion": "Sarmiento"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b67",
                                        "IdSeccion": 15,
                                        "Seccion": "Escalante"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6b68",
                        "IdDistrito": 8,
                        "Distrito": "Entre Ríos",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6b69",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6b6a",
                                        "IdSeccion": 1,
                                        "Seccion": "Paraná"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b6b",
                                        "IdSeccion": 3,
                                        "Seccion": "La Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b6c",
                                        "IdSeccion": 4,
                                        "Seccion": "Diamante"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b6d",
                                        "IdSeccion": 5,
                                        "Seccion": "Victoria"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b6e",
                                        "IdSeccion": 6,
                                        "Seccion": "Nogoyá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b6f",
                                        "IdSeccion": 7,
                                        "Seccion": "Gualeguay"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b70",
                                        "IdSeccion": 8,
                                        "Seccion": "Tala"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b71",
                                        "IdSeccion": 9,
                                        "Seccion": "Uruguay"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b72",
                                        "IdSeccion": 10,
                                        "Seccion": "Gualeguaychú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b73",
                                        "IdSeccion": 11,
                                        "Seccion": "Islas del Ibicuy"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b74",
                                        "IdSeccion": 12,
                                        "Seccion": "Villaguay"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b75",
                                        "IdSeccion": 13,
                                        "Seccion": "Concordia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b76",
                                        "IdSeccion": 14,
                                        "Seccion": "Federal"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b77",
                                        "IdSeccion": 15,
                                        "Seccion": "Colón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b78",
                                        "IdSeccion": 16,
                                        "Seccion": "Feliciano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b79",
                                        "IdSeccion": 17,
                                        "Seccion": "Federación"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b7a",
                                        "IdSeccion": 18,
                                        "Seccion": "San Salvador"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6b7b",
                        "IdDistrito": 9,
                        "Distrito": "Formosa",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6b7c",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6b7d",
                                        "IdSeccion": 1,
                                        "Seccion": "Formosa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b7e",
                                        "IdSeccion": 2,
                                        "Seccion": "Laishí"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b7f",
                                        "IdSeccion": 3,
                                        "Seccion": "Pilcomayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b80",
                                        "IdSeccion": 4,
                                        "Seccion": "Pirané"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b81",
                                        "IdSeccion": 5,
                                        "Seccion": "Pilagás"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b82",
                                        "IdSeccion": 6,
                                        "Seccion": "Patiño"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b83",
                                        "IdSeccion": 7,
                                        "Seccion": "Bermejo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b84",
                                        "IdSeccion": 8,
                                        "Seccion": "Matacos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b85",
                                        "IdSeccion": 9,
                                        "Seccion": "Ramón Lista"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6b86",
                        "IdDistrito": 10,
                        "Distrito": "Jujuy",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6b87",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6b88",
                                        "IdSeccion": 1,
                                        "Seccion": "Dr. Manuel Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b89",
                                        "IdSeccion": 2,
                                        "Seccion": "Palpalá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b8a",
                                        "IdSeccion": 3,
                                        "Seccion": "San Antonio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b8b",
                                        "IdSeccion": 4,
                                        "Seccion": "El Carmen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b8c",
                                        "IdSeccion": 5,
                                        "Seccion": "San Pedro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b8d",
                                        "IdSeccion": 6,
                                        "Seccion": "Santa Bárbara"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b8e",
                                        "IdSeccion": 7,
                                        "Seccion": "Ledesma"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b8f",
                                        "IdSeccion": 8,
                                        "Seccion": "Valle Grande"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b90",
                                        "IdSeccion": 9,
                                        "Seccion": "Tumbaya"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b91",
                                        "IdSeccion": 10,
                                        "Seccion": "Tilcara"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b92",
                                        "IdSeccion": 11,
                                        "Seccion": "Humahuaca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b93",
                                        "IdSeccion": 12,
                                        "Seccion": "Cochinoca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b94",
                                        "IdSeccion": 13,
                                        "Seccion": "Rinconada"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b95",
                                        "IdSeccion": 14,
                                        "Seccion": "Santa Catalina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b96",
                                        "IdSeccion": 15,
                                        "Seccion": "Yavi"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b97",
                                        "IdSeccion": 16,
                                        "Seccion": "Susques"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6b98",
                        "IdDistrito": 11,
                        "Distrito": "La Pampa",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6b99",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6b9a",
                                        "IdSeccion": 1,
                                        "Seccion": "Atreucó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b9b",
                                        "IdSeccion": 2,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b9c",
                                        "IdSeccion": 3,
                                        "Seccion": "Caleu Caleu"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b9d",
                                        "IdSeccion": 4,
                                        "Seccion": "Catriló"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b9e",
                                        "IdSeccion": 5,
                                        "Seccion": "Chalileo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6b9f",
                                        "IdSeccion": 6,
                                        "Seccion": "Chapaleufú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ba0",
                                        "IdSeccion": 7,
                                        "Seccion": "Chical Có"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ba1",
                                        "IdSeccion": 8,
                                        "Seccion": "Conhelo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ba2",
                                        "IdSeccion": 9,
                                        "Seccion": "Curacó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ba3",
                                        "IdSeccion": 10,
                                        "Seccion": "Guatraché"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ba4",
                                        "IdSeccion": 11,
                                        "Seccion": "Hucal"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ba5",
                                        "IdSeccion": 12,
                                        "Seccion": "Loventué"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ba6",
                                        "IdSeccion": 13,
                                        "Seccion": "Lihuel Calel"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ba7",
                                        "IdSeccion": 14,
                                        "Seccion": "Limay Mahuida"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ba8",
                                        "IdSeccion": 15,
                                        "Seccion": "Maracó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ba9",
                                        "IdSeccion": 16,
                                        "Seccion": "Puelén"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6baa",
                                        "IdSeccion": 17,
                                        "Seccion": "Quemú Quemú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bab",
                                        "IdSeccion": 18,
                                        "Seccion": "Rancul"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bac",
                                        "IdSeccion": 19,
                                        "Seccion": "Realicó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bad",
                                        "IdSeccion": 20,
                                        "Seccion": "Toay"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bae",
                                        "IdSeccion": 21,
                                        "Seccion": "Trenel"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6baf",
                                        "IdSeccion": 22,
                                        "Seccion": "Utracán"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6bb0",
                        "IdDistrito": 12,
                        "Distrito": "La Rioja",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6bb1",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6bb2",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bb3",
                                        "IdSeccion": 2,
                                        "Seccion": "Sanagasta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bb4",
                                        "IdSeccion": 3,
                                        "Seccion": "Castro Barros"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bb5",
                                        "IdSeccion": 4,
                                        "Seccion": "Arauco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bb6",
                                        "IdSeccion": 5,
                                        "Seccion": "San Blas de los Sauces"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bb7",
                                        "IdSeccion": 6,
                                        "Seccion": "Chilecito"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bb8",
                                        "IdSeccion": 7,
                                        "Seccion": "Famatina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bb9",
                                        "IdSeccion": 8,
                                        "Seccion": "Coronel Felipe Varela"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bba",
                                        "IdSeccion": 9,
                                        "Seccion": "General Lamadrid"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bbb",
                                        "IdSeccion": 10,
                                        "Seccion": "Vinchina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bbc",
                                        "IdSeccion": 11,
                                        "Seccion": "Independencia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bbd",
                                        "IdSeccion": 12,
                                        "Seccion": "Chamical"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bbe",
                                        "IdSeccion": 13,
                                        "Seccion": "Ángel Vicente Peñaloza"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bbf",
                                        "IdSeccion": 14,
                                        "Seccion": "General Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bc0",
                                        "IdSeccion": 15,
                                        "Seccion": "General Juan Facundo Quiroga"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bc1",
                                        "IdSeccion": 16,
                                        "Seccion": "General Ortiz de Ocampo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bc2",
                                        "IdSeccion": 17,
                                        "Seccion": "Rosario Vera Peñaloza"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bc3",
                                        "IdSeccion": 18,
                                        "Seccion": "General San Martín"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6bc4",
                        "IdDistrito": 13,
                        "Distrito": "Mendoza",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6bc5",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6bc6",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bc7",
                                        "IdSeccion": 2,
                                        "Seccion": "Godoy Cruz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bc8",
                                        "IdSeccion": 3,
                                        "Seccion": "Guaymallén"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bc9",
                                        "IdSeccion": 4,
                                        "Seccion": "Las Heras"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bca",
                                        "IdSeccion": 5,
                                        "Seccion": "Lavalle"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bcb",
                                        "IdSeccion": 6,
                                        "Seccion": "Maipú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bcc",
                                        "IdSeccion": 7,
                                        "Seccion": "Luján de Cuyo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bcd",
                                        "IdSeccion": 8,
                                        "Seccion": "Tupungato"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bce",
                                        "IdSeccion": 9,
                                        "Seccion": "San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bcf",
                                        "IdSeccion": 10,
                                        "Seccion": "Junín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bd0",
                                        "IdSeccion": 11,
                                        "Seccion": "Rivadavia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bd1",
                                        "IdSeccion": 12,
                                        "Seccion": "Tunuyán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bd2",
                                        "IdSeccion": 13,
                                        "Seccion": "San Carlos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bd3",
                                        "IdSeccion": 14,
                                        "Seccion": "Santa Rosa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bd4",
                                        "IdSeccion": 15,
                                        "Seccion": "La Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bd5",
                                        "IdSeccion": 16,
                                        "Seccion": "San Rafael"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bd6",
                                        "IdSeccion": 17,
                                        "Seccion": "Malargüe"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bd7",
                                        "IdSeccion": 18,
                                        "Seccion": "General Alvear"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6bd8",
                        "IdDistrito": 14,
                        "Distrito": "Misiones",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6bd9",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6bda",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bdb",
                                        "IdSeccion": 2,
                                        "Seccion": "Apóstoles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bdc",
                                        "IdSeccion": 3,
                                        "Seccion": "Candelaria"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bdd",
                                        "IdSeccion": 4,
                                        "Seccion": "Leandro N. Alem"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bde",
                                        "IdSeccion": 5,
                                        "Seccion": "Concepción"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bdf",
                                        "IdSeccion": 6,
                                        "Seccion": "San Javier"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6be0",
                                        "IdSeccion": 7,
                                        "Seccion": "San Ignacio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6be1",
                                        "IdSeccion": 8,
                                        "Seccion": "Oberá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6be2",
                                        "IdSeccion": 9,
                                        "Seccion": "Libertador General San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6be3",
                                        "IdSeccion": 10,
                                        "Seccion": "Cainguás"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6be4",
                                        "IdSeccion": 11,
                                        "Seccion": "25 de Mayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6be5",
                                        "IdSeccion": 12,
                                        "Seccion": "Montecarlo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6be6",
                                        "IdSeccion": 13,
                                        "Seccion": "Guaraní"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6be7",
                                        "IdSeccion": 14,
                                        "Seccion": "Eldorado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6be8",
                                        "IdSeccion": 15,
                                        "Seccion": "San Pedro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6be9",
                                        "IdSeccion": 16,
                                        "Seccion": "Iguazú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bea",
                                        "IdSeccion": 17,
                                        "Seccion": "General Manuel Belgrano"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6beb",
                        "IdDistrito": 15,
                        "Distrito": "Neuquén",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6bec",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6bed",
                                        "IdSeccion": 1,
                                        "Seccion": "Confluencia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bee",
                                        "IdSeccion": 2,
                                        "Seccion": "Zapala"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bef",
                                        "IdSeccion": 3,
                                        "Seccion": "Añelo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bf0",
                                        "IdSeccion": 4,
                                        "Seccion": "Pehuenches"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bf1",
                                        "IdSeccion": 5,
                                        "Seccion": "Chos Malal"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bf2",
                                        "IdSeccion": 6,
                                        "Seccion": "Minas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bf3",
                                        "IdSeccion": 7,
                                        "Seccion": "Ñorquín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bf4",
                                        "IdSeccion": 8,
                                        "Seccion": "Loncopué"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bf5",
                                        "IdSeccion": 9,
                                        "Seccion": "Picunches"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bf6",
                                        "IdSeccion": 10,
                                        "Seccion": "Aluminé"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bf7",
                                        "IdSeccion": 11,
                                        "Seccion": "Catán Lil"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bf8",
                                        "IdSeccion": 12,
                                        "Seccion": "Picún Leufú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bf9",
                                        "IdSeccion": 13,
                                        "Seccion": "Collón Curá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bfa",
                                        "IdSeccion": 14,
                                        "Seccion": "Huiliches"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bfb",
                                        "IdSeccion": 15,
                                        "Seccion": "Lácar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6bfc",
                                        "IdSeccion": 16,
                                        "Seccion": "Los Lagos"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6bfd",
                        "IdDistrito": 16,
                        "Distrito": "Río Negro",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6bfe",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6bff",
                                        "IdSeccion": 1,
                                        "Seccion": "Adolfo Alsina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c00",
                                        "IdSeccion": 2,
                                        "Seccion": "Conesa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c01",
                                        "IdSeccion": 3,
                                        "Seccion": "San Antonio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c02",
                                        "IdSeccion": 4,
                                        "Seccion": "Valcheta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c03",
                                        "IdSeccion": 5,
                                        "Seccion": "9 de Julio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c04",
                                        "IdSeccion": 6,
                                        "Seccion": "25 de Mayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c05",
                                        "IdSeccion": 7,
                                        "Seccion": "Ñorquinco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c06",
                                        "IdSeccion": 8,
                                        "Seccion": "Pilcaniyeu"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c07",
                                        "IdSeccion": 9,
                                        "Seccion": "Bariloche"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c08",
                                        "IdSeccion": 10,
                                        "Seccion": "Pichi Mahuida"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c09",
                                        "IdSeccion": 11,
                                        "Seccion": "Avellaneda"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c0a",
                                        "IdSeccion": 12,
                                        "Seccion": "General Roca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c0b",
                                        "IdSeccion": 13,
                                        "Seccion": "El Cuy"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6c0c",
                        "IdDistrito": 17,
                        "Distrito": "Salta",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6c0d",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6c0e",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c0f",
                                        "IdSeccion": 2,
                                        "Seccion": "La Caldera"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c10",
                                        "IdSeccion": 3,
                                        "Seccion": "General Güemes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c11",
                                        "IdSeccion": 4,
                                        "Seccion": "Metán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c12",
                                        "IdSeccion": 5,
                                        "Seccion": "Anta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c13",
                                        "IdSeccion": 6,
                                        "Seccion": "Rivadavia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c14",
                                        "IdSeccion": 7,
                                        "Seccion": "Orán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c15",
                                        "IdSeccion": 8,
                                        "Seccion": "General José de San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c16",
                                        "IdSeccion": 9,
                                        "Seccion": "Iruya"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c17",
                                        "IdSeccion": 10,
                                        "Seccion": "Santa Victoria"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c18",
                                        "IdSeccion": 11,
                                        "Seccion": "Cerrillos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c19",
                                        "IdSeccion": 12,
                                        "Seccion": "Chicoana"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c1a",
                                        "IdSeccion": 13,
                                        "Seccion": "La Viña"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c1b",
                                        "IdSeccion": 14,
                                        "Seccion": "Guachipas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c1c",
                                        "IdSeccion": 15,
                                        "Seccion": "Rosario de la Frontera"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c1d",
                                        "IdSeccion": 16,
                                        "Seccion": "La Candelaria"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c1e",
                                        "IdSeccion": 17,
                                        "Seccion": "Cafayate"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c1f",
                                        "IdSeccion": 18,
                                        "Seccion": "San Carlos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c20",
                                        "IdSeccion": 19,
                                        "Seccion": "Molinos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c21",
                                        "IdSeccion": 20,
                                        "Seccion": "Cachi"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c22",
                                        "IdSeccion": 21,
                                        "Seccion": "Rosario de Lerma"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c23",
                                        "IdSeccion": 22,
                                        "Seccion": "La Poma"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c24",
                                        "IdSeccion": 23,
                                        "Seccion": "Los Andes"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6c25",
                        "IdDistrito": 18,
                        "Distrito": "San Juan",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6c26",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6c27",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c28",
                                        "IdSeccion": 2,
                                        "Seccion": "Santa Lucía"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c29",
                                        "IdSeccion": 3,
                                        "Seccion": "Chimbas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c2a",
                                        "IdSeccion": 4,
                                        "Seccion": "Rivadavia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c2b",
                                        "IdSeccion": 5,
                                        "Seccion": "Zonda"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c2c",
                                        "IdSeccion": 6,
                                        "Seccion": "Rawson"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c2d",
                                        "IdSeccion": 7,
                                        "Seccion": "9 de Julio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c2e",
                                        "IdSeccion": 8,
                                        "Seccion": "San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c2f",
                                        "IdSeccion": 9,
                                        "Seccion": "Angaco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c30",
                                        "IdSeccion": 10,
                                        "Seccion": "Albardón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c31",
                                        "IdSeccion": 11,
                                        "Seccion": "Ullum"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c32",
                                        "IdSeccion": 12,
                                        "Seccion": "Pocito"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c33",
                                        "IdSeccion": 13,
                                        "Seccion": "Sarmiento"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c34",
                                        "IdSeccion": 14,
                                        "Seccion": "25 de Mayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c35",
                                        "IdSeccion": 15,
                                        "Seccion": "Caucete"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c36",
                                        "IdSeccion": 16,
                                        "Seccion": "Valle Fértil"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c37",
                                        "IdSeccion": 17,
                                        "Seccion": "Jáchal"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c38",
                                        "IdSeccion": 18,
                                        "Seccion": "Iglesia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c39",
                                        "IdSeccion": 19,
                                        "Seccion": "Calingasta"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6c3a",
                        "IdDistrito": 19,
                        "Distrito": "San Luis",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6c3b",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6c3c",
                                        "IdSeccion": 1,
                                        "Seccion": "Juan Martín de Pueyrredón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c3d",
                                        "IdSeccion": 2,
                                        "Seccion": "Coronel Pringles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c3e",
                                        "IdSeccion": 3,
                                        "Seccion": "General Pedernera"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c3f",
                                        "IdSeccion": 4,
                                        "Seccion": "Chacabuco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c40",
                                        "IdSeccion": 5,
                                        "Seccion": "Libertador General San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c41",
                                        "IdSeccion": 6,
                                        "Seccion": "Junín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c42",
                                        "IdSeccion": 7,
                                        "Seccion": "Ayacucho"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c43",
                                        "IdSeccion": 8,
                                        "Seccion": "Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c44",
                                        "IdSeccion": 9,
                                        "Seccion": "Gobernador Dupuy"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6c45",
                        "IdDistrito": 20,
                        "Distrito": "Santa Cruz",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6c46",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6c47",
                                        "IdSeccion": 1,
                                        "Seccion": "Deseado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c48",
                                        "IdSeccion": 2,
                                        "Seccion": "Lago Buenos Aires"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c49",
                                        "IdSeccion": 3,
                                        "Seccion": "Magallanes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c4a",
                                        "IdSeccion": 4,
                                        "Seccion": "Río Chico"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c4b",
                                        "IdSeccion": 5,
                                        "Seccion": "Corpen Aike"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c4c",
                                        "IdSeccion": 6,
                                        "Seccion": "Lago Argentino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c4d",
                                        "IdSeccion": 7,
                                        "Seccion": "Güer Aike"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6c4e",
                        "IdDistrito": 21,
                        "Distrito": "Santa Fe",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6c4f",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6c50",
                                        "IdSeccion": 1,
                                        "Seccion": "La Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c51",
                                        "IdSeccion": 2,
                                        "Seccion": "Las Colonias"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c52",
                                        "IdSeccion": 3,
                                        "Seccion": "San Jerónimo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c53",
                                        "IdSeccion": 4,
                                        "Seccion": "Garay"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c54",
                                        "IdSeccion": 5,
                                        "Seccion": "Castellanos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c55",
                                        "IdSeccion": 6,
                                        "Seccion": "San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c56",
                                        "IdSeccion": 7,
                                        "Seccion": "San Cristóbal"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c57",
                                        "IdSeccion": 8,
                                        "Seccion": "San Justo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c58",
                                        "IdSeccion": 9,
                                        "Seccion": "General Obligado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c59",
                                        "IdSeccion": 10,
                                        "Seccion": "Vera"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c5a",
                                        "IdSeccion": 11,
                                        "Seccion": "San Javier"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c5b",
                                        "IdSeccion": 12,
                                        "Seccion": "9 de Julio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c5c",
                                        "IdSeccion": 13,
                                        "Seccion": "Rosario"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c5d",
                                        "IdSeccion": 14,
                                        "Seccion": "Caseros"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c5e",
                                        "IdSeccion": 15,
                                        "Seccion": "Constitución"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c5f",
                                        "IdSeccion": 16,
                                        "Seccion": "General López"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c60",
                                        "IdSeccion": 17,
                                        "Seccion": "Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c61",
                                        "IdSeccion": 18,
                                        "Seccion": "Iriondo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c62",
                                        "IdSeccion": 19,
                                        "Seccion": "San Lorenzo"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6c63",
                        "IdDistrito": 22,
                        "Distrito": "Santiago del Estero",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6c64",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6c65",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c66",
                                        "IdSeccion": 2,
                                        "Seccion": "Avellaneda"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c67",
                                        "IdSeccion": 3,
                                        "Seccion": "Aguirre"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c68",
                                        "IdSeccion": 4,
                                        "Seccion": "Alberdi"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c69",
                                        "IdSeccion": 5,
                                        "Seccion": "Atamisqui"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c6a",
                                        "IdSeccion": 6,
                                        "Seccion": "Banda"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c6b",
                                        "IdSeccion": 7,
                                        "Seccion": "Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c6c",
                                        "IdSeccion": 8,
                                        "Seccion": "Copo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c6d",
                                        "IdSeccion": 9,
                                        "Seccion": "Choya"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c6e",
                                        "IdSeccion": 10,
                                        "Seccion": "Figueroa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c6f",
                                        "IdSeccion": 11,
                                        "Seccion": "Guasayán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c70",
                                        "IdSeccion": 12,
                                        "Seccion": "Jiménez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c71",
                                        "IdSeccion": 13,
                                        "Seccion": "Loreto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c72",
                                        "IdSeccion": 14,
                                        "Seccion": "Juan F. Ibarra"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c73",
                                        "IdSeccion": 15,
                                        "Seccion": "Mitre"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c74",
                                        "IdSeccion": 16,
                                        "Seccion": "Moreno"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c75",
                                        "IdSeccion": 17,
                                        "Seccion": "Ojo de Agua"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c76",
                                        "IdSeccion": 18,
                                        "Seccion": "Pellegrini"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c77",
                                        "IdSeccion": 19,
                                        "Seccion": "Quebrachos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c78",
                                        "IdSeccion": 20,
                                        "Seccion": "Rivadavia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c79",
                                        "IdSeccion": 21,
                                        "Seccion": "Robles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c7a",
                                        "IdSeccion": 22,
                                        "Seccion": "Río Hondo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c7b",
                                        "IdSeccion": 23,
                                        "Seccion": "Silípica"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c7c",
                                        "IdSeccion": 24,
                                        "Seccion": "San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c7d",
                                        "IdSeccion": 25,
                                        "Seccion": "Salavina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c7e",
                                        "IdSeccion": 26,
                                        "Seccion": "Sarmiento"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c7f",
                                        "IdSeccion": 27,
                                        "Seccion": "General Taboada"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6c80",
                        "IdDistrito": 23,
                        "Distrito": "Tucumán",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6c81",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6c82",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c83",
                                        "IdSeccion": 2,
                                        "Seccion": "Lules"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c84",
                                        "IdSeccion": 3,
                                        "Seccion": "Famaillá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c85",
                                        "IdSeccion": 4,
                                        "Seccion": "Monteros"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c86",
                                        "IdSeccion": 5,
                                        "Seccion": "Chicligasta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c87",
                                        "IdSeccion": 6,
                                        "Seccion": "Río Chico"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c88",
                                        "IdSeccion": 7,
                                        "Seccion": "Juan Bautista Alberdi"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c89",
                                        "IdSeccion": 8,
                                        "Seccion": "La Cocha"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c8a",
                                        "IdSeccion": 9,
                                        "Seccion": "Graneros"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c8b",
                                        "IdSeccion": 10,
                                        "Seccion": "Simoca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c8c",
                                        "IdSeccion": 11,
                                        "Seccion": "Leales"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c8d",
                                        "IdSeccion": 12,
                                        "Seccion": "Cruz Alta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c8e",
                                        "IdSeccion": 13,
                                        "Seccion": "Burruyacú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c8f",
                                        "IdSeccion": 14,
                                        "Seccion": "Trancas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c90",
                                        "IdSeccion": 15,
                                        "Seccion": "Yerba Buena"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c91",
                                        "IdSeccion": 16,
                                        "Seccion": "Tafí Viejo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c92",
                                        "IdSeccion": 17,
                                        "Seccion": "Tafí del Valle"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6c93",
                        "IdDistrito": 24,
                        "Distrito": "Tierra del Fuego, Antártida e Islas del Atlántico Sur",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6c94",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6c95",
                                        "IdSeccion": 1,
                                        "Seccion": "Ushuaia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c96",
                                        "IdSeccion": 2,
                                        "Seccion": "Río Grande"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c97",
                                        "IdSeccion": 3,
                                        "Seccion": "Antártida Argentina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c98",
                                        "IdSeccion": 5,
                                        "Seccion": "Tolhuin"
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                "_id": "66134fd690a68119101b6c99",
                "IdCargo": "2",
                "Cargo": "SENADORES/AS NACIONALES",
                "Distritos": [
                    {
                        "_id": "66134fd690a68119101b6c9a",
                        "IdDistrito": 2,
                        "Distrito": "Buenos Aires",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6c9b",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6c9c",
                                        "IdSeccion": 1,
                                        "Seccion": "Adolfo Alsina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c9d",
                                        "IdSeccion": 2,
                                        "Seccion": "Alberti"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c9e",
                                        "IdSeccion": 3,
                                        "Seccion": "Almirante Brown"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6c9f",
                                        "IdSeccion": 4,
                                        "Seccion": "Avellaneda"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ca0",
                                        "IdSeccion": 5,
                                        "Seccion": "Ayacucho"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ca1",
                                        "IdSeccion": 6,
                                        "Seccion": "Azul"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ca2",
                                        "IdSeccion": 7,
                                        "Seccion": "Bahía Blanca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ca3",
                                        "IdSeccion": 8,
                                        "Seccion": "Balcarce"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ca4",
                                        "IdSeccion": 9,
                                        "Seccion": "Baradero"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ca5",
                                        "IdSeccion": 10,
                                        "Seccion": "Arrecifes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ca6",
                                        "IdSeccion": 11,
                                        "Seccion": "Berazategui"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ca7",
                                        "IdSeccion": 12,
                                        "Seccion": "Berisso"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ca8",
                                        "IdSeccion": 13,
                                        "Seccion": "Bolívar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ca9",
                                        "IdSeccion": 14,
                                        "Seccion": "Bragado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6caa",
                                        "IdSeccion": 15,
                                        "Seccion": "Brandsen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cab",
                                        "IdSeccion": 16,
                                        "Seccion": "Campana"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cac",
                                        "IdSeccion": 17,
                                        "Seccion": "Cañuelas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cad",
                                        "IdSeccion": 18,
                                        "Seccion": "Capitán Sarmiento"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cae",
                                        "IdSeccion": 19,
                                        "Seccion": "Carlos Casares"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6caf",
                                        "IdSeccion": 20,
                                        "Seccion": "Carlos Tejedor"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cb0",
                                        "IdSeccion": 21,
                                        "Seccion": "Carmen de Areco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cb1",
                                        "IdSeccion": 22,
                                        "Seccion": "Patagones"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cb2",
                                        "IdSeccion": 23,
                                        "Seccion": "Castelli"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cb3",
                                        "IdSeccion": 24,
                                        "Seccion": "Colón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cb4",
                                        "IdSeccion": 25,
                                        "Seccion": "Coronel Dorrego"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cb5",
                                        "IdSeccion": 26,
                                        "Seccion": "Coronel Pringles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cb6",
                                        "IdSeccion": 27,
                                        "Seccion": "Coronel de Marina L. Rosales"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cb7",
                                        "IdSeccion": 28,
                                        "Seccion": "Coronel Suárez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cb8",
                                        "IdSeccion": 29,
                                        "Seccion": "Chacabuco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cb9",
                                        "IdSeccion": 30,
                                        "Seccion": "Chascomús"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cba",
                                        "IdSeccion": 31,
                                        "Seccion": "Chivilcoy"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cbb",
                                        "IdSeccion": 32,
                                        "Seccion": "Daireaux"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cbc",
                                        "IdSeccion": 33,
                                        "Seccion": "Dolores"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cbd",
                                        "IdSeccion": 34,
                                        "Seccion": "Ensenada"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cbe",
                                        "IdSeccion": 35,
                                        "Seccion": "Escobar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cbf",
                                        "IdSeccion": 36,
                                        "Seccion": "Esteban Echeverría"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cc0",
                                        "IdSeccion": 37,
                                        "Seccion": "Exaltación de la Cruz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cc1",
                                        "IdSeccion": 38,
                                        "Seccion": "Florencio Varela"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cc2",
                                        "IdSeccion": 39,
                                        "Seccion": "General Alvarado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cc3",
                                        "IdSeccion": 40,
                                        "Seccion": "General Alvear"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cc4",
                                        "IdSeccion": 41,
                                        "Seccion": "General Arenales"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cc5",
                                        "IdSeccion": 42,
                                        "Seccion": "General Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cc6",
                                        "IdSeccion": 43,
                                        "Seccion": "General Guido"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cc7",
                                        "IdSeccion": 44,
                                        "Seccion": "General La Madrid"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cc8",
                                        "IdSeccion": 45,
                                        "Seccion": "General Las Heras"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cc9",
                                        "IdSeccion": 46,
                                        "Seccion": "General Lavalle"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cca",
                                        "IdSeccion": 47,
                                        "Seccion": "General Juan Madariaga"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ccb",
                                        "IdSeccion": 48,
                                        "Seccion": "General Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ccc",
                                        "IdSeccion": 49,
                                        "Seccion": "General Pinto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ccd",
                                        "IdSeccion": 50,
                                        "Seccion": "General Pueyrredón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cce",
                                        "IdSeccion": 51,
                                        "Seccion": "General Rodríguez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ccf",
                                        "IdSeccion": 52,
                                        "Seccion": "General San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cd0",
                                        "IdSeccion": 53,
                                        "Seccion": "San Miguel"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cd1",
                                        "IdSeccion": 54,
                                        "Seccion": "General Viamonte"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cd2",
                                        "IdSeccion": 55,
                                        "Seccion": "General Villegas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cd3",
                                        "IdSeccion": 56,
                                        "Seccion": "Adolfo Gonzales Chaves"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cd4",
                                        "IdSeccion": 57,
                                        "Seccion": "Guaminí"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cd5",
                                        "IdSeccion": 58,
                                        "Seccion": "Hipólito Yrigoyen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cd6",
                                        "IdSeccion": 59,
                                        "Seccion": "Benito Juárez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cd7",
                                        "IdSeccion": 60,
                                        "Seccion": "Junín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cd8",
                                        "IdSeccion": 61,
                                        "Seccion": "La Matanza"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cd9",
                                        "IdSeccion": 62,
                                        "Seccion": "Lanús"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cda",
                                        "IdSeccion": 63,
                                        "Seccion": "La Plata"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cdb",
                                        "IdSeccion": 64,
                                        "Seccion": "Laprida"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cdc",
                                        "IdSeccion": 65,
                                        "Seccion": "Las Flores"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cdd",
                                        "IdSeccion": 66,
                                        "Seccion": "Leandro N. Alem"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cde",
                                        "IdSeccion": 67,
                                        "Seccion": "Lincoln"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cdf",
                                        "IdSeccion": 68,
                                        "Seccion": "Lobería"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ce0",
                                        "IdSeccion": 69,
                                        "Seccion": "Lobos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ce1",
                                        "IdSeccion": 70,
                                        "Seccion": "Lomas de Zamora"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ce2",
                                        "IdSeccion": 71,
                                        "Seccion": "Luján"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ce3",
                                        "IdSeccion": 72,
                                        "Seccion": "Magdalena"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ce4",
                                        "IdSeccion": 73,
                                        "Seccion": "Maipú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ce5",
                                        "IdSeccion": 74,
                                        "Seccion": "Mar Chiquita"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ce6",
                                        "IdSeccion": 75,
                                        "Seccion": "Marcos Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ce7",
                                        "IdSeccion": 76,
                                        "Seccion": "Mercedes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ce8",
                                        "IdSeccion": 77,
                                        "Seccion": "Merlo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ce9",
                                        "IdSeccion": 78,
                                        "Seccion": "Monte"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cea",
                                        "IdSeccion": 79,
                                        "Seccion": "Moreno"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ceb",
                                        "IdSeccion": 80,
                                        "Seccion": "Morón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cec",
                                        "IdSeccion": 81,
                                        "Seccion": "Navarro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ced",
                                        "IdSeccion": 82,
                                        "Seccion": "Necochea"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cee",
                                        "IdSeccion": 83,
                                        "Seccion": "9 de Julio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cef",
                                        "IdSeccion": 84,
                                        "Seccion": "Olavarría"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cf0",
                                        "IdSeccion": 85,
                                        "Seccion": "Pehuajó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cf1",
                                        "IdSeccion": 86,
                                        "Seccion": "Pellegrini"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cf2",
                                        "IdSeccion": 87,
                                        "Seccion": "Pergamino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cf3",
                                        "IdSeccion": 88,
                                        "Seccion": "Pila"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cf4",
                                        "IdSeccion": 89,
                                        "Seccion": "Pilar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cf5",
                                        "IdSeccion": 90,
                                        "Seccion": "Pinamar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cf6",
                                        "IdSeccion": 91,
                                        "Seccion": "Puan"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cf7",
                                        "IdSeccion": 92,
                                        "Seccion": "Quilmes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cf8",
                                        "IdSeccion": 93,
                                        "Seccion": "Ramallo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cf9",
                                        "IdSeccion": 94,
                                        "Seccion": "Rauch"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cfa",
                                        "IdSeccion": 95,
                                        "Seccion": "Rivadavia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cfb",
                                        "IdSeccion": 96,
                                        "Seccion": "Rojas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cfc",
                                        "IdSeccion": 97,
                                        "Seccion": "Roque Pérez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cfd",
                                        "IdSeccion": 98,
                                        "Seccion": "Saavedra"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cfe",
                                        "IdSeccion": 99,
                                        "Seccion": "Saladillo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6cff",
                                        "IdSeccion": 100,
                                        "Seccion": "Salliqueló"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d00",
                                        "IdSeccion": 101,
                                        "Seccion": "Salto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d01",
                                        "IdSeccion": 102,
                                        "Seccion": "San Andrés de Giles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d02",
                                        "IdSeccion": 103,
                                        "Seccion": "San Antonio de Areco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d03",
                                        "IdSeccion": 104,
                                        "Seccion": "San Cayetano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d04",
                                        "IdSeccion": 105,
                                        "Seccion": "San Fernando"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d05",
                                        "IdSeccion": 106,
                                        "Seccion": "San Isidro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d06",
                                        "IdSeccion": 107,
                                        "Seccion": "San Nicolás"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d07",
                                        "IdSeccion": 108,
                                        "Seccion": "San Pedro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d08",
                                        "IdSeccion": 109,
                                        "Seccion": "San Vicente"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d09",
                                        "IdSeccion": 110,
                                        "Seccion": "Suipacha"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d0a",
                                        "IdSeccion": 111,
                                        "Seccion": "Tandil"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d0b",
                                        "IdSeccion": 112,
                                        "Seccion": "Tapalqué"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d0c",
                                        "IdSeccion": 113,
                                        "Seccion": "Tigre"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d0d",
                                        "IdSeccion": 114,
                                        "Seccion": "Tornquist"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d0e",
                                        "IdSeccion": 115,
                                        "Seccion": "Trenque Lauquen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d0f",
                                        "IdSeccion": 116,
                                        "Seccion": "Tordillo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d10",
                                        "IdSeccion": 117,
                                        "Seccion": "Tres Arroyos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d11",
                                        "IdSeccion": 118,
                                        "Seccion": "Tres de Febrero"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d12",
                                        "IdSeccion": 119,
                                        "Seccion": "La Costa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d13",
                                        "IdSeccion": 120,
                                        "Seccion": "Monte Hermoso"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d14",
                                        "IdSeccion": 121,
                                        "Seccion": "25 de Mayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d15",
                                        "IdSeccion": 122,
                                        "Seccion": "Vicente López"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d16",
                                        "IdSeccion": 123,
                                        "Seccion": "Villa Gesell"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d17",
                                        "IdSeccion": 124,
                                        "Seccion": "Villarino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d18",
                                        "IdSeccion": 125,
                                        "Seccion": "Zárate"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d19",
                                        "IdSeccion": 126,
                                        "Seccion": "Tres Lomas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d1a",
                                        "IdSeccion": 127,
                                        "Seccion": "Florentino Ameghino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d1b",
                                        "IdSeccion": 128,
                                        "Seccion": "Presidente Perón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d1c",
                                        "IdSeccion": 129,
                                        "Seccion": "José C. Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d1d",
                                        "IdSeccion": 130,
                                        "Seccion": "Malvinas Argentinas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d1e",
                                        "IdSeccion": 131,
                                        "Seccion": "Punta Indio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d1f",
                                        "IdSeccion": 132,
                                        "Seccion": "Ezeiza"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d20",
                                        "IdSeccion": 133,
                                        "Seccion": "Ituzaingó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d21",
                                        "IdSeccion": 134,
                                        "Seccion": "Hurlingham"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d22",
                                        "IdSeccion": 135,
                                        "Seccion": "Lezama"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6d23",
                        "IdDistrito": 9,
                        "Distrito": "Formosa",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6d24",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6d25",
                                        "IdSeccion": 1,
                                        "Seccion": "Formosa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d26",
                                        "IdSeccion": 2,
                                        "Seccion": "Laishí"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d27",
                                        "IdSeccion": 3,
                                        "Seccion": "Pilcomayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d28",
                                        "IdSeccion": 4,
                                        "Seccion": "Pirané"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d29",
                                        "IdSeccion": 5,
                                        "Seccion": "Pilagás"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d2a",
                                        "IdSeccion": 6,
                                        "Seccion": "Patiño"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d2b",
                                        "IdSeccion": 7,
                                        "Seccion": "Bermejo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d2c",
                                        "IdSeccion": 8,
                                        "Seccion": "Matacos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d2d",
                                        "IdSeccion": 9,
                                        "Seccion": "Ramón Lista"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6d2e",
                        "IdDistrito": 10,
                        "Distrito": "Jujuy",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6d2f",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6d30",
                                        "IdSeccion": 1,
                                        "Seccion": "Dr. Manuel Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d31",
                                        "IdSeccion": 2,
                                        "Seccion": "Palpalá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d32",
                                        "IdSeccion": 3,
                                        "Seccion": "San Antonio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d33",
                                        "IdSeccion": 4,
                                        "Seccion": "El Carmen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d34",
                                        "IdSeccion": 5,
                                        "Seccion": "San Pedro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d35",
                                        "IdSeccion": 6,
                                        "Seccion": "Santa Bárbara"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d36",
                                        "IdSeccion": 7,
                                        "Seccion": "Ledesma"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d37",
                                        "IdSeccion": 8,
                                        "Seccion": "Valle Grande"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d38",
                                        "IdSeccion": 9,
                                        "Seccion": "Tumbaya"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d39",
                                        "IdSeccion": 10,
                                        "Seccion": "Tilcara"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d3a",
                                        "IdSeccion": 11,
                                        "Seccion": "Humahuaca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d3b",
                                        "IdSeccion": 12,
                                        "Seccion": "Cochinoca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d3c",
                                        "IdSeccion": 13,
                                        "Seccion": "Rinconada"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d3d",
                                        "IdSeccion": 14,
                                        "Seccion": "Santa Catalina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d3e",
                                        "IdSeccion": 15,
                                        "Seccion": "Yavi"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d3f",
                                        "IdSeccion": 16,
                                        "Seccion": "Susques"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6d40",
                        "IdDistrito": 12,
                        "Distrito": "La Rioja",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6d41",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6d42",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d43",
                                        "IdSeccion": 2,
                                        "Seccion": "Sanagasta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d44",
                                        "IdSeccion": 3,
                                        "Seccion": "Castro Barros"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d45",
                                        "IdSeccion": 4,
                                        "Seccion": "Arauco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d46",
                                        "IdSeccion": 5,
                                        "Seccion": "San Blas de los Sauces"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d47",
                                        "IdSeccion": 6,
                                        "Seccion": "Chilecito"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d48",
                                        "IdSeccion": 7,
                                        "Seccion": "Famatina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d49",
                                        "IdSeccion": 8,
                                        "Seccion": "Coronel Felipe Varela"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d4a",
                                        "IdSeccion": 9,
                                        "Seccion": "General Lamadrid"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d4b",
                                        "IdSeccion": 10,
                                        "Seccion": "Vinchina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d4c",
                                        "IdSeccion": 11,
                                        "Seccion": "Independencia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d4d",
                                        "IdSeccion": 12,
                                        "Seccion": "Chamical"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d4e",
                                        "IdSeccion": 13,
                                        "Seccion": "Ángel Vicente Peñaloza"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d4f",
                                        "IdSeccion": 14,
                                        "Seccion": "General Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d50",
                                        "IdSeccion": 15,
                                        "Seccion": "General Juan Facundo Quiroga"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d51",
                                        "IdSeccion": 16,
                                        "Seccion": "General Ortiz de Ocampo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d52",
                                        "IdSeccion": 17,
                                        "Seccion": "Rosario Vera Peñaloza"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d53",
                                        "IdSeccion": 18,
                                        "Seccion": "General San Martín"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6d54",
                        "IdDistrito": 14,
                        "Distrito": "Misiones",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6d55",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6d56",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d57",
                                        "IdSeccion": 2,
                                        "Seccion": "Apóstoles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d58",
                                        "IdSeccion": 3,
                                        "Seccion": "Candelaria"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d59",
                                        "IdSeccion": 4,
                                        "Seccion": "Leandro N. Alem"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d5a",
                                        "IdSeccion": 5,
                                        "Seccion": "Concepción"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d5b",
                                        "IdSeccion": 6,
                                        "Seccion": "San Javier"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d5c",
                                        "IdSeccion": 7,
                                        "Seccion": "San Ignacio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d5d",
                                        "IdSeccion": 8,
                                        "Seccion": "Oberá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d5e",
                                        "IdSeccion": 9,
                                        "Seccion": "Libertador General San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d5f",
                                        "IdSeccion": 10,
                                        "Seccion": "Cainguás"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d60",
                                        "IdSeccion": 11,
                                        "Seccion": "25 de Mayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d61",
                                        "IdSeccion": 12,
                                        "Seccion": "Montecarlo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d62",
                                        "IdSeccion": 13,
                                        "Seccion": "Guaraní"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d63",
                                        "IdSeccion": 14,
                                        "Seccion": "Eldorado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d64",
                                        "IdSeccion": 15,
                                        "Seccion": "San Pedro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d65",
                                        "IdSeccion": 16,
                                        "Seccion": "Iguazú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d66",
                                        "IdSeccion": 17,
                                        "Seccion": "General Manuel Belgrano"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6d67",
                        "IdDistrito": 18,
                        "Distrito": "San Juan",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6d68",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6d69",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d6a",
                                        "IdSeccion": 2,
                                        "Seccion": "Santa Lucía"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d6b",
                                        "IdSeccion": 3,
                                        "Seccion": "Chimbas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d6c",
                                        "IdSeccion": 4,
                                        "Seccion": "Rivadavia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d6d",
                                        "IdSeccion": 5,
                                        "Seccion": "Zonda"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d6e",
                                        "IdSeccion": 6,
                                        "Seccion": "Rawson"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d6f",
                                        "IdSeccion": 7,
                                        "Seccion": "9 de Julio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d70",
                                        "IdSeccion": 8,
                                        "Seccion": "San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d71",
                                        "IdSeccion": 9,
                                        "Seccion": "Angaco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d72",
                                        "IdSeccion": 10,
                                        "Seccion": "Albardón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d73",
                                        "IdSeccion": 11,
                                        "Seccion": "Ullum"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d74",
                                        "IdSeccion": 12,
                                        "Seccion": "Pocito"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d75",
                                        "IdSeccion": 13,
                                        "Seccion": "Sarmiento"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d76",
                                        "IdSeccion": 14,
                                        "Seccion": "25 de Mayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d77",
                                        "IdSeccion": 15,
                                        "Seccion": "Caucete"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d78",
                                        "IdSeccion": 16,
                                        "Seccion": "Valle Fértil"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d79",
                                        "IdSeccion": 17,
                                        "Seccion": "Jáchal"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d7a",
                                        "IdSeccion": 18,
                                        "Seccion": "Iglesia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d7b",
                                        "IdSeccion": 19,
                                        "Seccion": "Calingasta"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6d7c",
                        "IdDistrito": 19,
                        "Distrito": "San Luis",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6d7d",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6d7e",
                                        "IdSeccion": 1,
                                        "Seccion": "Juan Martín de Pueyrredón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d7f",
                                        "IdSeccion": 2,
                                        "Seccion": "Coronel Pringles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d80",
                                        "IdSeccion": 3,
                                        "Seccion": "General Pedernera"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d81",
                                        "IdSeccion": 4,
                                        "Seccion": "Chacabuco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d82",
                                        "IdSeccion": 5,
                                        "Seccion": "Libertador General San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d83",
                                        "IdSeccion": 6,
                                        "Seccion": "Junín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d84",
                                        "IdSeccion": 7,
                                        "Seccion": "Ayacucho"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d85",
                                        "IdSeccion": 8,
                                        "Seccion": "Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d86",
                                        "IdSeccion": 9,
                                        "Seccion": "Gobernador Dupuy"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6d87",
                        "IdDistrito": 20,
                        "Distrito": "Santa Cruz",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6d88",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6d89",
                                        "IdSeccion": 1,
                                        "Seccion": "Deseado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d8a",
                                        "IdSeccion": 2,
                                        "Seccion": "Lago Buenos Aires"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d8b",
                                        "IdSeccion": 3,
                                        "Seccion": "Magallanes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d8c",
                                        "IdSeccion": 4,
                                        "Seccion": "Río Chico"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d8d",
                                        "IdSeccion": 5,
                                        "Seccion": "Corpen Aike"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d8e",
                                        "IdSeccion": 6,
                                        "Seccion": "Lago Argentino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d8f",
                                        "IdSeccion": 7,
                                        "Seccion": "Güer Aike"
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                "_id": "66134fd690a68119101b6d90",
                "IdCargo": "3",
                "Cargo": "DIPUTADOS/AS NACIONALES",
                "Distritos": [
                    {
                        "_id": "66134fd690a68119101b6d91",
                        "IdDistrito": 1,
                        "Distrito": "Ciudad Autónoma de Buenos Aires",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6d92",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6d93",
                                        "IdSeccion": 1,
                                        "Seccion": "Comuna 01"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d94",
                                        "IdSeccion": 2,
                                        "Seccion": "Comuna 02"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d95",
                                        "IdSeccion": 3,
                                        "Seccion": "Comuna 03"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d96",
                                        "IdSeccion": 4,
                                        "Seccion": "Comuna 04"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d97",
                                        "IdSeccion": 5,
                                        "Seccion": "Comuna 05"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d98",
                                        "IdSeccion": 6,
                                        "Seccion": "Comuna 06"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d99",
                                        "IdSeccion": 7,
                                        "Seccion": "Comuna 07"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d9a",
                                        "IdSeccion": 8,
                                        "Seccion": "Comuna 08"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d9b",
                                        "IdSeccion": 9,
                                        "Seccion": "Comuna 09"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d9c",
                                        "IdSeccion": 10,
                                        "Seccion": "Comuna 10"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d9d",
                                        "IdSeccion": 11,
                                        "Seccion": "Comuna 11"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d9e",
                                        "IdSeccion": 12,
                                        "Seccion": "Comuna 12"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6d9f",
                                        "IdSeccion": 13,
                                        "Seccion": "Comuna 13"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6da0",
                                        "IdSeccion": 14,
                                        "Seccion": "Comuna 14"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6da1",
                                        "IdSeccion": 15,
                                        "Seccion": "Comuna 15"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6da2",
                        "IdDistrito": 2,
                        "Distrito": "Buenos Aires",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6da3",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6da4",
                                        "IdSeccion": 1,
                                        "Seccion": "Adolfo Alsina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6da5",
                                        "IdSeccion": 2,
                                        "Seccion": "Alberti"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6da6",
                                        "IdSeccion": 3,
                                        "Seccion": "Almirante Brown"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6da7",
                                        "IdSeccion": 4,
                                        "Seccion": "Avellaneda"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6da8",
                                        "IdSeccion": 5,
                                        "Seccion": "Ayacucho"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6da9",
                                        "IdSeccion": 6,
                                        "Seccion": "Azul"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6daa",
                                        "IdSeccion": 7,
                                        "Seccion": "Bahía Blanca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dab",
                                        "IdSeccion": 8,
                                        "Seccion": "Balcarce"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dac",
                                        "IdSeccion": 9,
                                        "Seccion": "Baradero"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dad",
                                        "IdSeccion": 10,
                                        "Seccion": "Arrecifes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dae",
                                        "IdSeccion": 11,
                                        "Seccion": "Berazategui"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6daf",
                                        "IdSeccion": 12,
                                        "Seccion": "Berisso"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6db0",
                                        "IdSeccion": 13,
                                        "Seccion": "Bolívar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6db1",
                                        "IdSeccion": 14,
                                        "Seccion": "Bragado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6db2",
                                        "IdSeccion": 15,
                                        "Seccion": "Brandsen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6db3",
                                        "IdSeccion": 16,
                                        "Seccion": "Campana"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6db4",
                                        "IdSeccion": 17,
                                        "Seccion": "Cañuelas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6db5",
                                        "IdSeccion": 18,
                                        "Seccion": "Capitán Sarmiento"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6db6",
                                        "IdSeccion": 19,
                                        "Seccion": "Carlos Casares"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6db7",
                                        "IdSeccion": 20,
                                        "Seccion": "Carlos Tejedor"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6db8",
                                        "IdSeccion": 21,
                                        "Seccion": "Carmen de Areco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6db9",
                                        "IdSeccion": 22,
                                        "Seccion": "Patagones"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dba",
                                        "IdSeccion": 23,
                                        "Seccion": "Castelli"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dbb",
                                        "IdSeccion": 24,
                                        "Seccion": "Colón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dbc",
                                        "IdSeccion": 25,
                                        "Seccion": "Coronel Dorrego"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dbd",
                                        "IdSeccion": 26,
                                        "Seccion": "Coronel Pringles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dbe",
                                        "IdSeccion": 27,
                                        "Seccion": "Coronel de Marina L. Rosales"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dbf",
                                        "IdSeccion": 28,
                                        "Seccion": "Coronel Suárez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dc0",
                                        "IdSeccion": 29,
                                        "Seccion": "Chacabuco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dc1",
                                        "IdSeccion": 30,
                                        "Seccion": "Chascomús"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dc2",
                                        "IdSeccion": 31,
                                        "Seccion": "Chivilcoy"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dc3",
                                        "IdSeccion": 32,
                                        "Seccion": "Daireaux"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dc4",
                                        "IdSeccion": 33,
                                        "Seccion": "Dolores"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dc5",
                                        "IdSeccion": 34,
                                        "Seccion": "Ensenada"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dc6",
                                        "IdSeccion": 35,
                                        "Seccion": "Escobar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dc7",
                                        "IdSeccion": 36,
                                        "Seccion": "Esteban Echeverría"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dc8",
                                        "IdSeccion": 37,
                                        "Seccion": "Exaltación de la Cruz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dc9",
                                        "IdSeccion": 38,
                                        "Seccion": "Florencio Varela"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dca",
                                        "IdSeccion": 39,
                                        "Seccion": "General Alvarado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dcb",
                                        "IdSeccion": 40,
                                        "Seccion": "General Alvear"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dcc",
                                        "IdSeccion": 41,
                                        "Seccion": "General Arenales"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dcd",
                                        "IdSeccion": 42,
                                        "Seccion": "General Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dce",
                                        "IdSeccion": 43,
                                        "Seccion": "General Guido"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dcf",
                                        "IdSeccion": 44,
                                        "Seccion": "General La Madrid"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dd0",
                                        "IdSeccion": 45,
                                        "Seccion": "General Las Heras"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dd1",
                                        "IdSeccion": 46,
                                        "Seccion": "General Lavalle"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dd2",
                                        "IdSeccion": 47,
                                        "Seccion": "General Juan Madariaga"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dd3",
                                        "IdSeccion": 48,
                                        "Seccion": "General Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dd4",
                                        "IdSeccion": 49,
                                        "Seccion": "General Pinto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dd5",
                                        "IdSeccion": 50,
                                        "Seccion": "General Pueyrredón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dd6",
                                        "IdSeccion": 51,
                                        "Seccion": "General Rodríguez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dd7",
                                        "IdSeccion": 52,
                                        "Seccion": "General San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dd8",
                                        "IdSeccion": 53,
                                        "Seccion": "San Miguel"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dd9",
                                        "IdSeccion": 54,
                                        "Seccion": "General Viamonte"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dda",
                                        "IdSeccion": 55,
                                        "Seccion": "General Villegas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ddb",
                                        "IdSeccion": 56,
                                        "Seccion": "Adolfo Gonzales Chaves"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ddc",
                                        "IdSeccion": 57,
                                        "Seccion": "Guaminí"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ddd",
                                        "IdSeccion": 58,
                                        "Seccion": "Hipólito Yrigoyen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dde",
                                        "IdSeccion": 59,
                                        "Seccion": "Benito Juárez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ddf",
                                        "IdSeccion": 60,
                                        "Seccion": "Junín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6de0",
                                        "IdSeccion": 61,
                                        "Seccion": "La Matanza"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6de1",
                                        "IdSeccion": 62,
                                        "Seccion": "Lanús"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6de2",
                                        "IdSeccion": 63,
                                        "Seccion": "La Plata"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6de3",
                                        "IdSeccion": 64,
                                        "Seccion": "Laprida"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6de4",
                                        "IdSeccion": 65,
                                        "Seccion": "Las Flores"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6de5",
                                        "IdSeccion": 66,
                                        "Seccion": "Leandro N. Alem"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6de6",
                                        "IdSeccion": 67,
                                        "Seccion": "Lincoln"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6de7",
                                        "IdSeccion": 68,
                                        "Seccion": "Lobería"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6de8",
                                        "IdSeccion": 69,
                                        "Seccion": "Lobos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6de9",
                                        "IdSeccion": 70,
                                        "Seccion": "Lomas de Zamora"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dea",
                                        "IdSeccion": 71,
                                        "Seccion": "Luján"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6deb",
                                        "IdSeccion": 72,
                                        "Seccion": "Magdalena"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dec",
                                        "IdSeccion": 73,
                                        "Seccion": "Maipú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ded",
                                        "IdSeccion": 74,
                                        "Seccion": "Mar Chiquita"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dee",
                                        "IdSeccion": 75,
                                        "Seccion": "Marcos Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6def",
                                        "IdSeccion": 76,
                                        "Seccion": "Mercedes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6df0",
                                        "IdSeccion": 77,
                                        "Seccion": "Merlo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6df1",
                                        "IdSeccion": 78,
                                        "Seccion": "Monte"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6df2",
                                        "IdSeccion": 79,
                                        "Seccion": "Moreno"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6df3",
                                        "IdSeccion": 80,
                                        "Seccion": "Morón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6df4",
                                        "IdSeccion": 81,
                                        "Seccion": "Navarro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6df5",
                                        "IdSeccion": 82,
                                        "Seccion": "Necochea"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6df6",
                                        "IdSeccion": 83,
                                        "Seccion": "9 de Julio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6df7",
                                        "IdSeccion": 84,
                                        "Seccion": "Olavarría"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6df8",
                                        "IdSeccion": 85,
                                        "Seccion": "Pehuajó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6df9",
                                        "IdSeccion": 86,
                                        "Seccion": "Pellegrini"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dfa",
                                        "IdSeccion": 87,
                                        "Seccion": "Pergamino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dfb",
                                        "IdSeccion": 88,
                                        "Seccion": "Pila"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dfc",
                                        "IdSeccion": 89,
                                        "Seccion": "Pilar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dfd",
                                        "IdSeccion": 90,
                                        "Seccion": "Pinamar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dfe",
                                        "IdSeccion": 91,
                                        "Seccion": "Puan"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6dff",
                                        "IdSeccion": 92,
                                        "Seccion": "Quilmes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e00",
                                        "IdSeccion": 93,
                                        "Seccion": "Ramallo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e01",
                                        "IdSeccion": 94,
                                        "Seccion": "Rauch"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e02",
                                        "IdSeccion": 95,
                                        "Seccion": "Rivadavia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e03",
                                        "IdSeccion": 96,
                                        "Seccion": "Rojas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e04",
                                        "IdSeccion": 97,
                                        "Seccion": "Roque Pérez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e05",
                                        "IdSeccion": 98,
                                        "Seccion": "Saavedra"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e06",
                                        "IdSeccion": 99,
                                        "Seccion": "Saladillo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e07",
                                        "IdSeccion": 100,
                                        "Seccion": "Salliqueló"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e08",
                                        "IdSeccion": 101,
                                        "Seccion": "Salto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e09",
                                        "IdSeccion": 102,
                                        "Seccion": "San Andrés de Giles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e0a",
                                        "IdSeccion": 103,
                                        "Seccion": "San Antonio de Areco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e0b",
                                        "IdSeccion": 104,
                                        "Seccion": "San Cayetano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e0c",
                                        "IdSeccion": 105,
                                        "Seccion": "San Fernando"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e0d",
                                        "IdSeccion": 106,
                                        "Seccion": "San Isidro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e0e",
                                        "IdSeccion": 107,
                                        "Seccion": "San Nicolás"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e0f",
                                        "IdSeccion": 108,
                                        "Seccion": "San Pedro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e10",
                                        "IdSeccion": 109,
                                        "Seccion": "San Vicente"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e11",
                                        "IdSeccion": 110,
                                        "Seccion": "Suipacha"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e12",
                                        "IdSeccion": 111,
                                        "Seccion": "Tandil"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e13",
                                        "IdSeccion": 112,
                                        "Seccion": "Tapalqué"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e14",
                                        "IdSeccion": 113,
                                        "Seccion": "Tigre"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e15",
                                        "IdSeccion": 114,
                                        "Seccion": "Tornquist"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e16",
                                        "IdSeccion": 115,
                                        "Seccion": "Trenque Lauquen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e17",
                                        "IdSeccion": 116,
                                        "Seccion": "Tordillo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e18",
                                        "IdSeccion": 117,
                                        "Seccion": "Tres Arroyos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e19",
                                        "IdSeccion": 118,
                                        "Seccion": "Tres de Febrero"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e1a",
                                        "IdSeccion": 119,
                                        "Seccion": "La Costa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e1b",
                                        "IdSeccion": 120,
                                        "Seccion": "Monte Hermoso"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e1c",
                                        "IdSeccion": 121,
                                        "Seccion": "25 de Mayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e1d",
                                        "IdSeccion": 122,
                                        "Seccion": "Vicente López"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e1e",
                                        "IdSeccion": 123,
                                        "Seccion": "Villa Gesell"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e1f",
                                        "IdSeccion": 124,
                                        "Seccion": "Villarino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e20",
                                        "IdSeccion": 125,
                                        "Seccion": "Zárate"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e21",
                                        "IdSeccion": 126,
                                        "Seccion": "Tres Lomas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e22",
                                        "IdSeccion": 127,
                                        "Seccion": "Florentino Ameghino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e23",
                                        "IdSeccion": 128,
                                        "Seccion": "Presidente Perón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e24",
                                        "IdSeccion": 129,
                                        "Seccion": "José C. Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e25",
                                        "IdSeccion": 130,
                                        "Seccion": "Malvinas Argentinas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e26",
                                        "IdSeccion": 131,
                                        "Seccion": "Punta Indio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e27",
                                        "IdSeccion": 132,
                                        "Seccion": "Ezeiza"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e28",
                                        "IdSeccion": 133,
                                        "Seccion": "Ituzaingó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e29",
                                        "IdSeccion": 134,
                                        "Seccion": "Hurlingham"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e2a",
                                        "IdSeccion": 135,
                                        "Seccion": "Lezama"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6e2b",
                        "IdDistrito": 3,
                        "Distrito": "Catamarca",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6e2c",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6e2d",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e2e",
                                        "IdSeccion": 2,
                                        "Seccion": "Capayán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e2f",
                                        "IdSeccion": 3,
                                        "Seccion": "La Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e30",
                                        "IdSeccion": 4,
                                        "Seccion": "Ancasti"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e31",
                                        "IdSeccion": 5,
                                        "Seccion": "El Alto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e32",
                                        "IdSeccion": 6,
                                        "Seccion": "Santa Rosa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e33",
                                        "IdSeccion": 7,
                                        "Seccion": "Paclín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e34",
                                        "IdSeccion": 8,
                                        "Seccion": "Valle Viejo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e35",
                                        "IdSeccion": 9,
                                        "Seccion": "Fray Mamerto Esquiú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e36",
                                        "IdSeccion": 10,
                                        "Seccion": "Ambato"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e37",
                                        "IdSeccion": 11,
                                        "Seccion": "Pomán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e38",
                                        "IdSeccion": 12,
                                        "Seccion": "Andalgalá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e39",
                                        "IdSeccion": 13,
                                        "Seccion": "Belén"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e3a",
                                        "IdSeccion": 14,
                                        "Seccion": "Antofagasta de la Sierra"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e3b",
                                        "IdSeccion": 15,
                                        "Seccion": "Tinogasta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e3c",
                                        "IdSeccion": 16,
                                        "Seccion": "Santa María"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6e3d",
                        "IdDistrito": 4,
                        "Distrito": "Córdoba",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6e3e",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6e3f",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e40",
                                        "IdSeccion": 2,
                                        "Seccion": "Calamuchita"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e41",
                                        "IdSeccion": 3,
                                        "Seccion": "Colón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e42",
                                        "IdSeccion": 4,
                                        "Seccion": "Cruz del Eje"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e43",
                                        "IdSeccion": 5,
                                        "Seccion": "General Roca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e44",
                                        "IdSeccion": 6,
                                        "Seccion": "General San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e45",
                                        "IdSeccion": 7,
                                        "Seccion": "Ischilín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e46",
                                        "IdSeccion": 8,
                                        "Seccion": "Juárez Celman"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e47",
                                        "IdSeccion": 9,
                                        "Seccion": "Marcos Juárez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e48",
                                        "IdSeccion": 10,
                                        "Seccion": "Minas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e49",
                                        "IdSeccion": 11,
                                        "Seccion": "Pocho"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e4a",
                                        "IdSeccion": 12,
                                        "Seccion": "Punilla"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e4b",
                                        "IdSeccion": 13,
                                        "Seccion": "Río Cuarto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e4c",
                                        "IdSeccion": 14,
                                        "Seccion": "Río Primero"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e4d",
                                        "IdSeccion": 15,
                                        "Seccion": "Río Seco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e4e",
                                        "IdSeccion": 16,
                                        "Seccion": "Río Segundo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e4f",
                                        "IdSeccion": 17,
                                        "Seccion": "Presidente Roque Sáenz Peña"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e50",
                                        "IdSeccion": 18,
                                        "Seccion": "San Alberto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e51",
                                        "IdSeccion": 19,
                                        "Seccion": "San Javier"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e52",
                                        "IdSeccion": 20,
                                        "Seccion": "San Justo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e53",
                                        "IdSeccion": 21,
                                        "Seccion": "Santa María"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e54",
                                        "IdSeccion": 22,
                                        "Seccion": "Sobremonte"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e55",
                                        "IdSeccion": 23,
                                        "Seccion": "Tercero Arriba"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e56",
                                        "IdSeccion": 24,
                                        "Seccion": "Totoral"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e57",
                                        "IdSeccion": 25,
                                        "Seccion": "Tulumba"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e58",
                                        "IdSeccion": 26,
                                        "Seccion": "Unión"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6e59",
                        "IdDistrito": 5,
                        "Distrito": "Corrientes",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6e5a",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6e5b",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e5c",
                                        "IdSeccion": 2,
                                        "Seccion": "Goya"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e5d",
                                        "IdSeccion": 3,
                                        "Seccion": "Curuzú Cuatiá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e5e",
                                        "IdSeccion": 4,
                                        "Seccion": "Mercedes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e5f",
                                        "IdSeccion": 5,
                                        "Seccion": "Esquina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e60",
                                        "IdSeccion": 6,
                                        "Seccion": "Lavalle"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e61",
                                        "IdSeccion": 7,
                                        "Seccion": "Santo Tomé"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e62",
                                        "IdSeccion": 8,
                                        "Seccion": "Paso de los Libres"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e63",
                                        "IdSeccion": 9,
                                        "Seccion": "Monte Caseros"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e64",
                                        "IdSeccion": 10,
                                        "Seccion": "San Luis del Palmar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e65",
                                        "IdSeccion": 11,
                                        "Seccion": "Bella Vista"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e66",
                                        "IdSeccion": 12,
                                        "Seccion": "Empedrado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e67",
                                        "IdSeccion": 13,
                                        "Seccion": "San Roque"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e68",
                                        "IdSeccion": 14,
                                        "Seccion": "General Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e69",
                                        "IdSeccion": 15,
                                        "Seccion": "Saladas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e6a",
                                        "IdSeccion": 16,
                                        "Seccion": "San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e6b",
                                        "IdSeccion": 17,
                                        "Seccion": "Concepción"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e6c",
                                        "IdSeccion": 18,
                                        "Seccion": "Mburucuyá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e6d",
                                        "IdSeccion": 19,
                                        "Seccion": "Ituzaingó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e6e",
                                        "IdSeccion": 20,
                                        "Seccion": "Sauce"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e6f",
                                        "IdSeccion": 21,
                                        "Seccion": "San Cosme"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e70",
                                        "IdSeccion": 22,
                                        "Seccion": "General Alvear"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e71",
                                        "IdSeccion": 23,
                                        "Seccion": "San Miguel"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e72",
                                        "IdSeccion": 24,
                                        "Seccion": "Itatí"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e73",
                                        "IdSeccion": 25,
                                        "Seccion": "Berón de Astrada"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6e74",
                        "IdDistrito": 6,
                        "Distrito": "Chaco",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6e75",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6e76",
                                        "IdSeccion": 1,
                                        "Seccion": "San Fernando"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e77",
                                        "IdSeccion": 2,
                                        "Seccion": "1º de Mayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e78",
                                        "IdSeccion": 3,
                                        "Seccion": "Libertad"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e79",
                                        "IdSeccion": 4,
                                        "Seccion": "General Donovan"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e7a",
                                        "IdSeccion": 5,
                                        "Seccion": "Sargento Cabral"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e7b",
                                        "IdSeccion": 6,
                                        "Seccion": "Presidencia de la Plaza"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e7c",
                                        "IdSeccion": 7,
                                        "Seccion": "Bermejo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e7d",
                                        "IdSeccion": 8,
                                        "Seccion": "Libertador General San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e7e",
                                        "IdSeccion": 9,
                                        "Seccion": "Tapenagá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e7f",
                                        "IdSeccion": 10,
                                        "Seccion": "San Lorenzo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e80",
                                        "IdSeccion": 11,
                                        "Seccion": "Mayor Luis J. Fontana"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e81",
                                        "IdSeccion": 12,
                                        "Seccion": "O'Higgins"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e82",
                                        "IdSeccion": 13,
                                        "Seccion": "Comandante Fernández"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e83",
                                        "IdSeccion": 14,
                                        "Seccion": "Quitilipi"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e84",
                                        "IdSeccion": 15,
                                        "Seccion": "25 de Mayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e85",
                                        "IdSeccion": 16,
                                        "Seccion": "Maipú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e86",
                                        "IdSeccion": 17,
                                        "Seccion": "Independencia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e87",
                                        "IdSeccion": 18,
                                        "Seccion": "General Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e88",
                                        "IdSeccion": 19,
                                        "Seccion": "9 de Julio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e89",
                                        "IdSeccion": 20,
                                        "Seccion": "Chacabuco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e8a",
                                        "IdSeccion": 21,
                                        "Seccion": "12 de Octubre"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e8b",
                                        "IdSeccion": 22,
                                        "Seccion": "2 de Abril"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e8c",
                                        "IdSeccion": 23,
                                        "Seccion": "Fray Justo Santa María de Oro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e8d",
                                        "IdSeccion": 24,
                                        "Seccion": "Almirante Brown"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e8e",
                                        "IdSeccion": 25,
                                        "Seccion": "General Güemes"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6e8f",
                        "IdDistrito": 7,
                        "Distrito": "Chubut",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6e90",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6e91",
                                        "IdSeccion": 1,
                                        "Seccion": "Rawson"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e92",
                                        "IdSeccion": 2,
                                        "Seccion": "Biedma"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e93",
                                        "IdSeccion": 3,
                                        "Seccion": "Telsen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e94",
                                        "IdSeccion": 4,
                                        "Seccion": "Gastre"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e95",
                                        "IdSeccion": 5,
                                        "Seccion": "Cushamen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e96",
                                        "IdSeccion": 6,
                                        "Seccion": "Futaleufú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e97",
                                        "IdSeccion": 7,
                                        "Seccion": "Languiñeo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e98",
                                        "IdSeccion": 8,
                                        "Seccion": "Tehuelches"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e99",
                                        "IdSeccion": 9,
                                        "Seccion": "Paso de Indios"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e9a",
                                        "IdSeccion": 10,
                                        "Seccion": "Mártires"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e9b",
                                        "IdSeccion": 11,
                                        "Seccion": "Florentino Ameghino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e9c",
                                        "IdSeccion": 12,
                                        "Seccion": "Gaiman"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e9d",
                                        "IdSeccion": 13,
                                        "Seccion": "Río Senguer"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e9e",
                                        "IdSeccion": 14,
                                        "Seccion": "Sarmiento"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6e9f",
                                        "IdSeccion": 15,
                                        "Seccion": "Escalante"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6ea0",
                        "IdDistrito": 8,
                        "Distrito": "Entre Ríos",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6ea1",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6ea2",
                                        "IdSeccion": 1,
                                        "Seccion": "Paraná"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ea3",
                                        "IdSeccion": 3,
                                        "Seccion": "La Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ea4",
                                        "IdSeccion": 4,
                                        "Seccion": "Diamante"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ea5",
                                        "IdSeccion": 5,
                                        "Seccion": "Victoria"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ea6",
                                        "IdSeccion": 6,
                                        "Seccion": "Nogoyá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ea7",
                                        "IdSeccion": 7,
                                        "Seccion": "Gualeguay"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ea8",
                                        "IdSeccion": 8,
                                        "Seccion": "Tala"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ea9",
                                        "IdSeccion": 9,
                                        "Seccion": "Uruguay"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6eaa",
                                        "IdSeccion": 10,
                                        "Seccion": "Gualeguaychú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6eab",
                                        "IdSeccion": 11,
                                        "Seccion": "Islas del Ibicuy"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6eac",
                                        "IdSeccion": 12,
                                        "Seccion": "Villaguay"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ead",
                                        "IdSeccion": 13,
                                        "Seccion": "Concordia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6eae",
                                        "IdSeccion": 14,
                                        "Seccion": "Federal"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6eaf",
                                        "IdSeccion": 15,
                                        "Seccion": "Colón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6eb0",
                                        "IdSeccion": 16,
                                        "Seccion": "Feliciano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6eb1",
                                        "IdSeccion": 17,
                                        "Seccion": "Federación"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6eb2",
                                        "IdSeccion": 18,
                                        "Seccion": "San Salvador"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6eb3",
                        "IdDistrito": 9,
                        "Distrito": "Formosa",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6eb4",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6eb5",
                                        "IdSeccion": 1,
                                        "Seccion": "Formosa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6eb6",
                                        "IdSeccion": 2,
                                        "Seccion": "Laishí"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6eb7",
                                        "IdSeccion": 3,
                                        "Seccion": "Pilcomayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6eb8",
                                        "IdSeccion": 4,
                                        "Seccion": "Pirané"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6eb9",
                                        "IdSeccion": 5,
                                        "Seccion": "Pilagás"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6eba",
                                        "IdSeccion": 6,
                                        "Seccion": "Patiño"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ebb",
                                        "IdSeccion": 7,
                                        "Seccion": "Bermejo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ebc",
                                        "IdSeccion": 8,
                                        "Seccion": "Matacos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ebd",
                                        "IdSeccion": 9,
                                        "Seccion": "Ramón Lista"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6ebe",
                        "IdDistrito": 10,
                        "Distrito": "Jujuy",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6ebf",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6ec0",
                                        "IdSeccion": 1,
                                        "Seccion": "Dr. Manuel Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ec1",
                                        "IdSeccion": 2,
                                        "Seccion": "Palpalá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ec2",
                                        "IdSeccion": 3,
                                        "Seccion": "San Antonio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ec3",
                                        "IdSeccion": 4,
                                        "Seccion": "El Carmen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ec4",
                                        "IdSeccion": 5,
                                        "Seccion": "San Pedro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ec5",
                                        "IdSeccion": 6,
                                        "Seccion": "Santa Bárbara"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ec6",
                                        "IdSeccion": 7,
                                        "Seccion": "Ledesma"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ec7",
                                        "IdSeccion": 8,
                                        "Seccion": "Valle Grande"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ec8",
                                        "IdSeccion": 9,
                                        "Seccion": "Tumbaya"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ec9",
                                        "IdSeccion": 10,
                                        "Seccion": "Tilcara"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6eca",
                                        "IdSeccion": 11,
                                        "Seccion": "Humahuaca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ecb",
                                        "IdSeccion": 12,
                                        "Seccion": "Cochinoca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ecc",
                                        "IdSeccion": 13,
                                        "Seccion": "Rinconada"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ecd",
                                        "IdSeccion": 14,
                                        "Seccion": "Santa Catalina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ece",
                                        "IdSeccion": 15,
                                        "Seccion": "Yavi"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ecf",
                                        "IdSeccion": 16,
                                        "Seccion": "Susques"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6ed0",
                        "IdDistrito": 11,
                        "Distrito": "La Pampa",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6ed1",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6ed2",
                                        "IdSeccion": 1,
                                        "Seccion": "Atreucó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ed3",
                                        "IdSeccion": 2,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ed4",
                                        "IdSeccion": 3,
                                        "Seccion": "Caleu Caleu"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ed5",
                                        "IdSeccion": 4,
                                        "Seccion": "Catriló"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ed6",
                                        "IdSeccion": 5,
                                        "Seccion": "Chalileo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ed7",
                                        "IdSeccion": 6,
                                        "Seccion": "Chapaleufú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ed8",
                                        "IdSeccion": 7,
                                        "Seccion": "Chical Có"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ed9",
                                        "IdSeccion": 8,
                                        "Seccion": "Conhelo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6eda",
                                        "IdSeccion": 9,
                                        "Seccion": "Curacó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6edb",
                                        "IdSeccion": 10,
                                        "Seccion": "Guatraché"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6edc",
                                        "IdSeccion": 11,
                                        "Seccion": "Hucal"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6edd",
                                        "IdSeccion": 12,
                                        "Seccion": "Loventué"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ede",
                                        "IdSeccion": 13,
                                        "Seccion": "Lihuel Calel"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6edf",
                                        "IdSeccion": 14,
                                        "Seccion": "Limay Mahuida"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ee0",
                                        "IdSeccion": 15,
                                        "Seccion": "Maracó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ee1",
                                        "IdSeccion": 16,
                                        "Seccion": "Puelén"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ee2",
                                        "IdSeccion": 17,
                                        "Seccion": "Quemú Quemú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ee3",
                                        "IdSeccion": 18,
                                        "Seccion": "Rancul"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ee4",
                                        "IdSeccion": 19,
                                        "Seccion": "Realicó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ee5",
                                        "IdSeccion": 20,
                                        "Seccion": "Toay"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ee6",
                                        "IdSeccion": 21,
                                        "Seccion": "Trenel"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ee7",
                                        "IdSeccion": 22,
                                        "Seccion": "Utracán"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6ee8",
                        "IdDistrito": 12,
                        "Distrito": "La Rioja",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6ee9",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6eea",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6eeb",
                                        "IdSeccion": 2,
                                        "Seccion": "Sanagasta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6eec",
                                        "IdSeccion": 3,
                                        "Seccion": "Castro Barros"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6eed",
                                        "IdSeccion": 4,
                                        "Seccion": "Arauco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6eee",
                                        "IdSeccion": 5,
                                        "Seccion": "San Blas de los Sauces"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6eef",
                                        "IdSeccion": 6,
                                        "Seccion": "Chilecito"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ef0",
                                        "IdSeccion": 7,
                                        "Seccion": "Famatina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ef1",
                                        "IdSeccion": 8,
                                        "Seccion": "Coronel Felipe Varela"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ef2",
                                        "IdSeccion": 9,
                                        "Seccion": "General Lamadrid"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ef3",
                                        "IdSeccion": 10,
                                        "Seccion": "Vinchina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ef4",
                                        "IdSeccion": 11,
                                        "Seccion": "Independencia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ef5",
                                        "IdSeccion": 12,
                                        "Seccion": "Chamical"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ef6",
                                        "IdSeccion": 13,
                                        "Seccion": "Ángel Vicente Peñaloza"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ef7",
                                        "IdSeccion": 14,
                                        "Seccion": "General Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ef8",
                                        "IdSeccion": 15,
                                        "Seccion": "General Juan Facundo Quiroga"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ef9",
                                        "IdSeccion": 16,
                                        "Seccion": "General Ortiz de Ocampo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6efa",
                                        "IdSeccion": 17,
                                        "Seccion": "Rosario Vera Peñaloza"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6efb",
                                        "IdSeccion": 18,
                                        "Seccion": "General San Martín"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6efc",
                        "IdDistrito": 13,
                        "Distrito": "Mendoza",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6efd",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6efe",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6eff",
                                        "IdSeccion": 2,
                                        "Seccion": "Godoy Cruz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f00",
                                        "IdSeccion": 3,
                                        "Seccion": "Guaymallén"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f01",
                                        "IdSeccion": 4,
                                        "Seccion": "Las Heras"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f02",
                                        "IdSeccion": 5,
                                        "Seccion": "Lavalle"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f03",
                                        "IdSeccion": 6,
                                        "Seccion": "Maipú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f04",
                                        "IdSeccion": 7,
                                        "Seccion": "Luján de Cuyo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f05",
                                        "IdSeccion": 8,
                                        "Seccion": "Tupungato"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f06",
                                        "IdSeccion": 9,
                                        "Seccion": "San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f07",
                                        "IdSeccion": 10,
                                        "Seccion": "Junín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f08",
                                        "IdSeccion": 11,
                                        "Seccion": "Rivadavia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f09",
                                        "IdSeccion": 12,
                                        "Seccion": "Tunuyán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f0a",
                                        "IdSeccion": 13,
                                        "Seccion": "San Carlos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f0b",
                                        "IdSeccion": 14,
                                        "Seccion": "Santa Rosa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f0c",
                                        "IdSeccion": 15,
                                        "Seccion": "La Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f0d",
                                        "IdSeccion": 16,
                                        "Seccion": "San Rafael"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f0e",
                                        "IdSeccion": 17,
                                        "Seccion": "Malargüe"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f0f",
                                        "IdSeccion": 18,
                                        "Seccion": "General Alvear"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6f10",
                        "IdDistrito": 14,
                        "Distrito": "Misiones",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6f11",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6f12",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f13",
                                        "IdSeccion": 2,
                                        "Seccion": "Apóstoles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f14",
                                        "IdSeccion": 3,
                                        "Seccion": "Candelaria"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f15",
                                        "IdSeccion": 4,
                                        "Seccion": "Leandro N. Alem"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f16",
                                        "IdSeccion": 5,
                                        "Seccion": "Concepción"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f17",
                                        "IdSeccion": 6,
                                        "Seccion": "San Javier"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f18",
                                        "IdSeccion": 7,
                                        "Seccion": "San Ignacio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f19",
                                        "IdSeccion": 8,
                                        "Seccion": "Oberá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f1a",
                                        "IdSeccion": 9,
                                        "Seccion": "Libertador General San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f1b",
                                        "IdSeccion": 10,
                                        "Seccion": "Cainguás"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f1c",
                                        "IdSeccion": 11,
                                        "Seccion": "25 de Mayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f1d",
                                        "IdSeccion": 12,
                                        "Seccion": "Montecarlo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f1e",
                                        "IdSeccion": 13,
                                        "Seccion": "Guaraní"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f1f",
                                        "IdSeccion": 14,
                                        "Seccion": "Eldorado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f20",
                                        "IdSeccion": 15,
                                        "Seccion": "San Pedro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f21",
                                        "IdSeccion": 16,
                                        "Seccion": "Iguazú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f22",
                                        "IdSeccion": 17,
                                        "Seccion": "General Manuel Belgrano"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6f23",
                        "IdDistrito": 15,
                        "Distrito": "Neuquén",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6f24",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6f25",
                                        "IdSeccion": 1,
                                        "Seccion": "Confluencia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f26",
                                        "IdSeccion": 2,
                                        "Seccion": "Zapala"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f27",
                                        "IdSeccion": 3,
                                        "Seccion": "Añelo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f28",
                                        "IdSeccion": 4,
                                        "Seccion": "Pehuenches"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f29",
                                        "IdSeccion": 5,
                                        "Seccion": "Chos Malal"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f2a",
                                        "IdSeccion": 6,
                                        "Seccion": "Minas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f2b",
                                        "IdSeccion": 7,
                                        "Seccion": "Ñorquín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f2c",
                                        "IdSeccion": 8,
                                        "Seccion": "Loncopué"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f2d",
                                        "IdSeccion": 9,
                                        "Seccion": "Picunches"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f2e",
                                        "IdSeccion": 10,
                                        "Seccion": "Aluminé"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f2f",
                                        "IdSeccion": 11,
                                        "Seccion": "Catán Lil"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f30",
                                        "IdSeccion": 12,
                                        "Seccion": "Picún Leufú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f31",
                                        "IdSeccion": 13,
                                        "Seccion": "Collón Curá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f32",
                                        "IdSeccion": 14,
                                        "Seccion": "Huiliches"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f33",
                                        "IdSeccion": 15,
                                        "Seccion": "Lácar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f34",
                                        "IdSeccion": 16,
                                        "Seccion": "Los Lagos"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6f35",
                        "IdDistrito": 16,
                        "Distrito": "Río Negro",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6f36",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6f37",
                                        "IdSeccion": 1,
                                        "Seccion": "Adolfo Alsina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f38",
                                        "IdSeccion": 2,
                                        "Seccion": "Conesa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f39",
                                        "IdSeccion": 3,
                                        "Seccion": "San Antonio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f3a",
                                        "IdSeccion": 4,
                                        "Seccion": "Valcheta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f3b",
                                        "IdSeccion": 5,
                                        "Seccion": "9 de Julio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f3c",
                                        "IdSeccion": 6,
                                        "Seccion": "25 de Mayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f3d",
                                        "IdSeccion": 7,
                                        "Seccion": "Ñorquinco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f3e",
                                        "IdSeccion": 8,
                                        "Seccion": "Pilcaniyeu"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f3f",
                                        "IdSeccion": 9,
                                        "Seccion": "Bariloche"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f40",
                                        "IdSeccion": 10,
                                        "Seccion": "Pichi Mahuida"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f41",
                                        "IdSeccion": 11,
                                        "Seccion": "Avellaneda"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f42",
                                        "IdSeccion": 12,
                                        "Seccion": "General Roca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f43",
                                        "IdSeccion": 13,
                                        "Seccion": "El Cuy"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6f44",
                        "IdDistrito": 17,
                        "Distrito": "Salta",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6f45",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6f46",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f47",
                                        "IdSeccion": 2,
                                        "Seccion": "La Caldera"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f48",
                                        "IdSeccion": 3,
                                        "Seccion": "General Güemes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f49",
                                        "IdSeccion": 4,
                                        "Seccion": "Metán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f4a",
                                        "IdSeccion": 5,
                                        "Seccion": "Anta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f4b",
                                        "IdSeccion": 6,
                                        "Seccion": "Rivadavia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f4c",
                                        "IdSeccion": 7,
                                        "Seccion": "Orán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f4d",
                                        "IdSeccion": 8,
                                        "Seccion": "General José de San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f4e",
                                        "IdSeccion": 9,
                                        "Seccion": "Iruya"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f4f",
                                        "IdSeccion": 10,
                                        "Seccion": "Santa Victoria"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f50",
                                        "IdSeccion": 11,
                                        "Seccion": "Cerrillos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f51",
                                        "IdSeccion": 12,
                                        "Seccion": "Chicoana"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f52",
                                        "IdSeccion": 13,
                                        "Seccion": "La Viña"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f53",
                                        "IdSeccion": 14,
                                        "Seccion": "Guachipas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f54",
                                        "IdSeccion": 15,
                                        "Seccion": "Rosario de la Frontera"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f55",
                                        "IdSeccion": 16,
                                        "Seccion": "La Candelaria"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f56",
                                        "IdSeccion": 17,
                                        "Seccion": "Cafayate"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f57",
                                        "IdSeccion": 18,
                                        "Seccion": "San Carlos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f58",
                                        "IdSeccion": 19,
                                        "Seccion": "Molinos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f59",
                                        "IdSeccion": 20,
                                        "Seccion": "Cachi"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f5a",
                                        "IdSeccion": 21,
                                        "Seccion": "Rosario de Lerma"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f5b",
                                        "IdSeccion": 22,
                                        "Seccion": "La Poma"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f5c",
                                        "IdSeccion": 23,
                                        "Seccion": "Los Andes"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6f5d",
                        "IdDistrito": 18,
                        "Distrito": "San Juan",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6f5e",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6f5f",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f60",
                                        "IdSeccion": 2,
                                        "Seccion": "Santa Lucía"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f61",
                                        "IdSeccion": 3,
                                        "Seccion": "Chimbas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f62",
                                        "IdSeccion": 4,
                                        "Seccion": "Rivadavia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f63",
                                        "IdSeccion": 5,
                                        "Seccion": "Zonda"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f64",
                                        "IdSeccion": 6,
                                        "Seccion": "Rawson"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f65",
                                        "IdSeccion": 7,
                                        "Seccion": "9 de Julio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f66",
                                        "IdSeccion": 8,
                                        "Seccion": "San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f67",
                                        "IdSeccion": 9,
                                        "Seccion": "Angaco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f68",
                                        "IdSeccion": 10,
                                        "Seccion": "Albardón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f69",
                                        "IdSeccion": 11,
                                        "Seccion": "Ullum"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f6a",
                                        "IdSeccion": 12,
                                        "Seccion": "Pocito"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f6b",
                                        "IdSeccion": 13,
                                        "Seccion": "Sarmiento"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f6c",
                                        "IdSeccion": 14,
                                        "Seccion": "25 de Mayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f6d",
                                        "IdSeccion": 15,
                                        "Seccion": "Caucete"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f6e",
                                        "IdSeccion": 16,
                                        "Seccion": "Valle Fértil"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f6f",
                                        "IdSeccion": 17,
                                        "Seccion": "Jáchal"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f70",
                                        "IdSeccion": 18,
                                        "Seccion": "Iglesia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f71",
                                        "IdSeccion": 19,
                                        "Seccion": "Calingasta"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6f72",
                        "IdDistrito": 19,
                        "Distrito": "San Luis",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6f73",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6f74",
                                        "IdSeccion": 1,
                                        "Seccion": "Juan Martín de Pueyrredón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f75",
                                        "IdSeccion": 2,
                                        "Seccion": "Coronel Pringles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f76",
                                        "IdSeccion": 3,
                                        "Seccion": "General Pedernera"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f77",
                                        "IdSeccion": 4,
                                        "Seccion": "Chacabuco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f78",
                                        "IdSeccion": 5,
                                        "Seccion": "Libertador General San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f79",
                                        "IdSeccion": 6,
                                        "Seccion": "Junín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f7a",
                                        "IdSeccion": 7,
                                        "Seccion": "Ayacucho"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f7b",
                                        "IdSeccion": 8,
                                        "Seccion": "Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f7c",
                                        "IdSeccion": 9,
                                        "Seccion": "Gobernador Dupuy"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6f7d",
                        "IdDistrito": 20,
                        "Distrito": "Santa Cruz",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6f7e",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6f7f",
                                        "IdSeccion": 1,
                                        "Seccion": "Deseado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f80",
                                        "IdSeccion": 2,
                                        "Seccion": "Lago Buenos Aires"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f81",
                                        "IdSeccion": 3,
                                        "Seccion": "Magallanes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f82",
                                        "IdSeccion": 4,
                                        "Seccion": "Río Chico"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f83",
                                        "IdSeccion": 5,
                                        "Seccion": "Corpen Aike"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f84",
                                        "IdSeccion": 6,
                                        "Seccion": "Lago Argentino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f85",
                                        "IdSeccion": 7,
                                        "Seccion": "Güer Aike"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6f86",
                        "IdDistrito": 21,
                        "Distrito": "Santa Fe",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6f87",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6f88",
                                        "IdSeccion": 1,
                                        "Seccion": "La Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f89",
                                        "IdSeccion": 2,
                                        "Seccion": "Las Colonias"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f8a",
                                        "IdSeccion": 3,
                                        "Seccion": "San Jerónimo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f8b",
                                        "IdSeccion": 4,
                                        "Seccion": "Garay"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f8c",
                                        "IdSeccion": 5,
                                        "Seccion": "Castellanos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f8d",
                                        "IdSeccion": 6,
                                        "Seccion": "San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f8e",
                                        "IdSeccion": 7,
                                        "Seccion": "San Cristóbal"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f8f",
                                        "IdSeccion": 8,
                                        "Seccion": "San Justo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f90",
                                        "IdSeccion": 9,
                                        "Seccion": "General Obligado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f91",
                                        "IdSeccion": 10,
                                        "Seccion": "Vera"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f92",
                                        "IdSeccion": 11,
                                        "Seccion": "San Javier"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f93",
                                        "IdSeccion": 12,
                                        "Seccion": "9 de Julio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f94",
                                        "IdSeccion": 13,
                                        "Seccion": "Rosario"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f95",
                                        "IdSeccion": 14,
                                        "Seccion": "Caseros"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f96",
                                        "IdSeccion": 15,
                                        "Seccion": "Constitución"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f97",
                                        "IdSeccion": 16,
                                        "Seccion": "General López"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f98",
                                        "IdSeccion": 17,
                                        "Seccion": "Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f99",
                                        "IdSeccion": 18,
                                        "Seccion": "Iriondo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f9a",
                                        "IdSeccion": 19,
                                        "Seccion": "San Lorenzo"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6f9b",
                        "IdDistrito": 22,
                        "Distrito": "Santiago del Estero",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6f9c",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6f9d",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f9e",
                                        "IdSeccion": 2,
                                        "Seccion": "Avellaneda"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6f9f",
                                        "IdSeccion": 3,
                                        "Seccion": "Aguirre"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fa0",
                                        "IdSeccion": 4,
                                        "Seccion": "Alberdi"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fa1",
                                        "IdSeccion": 5,
                                        "Seccion": "Atamisqui"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fa2",
                                        "IdSeccion": 6,
                                        "Seccion": "Banda"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fa3",
                                        "IdSeccion": 7,
                                        "Seccion": "Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fa4",
                                        "IdSeccion": 8,
                                        "Seccion": "Copo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fa5",
                                        "IdSeccion": 9,
                                        "Seccion": "Choya"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fa6",
                                        "IdSeccion": 10,
                                        "Seccion": "Figueroa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fa7",
                                        "IdSeccion": 11,
                                        "Seccion": "Guasayán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fa8",
                                        "IdSeccion": 12,
                                        "Seccion": "Jiménez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fa9",
                                        "IdSeccion": 13,
                                        "Seccion": "Loreto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6faa",
                                        "IdSeccion": 14,
                                        "Seccion": "Juan F. Ibarra"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fab",
                                        "IdSeccion": 15,
                                        "Seccion": "Mitre"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fac",
                                        "IdSeccion": 16,
                                        "Seccion": "Moreno"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fad",
                                        "IdSeccion": 17,
                                        "Seccion": "Ojo de Agua"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fae",
                                        "IdSeccion": 18,
                                        "Seccion": "Pellegrini"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6faf",
                                        "IdSeccion": 19,
                                        "Seccion": "Quebrachos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fb0",
                                        "IdSeccion": 20,
                                        "Seccion": "Rivadavia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fb1",
                                        "IdSeccion": 21,
                                        "Seccion": "Robles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fb2",
                                        "IdSeccion": 22,
                                        "Seccion": "Río Hondo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fb3",
                                        "IdSeccion": 23,
                                        "Seccion": "Silípica"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fb4",
                                        "IdSeccion": 24,
                                        "Seccion": "San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fb5",
                                        "IdSeccion": 25,
                                        "Seccion": "Salavina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fb6",
                                        "IdSeccion": 26,
                                        "Seccion": "Sarmiento"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fb7",
                                        "IdSeccion": 27,
                                        "Seccion": "General Taboada"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6fb8",
                        "IdDistrito": 23,
                        "Distrito": "Tucumán",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6fb9",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6fba",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fbb",
                                        "IdSeccion": 2,
                                        "Seccion": "Lules"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fbc",
                                        "IdSeccion": 3,
                                        "Seccion": "Famaillá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fbd",
                                        "IdSeccion": 4,
                                        "Seccion": "Monteros"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fbe",
                                        "IdSeccion": 5,
                                        "Seccion": "Chicligasta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fbf",
                                        "IdSeccion": 6,
                                        "Seccion": "Río Chico"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fc0",
                                        "IdSeccion": 7,
                                        "Seccion": "Juan Bautista Alberdi"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fc1",
                                        "IdSeccion": 8,
                                        "Seccion": "La Cocha"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fc2",
                                        "IdSeccion": 9,
                                        "Seccion": "Graneros"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fc3",
                                        "IdSeccion": 10,
                                        "Seccion": "Simoca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fc4",
                                        "IdSeccion": 11,
                                        "Seccion": "Leales"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fc5",
                                        "IdSeccion": 12,
                                        "Seccion": "Cruz Alta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fc6",
                                        "IdSeccion": 13,
                                        "Seccion": "Burruyacú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fc7",
                                        "IdSeccion": 14,
                                        "Seccion": "Trancas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fc8",
                                        "IdSeccion": 15,
                                        "Seccion": "Yerba Buena"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fc9",
                                        "IdSeccion": 16,
                                        "Seccion": "Tafí Viejo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fca",
                                        "IdSeccion": 17,
                                        "Seccion": "Tafí del Valle"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6fcb",
                        "IdDistrito": 24,
                        "Distrito": "Tierra del Fuego, Antártida e Islas del Atlántico Sur",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6fcc",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6fcd",
                                        "IdSeccion": 1,
                                        "Seccion": "Ushuaia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fce",
                                        "IdSeccion": 2,
                                        "Seccion": "Río Grande"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fcf",
                                        "IdSeccion": 3,
                                        "Seccion": "Antártida Argentina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fd0",
                                        "IdSeccion": 5,
                                        "Seccion": "Tolhuin"
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                "_id": "66134fd690a68119101b6fd1",
                "IdCargo": "4",
                "Cargo": "GOBERNADOR/A - JEFE/A DE GOBIERNO",
                "Distritos": [
                    {
                        "_id": "66134fd690a68119101b6fd2",
                        "IdDistrito": 1,
                        "Distrito": "Ciudad Autónoma de Buenos Aires",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6fd3",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6fd4",
                                        "IdSeccion": 1,
                                        "Seccion": "Comuna 01"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fd5",
                                        "IdSeccion": 2,
                                        "Seccion": "Comuna 02"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fd6",
                                        "IdSeccion": 3,
                                        "Seccion": "Comuna 03"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fd7",
                                        "IdSeccion": 4,
                                        "Seccion": "Comuna 04"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fd8",
                                        "IdSeccion": 5,
                                        "Seccion": "Comuna 05"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fd9",
                                        "IdSeccion": 6,
                                        "Seccion": "Comuna 06"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fda",
                                        "IdSeccion": 7,
                                        "Seccion": "Comuna 07"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fdb",
                                        "IdSeccion": 8,
                                        "Seccion": "Comuna 08"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fdc",
                                        "IdSeccion": 9,
                                        "Seccion": "Comuna 09"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fdd",
                                        "IdSeccion": 10,
                                        "Seccion": "Comuna 10"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fde",
                                        "IdSeccion": 11,
                                        "Seccion": "Comuna 11"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fdf",
                                        "IdSeccion": 12,
                                        "Seccion": "Comuna 12"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fe0",
                                        "IdSeccion": 13,
                                        "Seccion": "Comuna 13"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fe1",
                                        "IdSeccion": 14,
                                        "Seccion": "Comuna 14"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fe2",
                                        "IdSeccion": 15,
                                        "Seccion": "Comuna 15"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b6fe3",
                        "IdDistrito": 2,
                        "Distrito": "Buenos Aires",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b6fe4",
                                "IDSeccionProvincial": 1,
                                "SeccionProvincial": "Sección Primera",
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6fe5",
                                        "IdSeccion": 16,
                                        "Seccion": "Campana"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fe6",
                                        "IdSeccion": 35,
                                        "Seccion": "Escobar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fe7",
                                        "IdSeccion": 45,
                                        "Seccion": "General Las Heras"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fe8",
                                        "IdSeccion": 51,
                                        "Seccion": "General Rodríguez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fe9",
                                        "IdSeccion": 52,
                                        "Seccion": "General San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fea",
                                        "IdSeccion": 53,
                                        "Seccion": "San Miguel"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6feb",
                                        "IdSeccion": 71,
                                        "Seccion": "Luján"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fec",
                                        "IdSeccion": 75,
                                        "Seccion": "Marcos Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fed",
                                        "IdSeccion": 76,
                                        "Seccion": "Mercedes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fee",
                                        "IdSeccion": 77,
                                        "Seccion": "Merlo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fef",
                                        "IdSeccion": 79,
                                        "Seccion": "Moreno"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ff0",
                                        "IdSeccion": 80,
                                        "Seccion": "Morón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ff1",
                                        "IdSeccion": 81,
                                        "Seccion": "Navarro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ff2",
                                        "IdSeccion": 89,
                                        "Seccion": "Pilar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ff3",
                                        "IdSeccion": 105,
                                        "Seccion": "San Fernando"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ff4",
                                        "IdSeccion": 106,
                                        "Seccion": "San Isidro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ff5",
                                        "IdSeccion": 110,
                                        "Seccion": "Suipacha"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ff6",
                                        "IdSeccion": 113,
                                        "Seccion": "Tigre"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ff7",
                                        "IdSeccion": 118,
                                        "Seccion": "Tres de Febrero"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ff8",
                                        "IdSeccion": 122,
                                        "Seccion": "Vicente López"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ff9",
                                        "IdSeccion": 129,
                                        "Seccion": "José C. Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ffa",
                                        "IdSeccion": 130,
                                        "Seccion": "Malvinas Argentinas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ffb",
                                        "IdSeccion": 133,
                                        "Seccion": "Ituzaingó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6ffc",
                                        "IdSeccion": 134,
                                        "Seccion": "Hurlingham"
                                    }
                                ]
                            },
                            {
                                "_id": "66134fd690a68119101b6ffd",
                                "IDSeccionProvincial": 2,
                                "SeccionProvincial": "Sección Segunda",
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b6ffe",
                                        "IdSeccion": 9,
                                        "Seccion": "Baradero"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b6fff",
                                        "IdSeccion": 10,
                                        "Seccion": "Arrecifes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7000",
                                        "IdSeccion": 18,
                                        "Seccion": "Capitán Sarmiento"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7001",
                                        "IdSeccion": 21,
                                        "Seccion": "Carmen de Areco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7002",
                                        "IdSeccion": 24,
                                        "Seccion": "Colón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7003",
                                        "IdSeccion": 37,
                                        "Seccion": "Exaltación de la Cruz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7004",
                                        "IdSeccion": 87,
                                        "Seccion": "Pergamino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7005",
                                        "IdSeccion": 93,
                                        "Seccion": "Ramallo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7006",
                                        "IdSeccion": 96,
                                        "Seccion": "Rojas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7007",
                                        "IdSeccion": 101,
                                        "Seccion": "Salto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7008",
                                        "IdSeccion": 102,
                                        "Seccion": "San Andrés de Giles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7009",
                                        "IdSeccion": 103,
                                        "Seccion": "San Antonio de Areco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b700a",
                                        "IdSeccion": 107,
                                        "Seccion": "San Nicolás"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b700b",
                                        "IdSeccion": 108,
                                        "Seccion": "San Pedro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b700c",
                                        "IdSeccion": 125,
                                        "Seccion": "Zárate"
                                    }
                                ]
                            },
                            {
                                "_id": "66134fd690a68119101b700d",
                                "IDSeccionProvincial": 3,
                                "SeccionProvincial": "Sección Tercera",
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b700e",
                                        "IdSeccion": 3,
                                        "Seccion": "Almirante Brown"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b700f",
                                        "IdSeccion": 4,
                                        "Seccion": "Avellaneda"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7010",
                                        "IdSeccion": 11,
                                        "Seccion": "Berazategui"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7011",
                                        "IdSeccion": 12,
                                        "Seccion": "Berisso"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7012",
                                        "IdSeccion": 15,
                                        "Seccion": "Brandsen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7013",
                                        "IdSeccion": 17,
                                        "Seccion": "Cañuelas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7014",
                                        "IdSeccion": 34,
                                        "Seccion": "Ensenada"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7015",
                                        "IdSeccion": 36,
                                        "Seccion": "Esteban Echeverría"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7016",
                                        "IdSeccion": 38,
                                        "Seccion": "Florencio Varela"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7017",
                                        "IdSeccion": 61,
                                        "Seccion": "La Matanza"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7018",
                                        "IdSeccion": 62,
                                        "Seccion": "Lanús"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7019",
                                        "IdSeccion": 69,
                                        "Seccion": "Lobos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b701a",
                                        "IdSeccion": 70,
                                        "Seccion": "Lomas de Zamora"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b701b",
                                        "IdSeccion": 72,
                                        "Seccion": "Magdalena"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b701c",
                                        "IdSeccion": 92,
                                        "Seccion": "Quilmes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b701d",
                                        "IdSeccion": 109,
                                        "Seccion": "San Vicente"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b701e",
                                        "IdSeccion": 128,
                                        "Seccion": "Presidente Perón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b701f",
                                        "IdSeccion": 131,
                                        "Seccion": "Punta Indio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7020",
                                        "IdSeccion": 132,
                                        "Seccion": "Ezeiza"
                                    }
                                ]
                            },
                            {
                                "_id": "66134fd690a68119101b7021",
                                "IDSeccionProvincial": 4,
                                "SeccionProvincial": "Sección Cuarta",
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7022",
                                        "IdSeccion": 2,
                                        "Seccion": "Alberti"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7023",
                                        "IdSeccion": 14,
                                        "Seccion": "Bragado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7024",
                                        "IdSeccion": 19,
                                        "Seccion": "Carlos Casares"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7025",
                                        "IdSeccion": 20,
                                        "Seccion": "Carlos Tejedor"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7026",
                                        "IdSeccion": 29,
                                        "Seccion": "Chacabuco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7027",
                                        "IdSeccion": 31,
                                        "Seccion": "Chivilcoy"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7028",
                                        "IdSeccion": 41,
                                        "Seccion": "General Arenales"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7029",
                                        "IdSeccion": 49,
                                        "Seccion": "General Pinto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b702a",
                                        "IdSeccion": 54,
                                        "Seccion": "General Viamonte"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b702b",
                                        "IdSeccion": 55,
                                        "Seccion": "General Villegas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b702c",
                                        "IdSeccion": 58,
                                        "Seccion": "Hipólito Yrigoyen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b702d",
                                        "IdSeccion": 60,
                                        "Seccion": "Junín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b702e",
                                        "IdSeccion": 66,
                                        "Seccion": "Leandro N. Alem"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b702f",
                                        "IdSeccion": 67,
                                        "Seccion": "Lincoln"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7030",
                                        "IdSeccion": 83,
                                        "Seccion": "9 de Julio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7031",
                                        "IdSeccion": 85,
                                        "Seccion": "Pehuajó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7032",
                                        "IdSeccion": 95,
                                        "Seccion": "Rivadavia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7033",
                                        "IdSeccion": 115,
                                        "Seccion": "Trenque Lauquen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7034",
                                        "IdSeccion": 127,
                                        "Seccion": "Florentino Ameghino"
                                    }
                                ]
                            },
                            {
                                "_id": "66134fd690a68119101b7035",
                                "IDSeccionProvincial": 5,
                                "SeccionProvincial": "Sección Quinta",
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7036",
                                        "IdSeccion": 5,
                                        "Seccion": "Ayacucho"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7037",
                                        "IdSeccion": 8,
                                        "Seccion": "Balcarce"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7038",
                                        "IdSeccion": 23,
                                        "Seccion": "Castelli"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7039",
                                        "IdSeccion": 30,
                                        "Seccion": "Chascomús"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b703a",
                                        "IdSeccion": 33,
                                        "Seccion": "Dolores"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b703b",
                                        "IdSeccion": 39,
                                        "Seccion": "General Alvarado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b703c",
                                        "IdSeccion": 42,
                                        "Seccion": "General Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b703d",
                                        "IdSeccion": 43,
                                        "Seccion": "General Guido"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b703e",
                                        "IdSeccion": 46,
                                        "Seccion": "General Lavalle"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b703f",
                                        "IdSeccion": 47,
                                        "Seccion": "General Juan Madariaga"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7040",
                                        "IdSeccion": 48,
                                        "Seccion": "General Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7041",
                                        "IdSeccion": 50,
                                        "Seccion": "General Pueyrredón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7042",
                                        "IdSeccion": 65,
                                        "Seccion": "Las Flores"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7043",
                                        "IdSeccion": 68,
                                        "Seccion": "Lobería"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7044",
                                        "IdSeccion": 73,
                                        "Seccion": "Maipú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7045",
                                        "IdSeccion": 74,
                                        "Seccion": "Mar Chiquita"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7046",
                                        "IdSeccion": 78,
                                        "Seccion": "Monte"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7047",
                                        "IdSeccion": 82,
                                        "Seccion": "Necochea"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7048",
                                        "IdSeccion": 88,
                                        "Seccion": "Pila"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7049",
                                        "IdSeccion": 90,
                                        "Seccion": "Pinamar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b704a",
                                        "IdSeccion": 94,
                                        "Seccion": "Rauch"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b704b",
                                        "IdSeccion": 104,
                                        "Seccion": "San Cayetano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b704c",
                                        "IdSeccion": 111,
                                        "Seccion": "Tandil"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b704d",
                                        "IdSeccion": 116,
                                        "Seccion": "Tordillo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b704e",
                                        "IdSeccion": 119,
                                        "Seccion": "La Costa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b704f",
                                        "IdSeccion": 123,
                                        "Seccion": "Villa Gesell"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7050",
                                        "IdSeccion": 135,
                                        "Seccion": "Lezama"
                                    }
                                ]
                            },
                            {
                                "_id": "66134fd690a68119101b7051",
                                "IDSeccionProvincial": 6,
                                "SeccionProvincial": "Sección Sexta",
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7052",
                                        "IdSeccion": 1,
                                        "Seccion": "Adolfo Alsina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7053",
                                        "IdSeccion": 7,
                                        "Seccion": "Bahía Blanca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7054",
                                        "IdSeccion": 22,
                                        "Seccion": "Patagones"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7055",
                                        "IdSeccion": 25,
                                        "Seccion": "Coronel Dorrego"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7056",
                                        "IdSeccion": 26,
                                        "Seccion": "Coronel Pringles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7057",
                                        "IdSeccion": 27,
                                        "Seccion": "Coronel de Marina L. Rosales"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7058",
                                        "IdSeccion": 28,
                                        "Seccion": "Coronel Suárez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7059",
                                        "IdSeccion": 32,
                                        "Seccion": "Daireaux"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b705a",
                                        "IdSeccion": 44,
                                        "Seccion": "General La Madrid"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b705b",
                                        "IdSeccion": 56,
                                        "Seccion": "Adolfo Gonzales Chaves"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b705c",
                                        "IdSeccion": 57,
                                        "Seccion": "Guaminí"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b705d",
                                        "IdSeccion": 59,
                                        "Seccion": "Benito Juárez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b705e",
                                        "IdSeccion": 64,
                                        "Seccion": "Laprida"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b705f",
                                        "IdSeccion": 86,
                                        "Seccion": "Pellegrini"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7060",
                                        "IdSeccion": 91,
                                        "Seccion": "Puan"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7061",
                                        "IdSeccion": 98,
                                        "Seccion": "Saavedra"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7062",
                                        "IdSeccion": 100,
                                        "Seccion": "Salliqueló"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7063",
                                        "IdSeccion": 114,
                                        "Seccion": "Tornquist"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7064",
                                        "IdSeccion": 117,
                                        "Seccion": "Tres Arroyos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7065",
                                        "IdSeccion": 120,
                                        "Seccion": "Monte Hermoso"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7066",
                                        "IdSeccion": 124,
                                        "Seccion": "Villarino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7067",
                                        "IdSeccion": 126,
                                        "Seccion": "Tres Lomas"
                                    }
                                ]
                            },
                            {
                                "_id": "66134fd690a68119101b7068",
                                "IDSeccionProvincial": 7,
                                "SeccionProvincial": "Sección Séptima",
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7069",
                                        "IdSeccion": 6,
                                        "Seccion": "Azul"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b706a",
                                        "IdSeccion": 13,
                                        "Seccion": "Bolívar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b706b",
                                        "IdSeccion": 40,
                                        "Seccion": "General Alvear"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b706c",
                                        "IdSeccion": 84,
                                        "Seccion": "Olavarría"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b706d",
                                        "IdSeccion": 97,
                                        "Seccion": "Roque Pérez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b706e",
                                        "IdSeccion": 99,
                                        "Seccion": "Saladillo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b706f",
                                        "IdSeccion": 112,
                                        "Seccion": "Tapalqué"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7070",
                                        "IdSeccion": 121,
                                        "Seccion": "25 de Mayo"
                                    }
                                ]
                            },
                            {
                                "_id": "66134fd690a68119101b7071",
                                "IDSeccionProvincial": 8,
                                "SeccionProvincial": "Sección Capital",
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7072",
                                        "IdSeccion": 63,
                                        "Seccion": "La Plata"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b7073",
                        "IdDistrito": 3,
                        "Distrito": "Catamarca",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b7074",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7075",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7076",
                                        "IdSeccion": 2,
                                        "Seccion": "Capayán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7077",
                                        "IdSeccion": 3,
                                        "Seccion": "La Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7078",
                                        "IdSeccion": 4,
                                        "Seccion": "Ancasti"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7079",
                                        "IdSeccion": 5,
                                        "Seccion": "El Alto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b707a",
                                        "IdSeccion": 6,
                                        "Seccion": "Santa Rosa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b707b",
                                        "IdSeccion": 7,
                                        "Seccion": "Paclín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b707c",
                                        "IdSeccion": 8,
                                        "Seccion": "Valle Viejo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b707d",
                                        "IdSeccion": 9,
                                        "Seccion": "Fray Mamerto Esquiú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b707e",
                                        "IdSeccion": 10,
                                        "Seccion": "Ambato"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b707f",
                                        "IdSeccion": 11,
                                        "Seccion": "Pomán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7080",
                                        "IdSeccion": 12,
                                        "Seccion": "Andalgalá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7081",
                                        "IdSeccion": 13,
                                        "Seccion": "Belén"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7082",
                                        "IdSeccion": 14,
                                        "Seccion": "Antofagasta de la Sierra"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7083",
                                        "IdSeccion": 15,
                                        "Seccion": "Tinogasta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7084",
                                        "IdSeccion": 16,
                                        "Seccion": "Santa María"
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                "_id": "66134fd690a68119101b7085",
                "IdCargo": "5",
                "Cargo": "SENADORES/AS PROVINCIALES",
                "Distritos": [
                    {
                        "_id": "66134fd690a68119101b7086",
                        "IdDistrito": 2,
                        "Distrito": "Buenos Aires",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b7087",
                                "IDSeccionProvincial": 2,
                                "SeccionProvincial": "Sección Segunda",
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7088",
                                        "IdSeccion": 9,
                                        "Seccion": "Baradero"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7089",
                                        "IdSeccion": 10,
                                        "Seccion": "Arrecifes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b708a",
                                        "IdSeccion": 18,
                                        "Seccion": "Capitán Sarmiento"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b708b",
                                        "IdSeccion": 21,
                                        "Seccion": "Carmen de Areco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b708c",
                                        "IdSeccion": 24,
                                        "Seccion": "Colón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b708d",
                                        "IdSeccion": 37,
                                        "Seccion": "Exaltación de la Cruz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b708e",
                                        "IdSeccion": 87,
                                        "Seccion": "Pergamino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b708f",
                                        "IdSeccion": 93,
                                        "Seccion": "Ramallo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7090",
                                        "IdSeccion": 96,
                                        "Seccion": "Rojas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7091",
                                        "IdSeccion": 101,
                                        "Seccion": "Salto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7092",
                                        "IdSeccion": 102,
                                        "Seccion": "San Andrés de Giles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7093",
                                        "IdSeccion": 103,
                                        "Seccion": "San Antonio de Areco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7094",
                                        "IdSeccion": 107,
                                        "Seccion": "San Nicolás"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7095",
                                        "IdSeccion": 108,
                                        "Seccion": "San Pedro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7096",
                                        "IdSeccion": 125,
                                        "Seccion": "Zárate"
                                    }
                                ]
                            },
                            {
                                "_id": "66134fd690a68119101b7097",
                                "IDSeccionProvincial": 3,
                                "SeccionProvincial": "Sección Tercera",
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7098",
                                        "IdSeccion": 3,
                                        "Seccion": "Almirante Brown"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7099",
                                        "IdSeccion": 4,
                                        "Seccion": "Avellaneda"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b709a",
                                        "IdSeccion": 11,
                                        "Seccion": "Berazategui"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b709b",
                                        "IdSeccion": 12,
                                        "Seccion": "Berisso"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b709c",
                                        "IdSeccion": 15,
                                        "Seccion": "Brandsen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b709d",
                                        "IdSeccion": 17,
                                        "Seccion": "Cañuelas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b709e",
                                        "IdSeccion": 34,
                                        "Seccion": "Ensenada"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b709f",
                                        "IdSeccion": 36,
                                        "Seccion": "Esteban Echeverría"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70a0",
                                        "IdSeccion": 38,
                                        "Seccion": "Florencio Varela"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70a1",
                                        "IdSeccion": 61,
                                        "Seccion": "La Matanza"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70a2",
                                        "IdSeccion": 62,
                                        "Seccion": "Lanús"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70a3",
                                        "IdSeccion": 69,
                                        "Seccion": "Lobos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70a4",
                                        "IdSeccion": 70,
                                        "Seccion": "Lomas de Zamora"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70a5",
                                        "IdSeccion": 72,
                                        "Seccion": "Magdalena"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70a6",
                                        "IdSeccion": 92,
                                        "Seccion": "Quilmes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70a7",
                                        "IdSeccion": 109,
                                        "Seccion": "San Vicente"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70a8",
                                        "IdSeccion": 128,
                                        "Seccion": "Presidente Perón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70a9",
                                        "IdSeccion": 131,
                                        "Seccion": "Punta Indio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70aa",
                                        "IdSeccion": 132,
                                        "Seccion": "Ezeiza"
                                    }
                                ]
                            },
                            {
                                "_id": "66134fd690a68119101b70ab",
                                "IDSeccionProvincial": 6,
                                "SeccionProvincial": "Sección Sexta",
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b70ac",
                                        "IdSeccion": 1,
                                        "Seccion": "Adolfo Alsina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70ad",
                                        "IdSeccion": 7,
                                        "Seccion": "Bahía Blanca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70ae",
                                        "IdSeccion": 22,
                                        "Seccion": "Patagones"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70af",
                                        "IdSeccion": 25,
                                        "Seccion": "Coronel Dorrego"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70b0",
                                        "IdSeccion": 26,
                                        "Seccion": "Coronel Pringles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70b1",
                                        "IdSeccion": 27,
                                        "Seccion": "Coronel de Marina L. Rosales"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70b2",
                                        "IdSeccion": 28,
                                        "Seccion": "Coronel Suárez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70b3",
                                        "IdSeccion": 32,
                                        "Seccion": "Daireaux"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70b4",
                                        "IdSeccion": 44,
                                        "Seccion": "General La Madrid"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70b5",
                                        "IdSeccion": 56,
                                        "Seccion": "Adolfo Gonzales Chaves"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70b6",
                                        "IdSeccion": 57,
                                        "Seccion": "Guaminí"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70b7",
                                        "IdSeccion": 59,
                                        "Seccion": "Benito Juárez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70b8",
                                        "IdSeccion": 64,
                                        "Seccion": "Laprida"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70b9",
                                        "IdSeccion": 86,
                                        "Seccion": "Pellegrini"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70ba",
                                        "IdSeccion": 91,
                                        "Seccion": "Puan"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70bb",
                                        "IdSeccion": 98,
                                        "Seccion": "Saavedra"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70bc",
                                        "IdSeccion": 100,
                                        "Seccion": "Salliqueló"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70bd",
                                        "IdSeccion": 114,
                                        "Seccion": "Tornquist"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70be",
                                        "IdSeccion": 117,
                                        "Seccion": "Tres Arroyos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70bf",
                                        "IdSeccion": 120,
                                        "Seccion": "Monte Hermoso"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70c0",
                                        "IdSeccion": 124,
                                        "Seccion": "Villarino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70c1",
                                        "IdSeccion": 126,
                                        "Seccion": "Tres Lomas"
                                    }
                                ]
                            },
                            {
                                "_id": "66134fd690a68119101b70c2",
                                "IDSeccionProvincial": 8,
                                "SeccionProvincial": "Sección Capital",
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b70c3",
                                        "IdSeccion": 63,
                                        "Seccion": "La Plata"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b70c4",
                        "IdDistrito": 3,
                        "Distrito": "Catamarca",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b70c5",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b70c6",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70c7",
                                        "IdSeccion": 6,
                                        "Seccion": "Santa Rosa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70c8",
                                        "IdSeccion": 8,
                                        "Seccion": "Valle Viejo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70c9",
                                        "IdSeccion": 9,
                                        "Seccion": "Fray Mamerto Esquiú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70ca",
                                        "IdSeccion": 10,
                                        "Seccion": "Ambato"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70cb",
                                        "IdSeccion": 11,
                                        "Seccion": "Pomán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70cc",
                                        "IdSeccion": 12,
                                        "Seccion": "Andalgalá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70cd",
                                        "IdSeccion": 13,
                                        "Seccion": "Belén"
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                "_id": "66134fd690a68119101b70ce",
                "IdCargo": "6",
                "Cargo": "DIPUTADOS/AS PROVINCIALES - DIPUTADOS/AS DE LA CIUDAD",
                "Distritos": [
                    {
                        "_id": "66134fd690a68119101b70cf",
                        "IdDistrito": 1,
                        "Distrito": "Ciudad Autónoma de Buenos Aires",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b70d0",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b70d1",
                                        "IdSeccion": 1,
                                        "Seccion": "Comuna 01"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70d2",
                                        "IdSeccion": 2,
                                        "Seccion": "Comuna 02"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70d3",
                                        "IdSeccion": 3,
                                        "Seccion": "Comuna 03"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70d4",
                                        "IdSeccion": 4,
                                        "Seccion": "Comuna 04"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70d5",
                                        "IdSeccion": 5,
                                        "Seccion": "Comuna 05"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70d6",
                                        "IdSeccion": 6,
                                        "Seccion": "Comuna 06"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70d7",
                                        "IdSeccion": 7,
                                        "Seccion": "Comuna 07"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70d8",
                                        "IdSeccion": 8,
                                        "Seccion": "Comuna 08"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70d9",
                                        "IdSeccion": 9,
                                        "Seccion": "Comuna 09"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70da",
                                        "IdSeccion": 10,
                                        "Seccion": "Comuna 10"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70db",
                                        "IdSeccion": 11,
                                        "Seccion": "Comuna 11"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70dc",
                                        "IdSeccion": 12,
                                        "Seccion": "Comuna 12"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70dd",
                                        "IdSeccion": 13,
                                        "Seccion": "Comuna 13"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70de",
                                        "IdSeccion": 14,
                                        "Seccion": "Comuna 14"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70df",
                                        "IdSeccion": 15,
                                        "Seccion": "Comuna 15"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b70e0",
                        "IdDistrito": 2,
                        "Distrito": "Buenos Aires",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b70e1",
                                "IDSeccionProvincial": 1,
                                "SeccionProvincial": "Sección Primera",
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b70e2",
                                        "IdSeccion": 16,
                                        "Seccion": "Campana"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70e3",
                                        "IdSeccion": 35,
                                        "Seccion": "Escobar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70e4",
                                        "IdSeccion": 45,
                                        "Seccion": "General Las Heras"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70e5",
                                        "IdSeccion": 51,
                                        "Seccion": "General Rodríguez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70e6",
                                        "IdSeccion": 52,
                                        "Seccion": "General San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70e7",
                                        "IdSeccion": 53,
                                        "Seccion": "San Miguel"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70e8",
                                        "IdSeccion": 71,
                                        "Seccion": "Luján"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70e9",
                                        "IdSeccion": 75,
                                        "Seccion": "Marcos Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70ea",
                                        "IdSeccion": 76,
                                        "Seccion": "Mercedes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70eb",
                                        "IdSeccion": 77,
                                        "Seccion": "Merlo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70ec",
                                        "IdSeccion": 79,
                                        "Seccion": "Moreno"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70ed",
                                        "IdSeccion": 80,
                                        "Seccion": "Morón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70ee",
                                        "IdSeccion": 81,
                                        "Seccion": "Navarro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70ef",
                                        "IdSeccion": 89,
                                        "Seccion": "Pilar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70f0",
                                        "IdSeccion": 105,
                                        "Seccion": "San Fernando"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70f1",
                                        "IdSeccion": 106,
                                        "Seccion": "San Isidro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70f2",
                                        "IdSeccion": 110,
                                        "Seccion": "Suipacha"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70f3",
                                        "IdSeccion": 113,
                                        "Seccion": "Tigre"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70f4",
                                        "IdSeccion": 118,
                                        "Seccion": "Tres de Febrero"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70f5",
                                        "IdSeccion": 122,
                                        "Seccion": "Vicente López"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70f6",
                                        "IdSeccion": 129,
                                        "Seccion": "José C. Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70f7",
                                        "IdSeccion": 130,
                                        "Seccion": "Malvinas Argentinas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70f8",
                                        "IdSeccion": 133,
                                        "Seccion": "Ituzaingó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70f9",
                                        "IdSeccion": 134,
                                        "Seccion": "Hurlingham"
                                    }
                                ]
                            },
                            {
                                "_id": "66134fd690a68119101b70fa",
                                "IDSeccionProvincial": 4,
                                "SeccionProvincial": "Sección Cuarta",
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b70fb",
                                        "IdSeccion": 2,
                                        "Seccion": "Alberti"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70fc",
                                        "IdSeccion": 14,
                                        "Seccion": "Bragado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70fd",
                                        "IdSeccion": 19,
                                        "Seccion": "Carlos Casares"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70fe",
                                        "IdSeccion": 20,
                                        "Seccion": "Carlos Tejedor"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b70ff",
                                        "IdSeccion": 29,
                                        "Seccion": "Chacabuco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7100",
                                        "IdSeccion": 31,
                                        "Seccion": "Chivilcoy"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7101",
                                        "IdSeccion": 41,
                                        "Seccion": "General Arenales"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7102",
                                        "IdSeccion": 49,
                                        "Seccion": "General Pinto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7103",
                                        "IdSeccion": 54,
                                        "Seccion": "General Viamonte"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7104",
                                        "IdSeccion": 55,
                                        "Seccion": "General Villegas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7105",
                                        "IdSeccion": 58,
                                        "Seccion": "Hipólito Yrigoyen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7106",
                                        "IdSeccion": 60,
                                        "Seccion": "Junín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7107",
                                        "IdSeccion": 66,
                                        "Seccion": "Leandro N. Alem"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7108",
                                        "IdSeccion": 67,
                                        "Seccion": "Lincoln"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7109",
                                        "IdSeccion": 83,
                                        "Seccion": "9 de Julio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b710a",
                                        "IdSeccion": 85,
                                        "Seccion": "Pehuajó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b710b",
                                        "IdSeccion": 95,
                                        "Seccion": "Rivadavia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b710c",
                                        "IdSeccion": 115,
                                        "Seccion": "Trenque Lauquen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b710d",
                                        "IdSeccion": 127,
                                        "Seccion": "Florentino Ameghino"
                                    }
                                ]
                            },
                            {
                                "_id": "66134fd690a68119101b710e",
                                "IDSeccionProvincial": 5,
                                "SeccionProvincial": "Sección Quinta",
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b710f",
                                        "IdSeccion": 5,
                                        "Seccion": "Ayacucho"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7110",
                                        "IdSeccion": 8,
                                        "Seccion": "Balcarce"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7111",
                                        "IdSeccion": 23,
                                        "Seccion": "Castelli"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7112",
                                        "IdSeccion": 30,
                                        "Seccion": "Chascomús"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7113",
                                        "IdSeccion": 33,
                                        "Seccion": "Dolores"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7114",
                                        "IdSeccion": 39,
                                        "Seccion": "General Alvarado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7115",
                                        "IdSeccion": 42,
                                        "Seccion": "General Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7116",
                                        "IdSeccion": 43,
                                        "Seccion": "General Guido"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7117",
                                        "IdSeccion": 46,
                                        "Seccion": "General Lavalle"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7118",
                                        "IdSeccion": 47,
                                        "Seccion": "General Juan Madariaga"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7119",
                                        "IdSeccion": 48,
                                        "Seccion": "General Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b711a",
                                        "IdSeccion": 50,
                                        "Seccion": "General Pueyrredón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b711b",
                                        "IdSeccion": 65,
                                        "Seccion": "Las Flores"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b711c",
                                        "IdSeccion": 68,
                                        "Seccion": "Lobería"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b711d",
                                        "IdSeccion": 73,
                                        "Seccion": "Maipú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b711e",
                                        "IdSeccion": 74,
                                        "Seccion": "Mar Chiquita"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b711f",
                                        "IdSeccion": 78,
                                        "Seccion": "Monte"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7120",
                                        "IdSeccion": 82,
                                        "Seccion": "Necochea"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7121",
                                        "IdSeccion": 88,
                                        "Seccion": "Pila"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7122",
                                        "IdSeccion": 90,
                                        "Seccion": "Pinamar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7123",
                                        "IdSeccion": 94,
                                        "Seccion": "Rauch"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7124",
                                        "IdSeccion": 104,
                                        "Seccion": "San Cayetano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7125",
                                        "IdSeccion": 111,
                                        "Seccion": "Tandil"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7126",
                                        "IdSeccion": 116,
                                        "Seccion": "Tordillo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7127",
                                        "IdSeccion": 119,
                                        "Seccion": "La Costa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7128",
                                        "IdSeccion": 123,
                                        "Seccion": "Villa Gesell"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7129",
                                        "IdSeccion": 135,
                                        "Seccion": "Lezama"
                                    }
                                ]
                            },
                            {
                                "_id": "66134fd690a68119101b712a",
                                "IDSeccionProvincial": 7,
                                "SeccionProvincial": "Sección Séptima",
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b712b",
                                        "IdSeccion": 6,
                                        "Seccion": "Azul"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b712c",
                                        "IdSeccion": 13,
                                        "Seccion": "Bolívar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b712d",
                                        "IdSeccion": 40,
                                        "Seccion": "General Alvear"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b712e",
                                        "IdSeccion": 84,
                                        "Seccion": "Olavarría"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b712f",
                                        "IdSeccion": 97,
                                        "Seccion": "Roque Pérez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7130",
                                        "IdSeccion": 99,
                                        "Seccion": "Saladillo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7131",
                                        "IdSeccion": 112,
                                        "Seccion": "Tapalqué"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7132",
                                        "IdSeccion": 121,
                                        "Seccion": "25 de Mayo"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b7133",
                        "IdDistrito": 3,
                        "Distrito": "Catamarca",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b7134",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7135",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7136",
                                        "IdSeccion": 2,
                                        "Seccion": "Capayán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7137",
                                        "IdSeccion": 3,
                                        "Seccion": "La Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7138",
                                        "IdSeccion": 4,
                                        "Seccion": "Ancasti"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7139",
                                        "IdSeccion": 5,
                                        "Seccion": "El Alto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b713a",
                                        "IdSeccion": 6,
                                        "Seccion": "Santa Rosa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b713b",
                                        "IdSeccion": 7,
                                        "Seccion": "Paclín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b713c",
                                        "IdSeccion": 8,
                                        "Seccion": "Valle Viejo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b713d",
                                        "IdSeccion": 9,
                                        "Seccion": "Fray Mamerto Esquiú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b713e",
                                        "IdSeccion": 10,
                                        "Seccion": "Ambato"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b713f",
                                        "IdSeccion": 11,
                                        "Seccion": "Pomán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7140",
                                        "IdSeccion": 12,
                                        "Seccion": "Andalgalá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7141",
                                        "IdSeccion": 13,
                                        "Seccion": "Belén"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7142",
                                        "IdSeccion": 14,
                                        "Seccion": "Antofagasta de la Sierra"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7143",
                                        "IdSeccion": 15,
                                        "Seccion": "Tinogasta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7144",
                                        "IdSeccion": 16,
                                        "Seccion": "Santa María"
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                "_id": "66134fd690a68119101b7145",
                "IdCargo": "7",
                "Cargo": "INTENDENTE/A",
                "Distritos": [
                    {
                        "_id": "66134fd690a68119101b7146",
                        "IdDistrito": 2,
                        "Distrito": "Buenos Aires",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b7147",
                                "IDSeccionProvincial": 1,
                                "SeccionProvincial": "Sección Primera",
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7148",
                                        "IdSeccion": 16,
                                        "Seccion": "Campana"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7149",
                                        "IdSeccion": 35,
                                        "Seccion": "Escobar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b714a",
                                        "IdSeccion": 45,
                                        "Seccion": "General Las Heras"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b714b",
                                        "IdSeccion": 51,
                                        "Seccion": "General Rodríguez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b714c",
                                        "IdSeccion": 52,
                                        "Seccion": "General San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b714d",
                                        "IdSeccion": 53,
                                        "Seccion": "San Miguel"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b714e",
                                        "IdSeccion": 71,
                                        "Seccion": "Luján"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b714f",
                                        "IdSeccion": 75,
                                        "Seccion": "Marcos Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7150",
                                        "IdSeccion": 76,
                                        "Seccion": "Mercedes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7151",
                                        "IdSeccion": 77,
                                        "Seccion": "Merlo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7152",
                                        "IdSeccion": 79,
                                        "Seccion": "Moreno"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7153",
                                        "IdSeccion": 80,
                                        "Seccion": "Morón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7154",
                                        "IdSeccion": 81,
                                        "Seccion": "Navarro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7155",
                                        "IdSeccion": 89,
                                        "Seccion": "Pilar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7156",
                                        "IdSeccion": 105,
                                        "Seccion": "San Fernando"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7157",
                                        "IdSeccion": 106,
                                        "Seccion": "San Isidro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7158",
                                        "IdSeccion": 110,
                                        "Seccion": "Suipacha"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7159",
                                        "IdSeccion": 113,
                                        "Seccion": "Tigre"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b715a",
                                        "IdSeccion": 118,
                                        "Seccion": "Tres de Febrero"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b715b",
                                        "IdSeccion": 122,
                                        "Seccion": "Vicente López"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b715c",
                                        "IdSeccion": 129,
                                        "Seccion": "José C. Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b715d",
                                        "IdSeccion": 130,
                                        "Seccion": "Malvinas Argentinas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b715e",
                                        "IdSeccion": 133,
                                        "Seccion": "Ituzaingó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b715f",
                                        "IdSeccion": 134,
                                        "Seccion": "Hurlingham"
                                    }
                                ]
                            },
                            {
                                "_id": "66134fd690a68119101b7160",
                                "IDSeccionProvincial": 2,
                                "SeccionProvincial": "Sección Segunda",
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7161",
                                        "IdSeccion": 9,
                                        "Seccion": "Baradero"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7162",
                                        "IdSeccion": 10,
                                        "Seccion": "Arrecifes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7163",
                                        "IdSeccion": 18,
                                        "Seccion": "Capitán Sarmiento"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7164",
                                        "IdSeccion": 21,
                                        "Seccion": "Carmen de Areco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7165",
                                        "IdSeccion": 24,
                                        "Seccion": "Colón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7166",
                                        "IdSeccion": 37,
                                        "Seccion": "Exaltación de la Cruz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7167",
                                        "IdSeccion": 87,
                                        "Seccion": "Pergamino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7168",
                                        "IdSeccion": 93,
                                        "Seccion": "Ramallo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7169",
                                        "IdSeccion": 96,
                                        "Seccion": "Rojas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b716a",
                                        "IdSeccion": 101,
                                        "Seccion": "Salto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b716b",
                                        "IdSeccion": 102,
                                        "Seccion": "San Andrés de Giles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b716c",
                                        "IdSeccion": 103,
                                        "Seccion": "San Antonio de Areco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b716d",
                                        "IdSeccion": 107,
                                        "Seccion": "San Nicolás"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b716e",
                                        "IdSeccion": 108,
                                        "Seccion": "San Pedro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b716f",
                                        "IdSeccion": 125,
                                        "Seccion": "Zárate"
                                    }
                                ]
                            },
                            {
                                "_id": "66134fd690a68119101b7170",
                                "IDSeccionProvincial": 3,
                                "SeccionProvincial": "Sección Tercera",
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7171",
                                        "IdSeccion": 3,
                                        "Seccion": "Almirante Brown"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7172",
                                        "IdSeccion": 4,
                                        "Seccion": "Avellaneda"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7173",
                                        "IdSeccion": 11,
                                        "Seccion": "Berazategui"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7174",
                                        "IdSeccion": 12,
                                        "Seccion": "Berisso"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7175",
                                        "IdSeccion": 15,
                                        "Seccion": "Brandsen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7176",
                                        "IdSeccion": 17,
                                        "Seccion": "Cañuelas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7177",
                                        "IdSeccion": 34,
                                        "Seccion": "Ensenada"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7178",
                                        "IdSeccion": 36,
                                        "Seccion": "Esteban Echeverría"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7179",
                                        "IdSeccion": 38,
                                        "Seccion": "Florencio Varela"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b717a",
                                        "IdSeccion": 61,
                                        "Seccion": "La Matanza"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b717b",
                                        "IdSeccion": 62,
                                        "Seccion": "Lanús"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b717c",
                                        "IdSeccion": 69,
                                        "Seccion": "Lobos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b717d",
                                        "IdSeccion": 70,
                                        "Seccion": "Lomas de Zamora"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b717e",
                                        "IdSeccion": 72,
                                        "Seccion": "Magdalena"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b717f",
                                        "IdSeccion": 92,
                                        "Seccion": "Quilmes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7180",
                                        "IdSeccion": 109,
                                        "Seccion": "San Vicente"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7181",
                                        "IdSeccion": 128,
                                        "Seccion": "Presidente Perón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7182",
                                        "IdSeccion": 131,
                                        "Seccion": "Punta Indio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7183",
                                        "IdSeccion": 132,
                                        "Seccion": "Ezeiza"
                                    }
                                ]
                            },
                            {
                                "_id": "66134fd690a68119101b7184",
                                "IDSeccionProvincial": 4,
                                "SeccionProvincial": "Sección Cuarta",
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7185",
                                        "IdSeccion": 2,
                                        "Seccion": "Alberti"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7186",
                                        "IdSeccion": 14,
                                        "Seccion": "Bragado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7187",
                                        "IdSeccion": 19,
                                        "Seccion": "Carlos Casares"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7188",
                                        "IdSeccion": 20,
                                        "Seccion": "Carlos Tejedor"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7189",
                                        "IdSeccion": 29,
                                        "Seccion": "Chacabuco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b718a",
                                        "IdSeccion": 31,
                                        "Seccion": "Chivilcoy"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b718b",
                                        "IdSeccion": 41,
                                        "Seccion": "General Arenales"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b718c",
                                        "IdSeccion": 49,
                                        "Seccion": "General Pinto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b718d",
                                        "IdSeccion": 54,
                                        "Seccion": "General Viamonte"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b718e",
                                        "IdSeccion": 55,
                                        "Seccion": "General Villegas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b718f",
                                        "IdSeccion": 58,
                                        "Seccion": "Hipólito Yrigoyen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7190",
                                        "IdSeccion": 60,
                                        "Seccion": "Junín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7191",
                                        "IdSeccion": 66,
                                        "Seccion": "Leandro N. Alem"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7192",
                                        "IdSeccion": 67,
                                        "Seccion": "Lincoln"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7193",
                                        "IdSeccion": 83,
                                        "Seccion": "9 de Julio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7194",
                                        "IdSeccion": 85,
                                        "Seccion": "Pehuajó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7195",
                                        "IdSeccion": 95,
                                        "Seccion": "Rivadavia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7196",
                                        "IdSeccion": 115,
                                        "Seccion": "Trenque Lauquen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7197",
                                        "IdSeccion": 127,
                                        "Seccion": "Florentino Ameghino"
                                    }
                                ]
                            },
                            {
                                "_id": "66134fd690a68119101b7198",
                                "IDSeccionProvincial": 5,
                                "SeccionProvincial": "Sección Quinta",
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7199",
                                        "IdSeccion": 5,
                                        "Seccion": "Ayacucho"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b719a",
                                        "IdSeccion": 8,
                                        "Seccion": "Balcarce"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b719b",
                                        "IdSeccion": 23,
                                        "Seccion": "Castelli"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b719c",
                                        "IdSeccion": 30,
                                        "Seccion": "Chascomús"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b719d",
                                        "IdSeccion": 33,
                                        "Seccion": "Dolores"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b719e",
                                        "IdSeccion": 39,
                                        "Seccion": "General Alvarado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b719f",
                                        "IdSeccion": 42,
                                        "Seccion": "General Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71a0",
                                        "IdSeccion": 43,
                                        "Seccion": "General Guido"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71a1",
                                        "IdSeccion": 46,
                                        "Seccion": "General Lavalle"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71a2",
                                        "IdSeccion": 47,
                                        "Seccion": "General Juan Madariaga"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71a3",
                                        "IdSeccion": 48,
                                        "Seccion": "General Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71a4",
                                        "IdSeccion": 50,
                                        "Seccion": "General Pueyrredón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71a5",
                                        "IdSeccion": 65,
                                        "Seccion": "Las Flores"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71a6",
                                        "IdSeccion": 68,
                                        "Seccion": "Lobería"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71a7",
                                        "IdSeccion": 73,
                                        "Seccion": "Maipú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71a8",
                                        "IdSeccion": 74,
                                        "Seccion": "Mar Chiquita"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71a9",
                                        "IdSeccion": 78,
                                        "Seccion": "Monte"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71aa",
                                        "IdSeccion": 82,
                                        "Seccion": "Necochea"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71ab",
                                        "IdSeccion": 88,
                                        "Seccion": "Pila"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71ac",
                                        "IdSeccion": 90,
                                        "Seccion": "Pinamar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71ad",
                                        "IdSeccion": 94,
                                        "Seccion": "Rauch"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71ae",
                                        "IdSeccion": 104,
                                        "Seccion": "San Cayetano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71af",
                                        "IdSeccion": 111,
                                        "Seccion": "Tandil"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71b0",
                                        "IdSeccion": 116,
                                        "Seccion": "Tordillo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71b1",
                                        "IdSeccion": 119,
                                        "Seccion": "La Costa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71b2",
                                        "IdSeccion": 123,
                                        "Seccion": "Villa Gesell"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71b3",
                                        "IdSeccion": 135,
                                        "Seccion": "Lezama"
                                    }
                                ]
                            },
                            {
                                "_id": "66134fd690a68119101b71b4",
                                "IDSeccionProvincial": 6,
                                "SeccionProvincial": "Sección Sexta",
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b71b5",
                                        "IdSeccion": 1,
                                        "Seccion": "Adolfo Alsina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71b6",
                                        "IdSeccion": 7,
                                        "Seccion": "Bahía Blanca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71b7",
                                        "IdSeccion": 22,
                                        "Seccion": "Patagones"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71b8",
                                        "IdSeccion": 25,
                                        "Seccion": "Coronel Dorrego"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71b9",
                                        "IdSeccion": 26,
                                        "Seccion": "Coronel Pringles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71ba",
                                        "IdSeccion": 27,
                                        "Seccion": "Coronel de Marina L. Rosales"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71bb",
                                        "IdSeccion": 28,
                                        "Seccion": "Coronel Suárez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71bc",
                                        "IdSeccion": 32,
                                        "Seccion": "Daireaux"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71bd",
                                        "IdSeccion": 44,
                                        "Seccion": "General La Madrid"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71be",
                                        "IdSeccion": 56,
                                        "Seccion": "Adolfo Gonzales Chaves"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71bf",
                                        "IdSeccion": 57,
                                        "Seccion": "Guaminí"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71c0",
                                        "IdSeccion": 59,
                                        "Seccion": "Benito Juárez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71c1",
                                        "IdSeccion": 64,
                                        "Seccion": "Laprida"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71c2",
                                        "IdSeccion": 86,
                                        "Seccion": "Pellegrini"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71c3",
                                        "IdSeccion": 91,
                                        "Seccion": "Puan"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71c4",
                                        "IdSeccion": 98,
                                        "Seccion": "Saavedra"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71c5",
                                        "IdSeccion": 100,
                                        "Seccion": "Salliqueló"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71c6",
                                        "IdSeccion": 114,
                                        "Seccion": "Tornquist"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71c7",
                                        "IdSeccion": 117,
                                        "Seccion": "Tres Arroyos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71c8",
                                        "IdSeccion": 120,
                                        "Seccion": "Monte Hermoso"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71c9",
                                        "IdSeccion": 124,
                                        "Seccion": "Villarino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71ca",
                                        "IdSeccion": 126,
                                        "Seccion": "Tres Lomas"
                                    }
                                ]
                            },
                            {
                                "_id": "66134fd690a68119101b71cb",
                                "IDSeccionProvincial": 7,
                                "SeccionProvincial": "Sección Séptima",
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b71cc",
                                        "IdSeccion": 6,
                                        "Seccion": "Azul"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71cd",
                                        "IdSeccion": 13,
                                        "Seccion": "Bolívar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71ce",
                                        "IdSeccion": 40,
                                        "Seccion": "General Alvear"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71cf",
                                        "IdSeccion": 84,
                                        "Seccion": "Olavarría"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71d0",
                                        "IdSeccion": 97,
                                        "Seccion": "Roque Pérez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71d1",
                                        "IdSeccion": 99,
                                        "Seccion": "Saladillo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71d2",
                                        "IdSeccion": 112,
                                        "Seccion": "Tapalqué"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71d3",
                                        "IdSeccion": 121,
                                        "Seccion": "25 de Mayo"
                                    }
                                ]
                            },
                            {
                                "_id": "66134fd690a68119101b71d4",
                                "IDSeccionProvincial": 8,
                                "SeccionProvincial": "Sección Capital",
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b71d5",
                                        "IdSeccion": 63,
                                        "Seccion": "La Plata"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b71d6",
                        "IdDistrito": 3,
                        "Distrito": "Catamarca",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b71d7",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b71d8",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71d9",
                                        "IdSeccion": 2,
                                        "Seccion": "Capayán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71da",
                                        "IdSeccion": 3,
                                        "Seccion": "La Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71db",
                                        "IdSeccion": 4,
                                        "Seccion": "Ancasti"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71dc",
                                        "IdSeccion": 5,
                                        "Seccion": "El Alto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71dd",
                                        "IdSeccion": 6,
                                        "Seccion": "Santa Rosa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71de",
                                        "IdSeccion": 7,
                                        "Seccion": "Paclín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71df",
                                        "IdSeccion": 8,
                                        "Seccion": "Valle Viejo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71e0",
                                        "IdSeccion": 9,
                                        "Seccion": "Fray Mamerto Esquiú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71e1",
                                        "IdSeccion": 10,
                                        "Seccion": "Ambato"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71e2",
                                        "IdSeccion": 11,
                                        "Seccion": "Pomán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71e3",
                                        "IdSeccion": 12,
                                        "Seccion": "Andalgalá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71e4",
                                        "IdSeccion": 13,
                                        "Seccion": "Belén"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71e5",
                                        "IdSeccion": 14,
                                        "Seccion": "Antofagasta de la Sierra"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71e6",
                                        "IdSeccion": 15,
                                        "Seccion": "Tinogasta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71e7",
                                        "IdSeccion": 16,
                                        "Seccion": "Santa María"
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                "_id": "66134fd690a68119101b71e8",
                "IdCargo": "8",
                "Cargo": "PARLAMENTO MERCOSUR NACIONAL",
                "Distritos": [
                    {
                        "_id": "66134fd690a68119101b71e9",
                        "IdDistrito": 1,
                        "Distrito": "Ciudad Autónoma de Buenos Aires",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b71ea",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b71eb",
                                        "IdSeccion": 1,
                                        "Seccion": "Comuna 01"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71ec",
                                        "IdSeccion": 2,
                                        "Seccion": "Comuna 02"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71ed",
                                        "IdSeccion": 3,
                                        "Seccion": "Comuna 03"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71ee",
                                        "IdSeccion": 4,
                                        "Seccion": "Comuna 04"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71ef",
                                        "IdSeccion": 5,
                                        "Seccion": "Comuna 05"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71f0",
                                        "IdSeccion": 6,
                                        "Seccion": "Comuna 06"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71f1",
                                        "IdSeccion": 7,
                                        "Seccion": "Comuna 07"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71f2",
                                        "IdSeccion": 8,
                                        "Seccion": "Comuna 08"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71f3",
                                        "IdSeccion": 9,
                                        "Seccion": "Comuna 09"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71f4",
                                        "IdSeccion": 10,
                                        "Seccion": "Comuna 10"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71f5",
                                        "IdSeccion": 11,
                                        "Seccion": "Comuna 11"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71f6",
                                        "IdSeccion": 12,
                                        "Seccion": "Comuna 12"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71f7",
                                        "IdSeccion": 13,
                                        "Seccion": "Comuna 13"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71f8",
                                        "IdSeccion": 14,
                                        "Seccion": "Comuna 14"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71f9",
                                        "IdSeccion": 15,
                                        "Seccion": "Comuna 15"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b71fa",
                        "IdDistrito": 2,
                        "Distrito": "Buenos Aires",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b71fb",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b71fc",
                                        "IdSeccion": 1,
                                        "Seccion": "Adolfo Alsina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71fd",
                                        "IdSeccion": 2,
                                        "Seccion": "Alberti"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71fe",
                                        "IdSeccion": 3,
                                        "Seccion": "Almirante Brown"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b71ff",
                                        "IdSeccion": 4,
                                        "Seccion": "Avellaneda"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7200",
                                        "IdSeccion": 5,
                                        "Seccion": "Ayacucho"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7201",
                                        "IdSeccion": 6,
                                        "Seccion": "Azul"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7202",
                                        "IdSeccion": 7,
                                        "Seccion": "Bahía Blanca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7203",
                                        "IdSeccion": 8,
                                        "Seccion": "Balcarce"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7204",
                                        "IdSeccion": 9,
                                        "Seccion": "Baradero"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7205",
                                        "IdSeccion": 10,
                                        "Seccion": "Arrecifes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7206",
                                        "IdSeccion": 11,
                                        "Seccion": "Berazategui"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7207",
                                        "IdSeccion": 12,
                                        "Seccion": "Berisso"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7208",
                                        "IdSeccion": 13,
                                        "Seccion": "Bolívar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7209",
                                        "IdSeccion": 14,
                                        "Seccion": "Bragado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b720a",
                                        "IdSeccion": 15,
                                        "Seccion": "Brandsen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b720b",
                                        "IdSeccion": 16,
                                        "Seccion": "Campana"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b720c",
                                        "IdSeccion": 17,
                                        "Seccion": "Cañuelas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b720d",
                                        "IdSeccion": 18,
                                        "Seccion": "Capitán Sarmiento"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b720e",
                                        "IdSeccion": 19,
                                        "Seccion": "Carlos Casares"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b720f",
                                        "IdSeccion": 20,
                                        "Seccion": "Carlos Tejedor"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7210",
                                        "IdSeccion": 21,
                                        "Seccion": "Carmen de Areco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7211",
                                        "IdSeccion": 22,
                                        "Seccion": "Patagones"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7212",
                                        "IdSeccion": 23,
                                        "Seccion": "Castelli"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7213",
                                        "IdSeccion": 24,
                                        "Seccion": "Colón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7214",
                                        "IdSeccion": 25,
                                        "Seccion": "Coronel Dorrego"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7215",
                                        "IdSeccion": 26,
                                        "Seccion": "Coronel Pringles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7216",
                                        "IdSeccion": 27,
                                        "Seccion": "Coronel de Marina L. Rosales"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7217",
                                        "IdSeccion": 28,
                                        "Seccion": "Coronel Suárez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7218",
                                        "IdSeccion": 29,
                                        "Seccion": "Chacabuco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7219",
                                        "IdSeccion": 30,
                                        "Seccion": "Chascomús"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b721a",
                                        "IdSeccion": 31,
                                        "Seccion": "Chivilcoy"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b721b",
                                        "IdSeccion": 32,
                                        "Seccion": "Daireaux"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b721c",
                                        "IdSeccion": 33,
                                        "Seccion": "Dolores"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b721d",
                                        "IdSeccion": 34,
                                        "Seccion": "Ensenada"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b721e",
                                        "IdSeccion": 35,
                                        "Seccion": "Escobar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b721f",
                                        "IdSeccion": 36,
                                        "Seccion": "Esteban Echeverría"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7220",
                                        "IdSeccion": 37,
                                        "Seccion": "Exaltación de la Cruz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7221",
                                        "IdSeccion": 38,
                                        "Seccion": "Florencio Varela"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7222",
                                        "IdSeccion": 39,
                                        "Seccion": "General Alvarado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7223",
                                        "IdSeccion": 40,
                                        "Seccion": "General Alvear"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7224",
                                        "IdSeccion": 41,
                                        "Seccion": "General Arenales"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7225",
                                        "IdSeccion": 42,
                                        "Seccion": "General Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7226",
                                        "IdSeccion": 43,
                                        "Seccion": "General Guido"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7227",
                                        "IdSeccion": 44,
                                        "Seccion": "General La Madrid"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7228",
                                        "IdSeccion": 45,
                                        "Seccion": "General Las Heras"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7229",
                                        "IdSeccion": 46,
                                        "Seccion": "General Lavalle"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b722a",
                                        "IdSeccion": 47,
                                        "Seccion": "General Juan Madariaga"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b722b",
                                        "IdSeccion": 48,
                                        "Seccion": "General Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b722c",
                                        "IdSeccion": 49,
                                        "Seccion": "General Pinto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b722d",
                                        "IdSeccion": 50,
                                        "Seccion": "General Pueyrredón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b722e",
                                        "IdSeccion": 51,
                                        "Seccion": "General Rodríguez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b722f",
                                        "IdSeccion": 52,
                                        "Seccion": "General San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7230",
                                        "IdSeccion": 53,
                                        "Seccion": "San Miguel"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7231",
                                        "IdSeccion": 54,
                                        "Seccion": "General Viamonte"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7232",
                                        "IdSeccion": 55,
                                        "Seccion": "General Villegas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7233",
                                        "IdSeccion": 56,
                                        "Seccion": "Adolfo Gonzales Chaves"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7234",
                                        "IdSeccion": 57,
                                        "Seccion": "Guaminí"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7235",
                                        "IdSeccion": 58,
                                        "Seccion": "Hipólito Yrigoyen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7236",
                                        "IdSeccion": 59,
                                        "Seccion": "Benito Juárez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7237",
                                        "IdSeccion": 60,
                                        "Seccion": "Junín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7238",
                                        "IdSeccion": 61,
                                        "Seccion": "La Matanza"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7239",
                                        "IdSeccion": 62,
                                        "Seccion": "Lanús"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b723a",
                                        "IdSeccion": 63,
                                        "Seccion": "La Plata"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b723b",
                                        "IdSeccion": 64,
                                        "Seccion": "Laprida"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b723c",
                                        "IdSeccion": 65,
                                        "Seccion": "Las Flores"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b723d",
                                        "IdSeccion": 66,
                                        "Seccion": "Leandro N. Alem"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b723e",
                                        "IdSeccion": 67,
                                        "Seccion": "Lincoln"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b723f",
                                        "IdSeccion": 68,
                                        "Seccion": "Lobería"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7240",
                                        "IdSeccion": 69,
                                        "Seccion": "Lobos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7241",
                                        "IdSeccion": 70,
                                        "Seccion": "Lomas de Zamora"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7242",
                                        "IdSeccion": 71,
                                        "Seccion": "Luján"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7243",
                                        "IdSeccion": 72,
                                        "Seccion": "Magdalena"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7244",
                                        "IdSeccion": 73,
                                        "Seccion": "Maipú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7245",
                                        "IdSeccion": 74,
                                        "Seccion": "Mar Chiquita"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7246",
                                        "IdSeccion": 75,
                                        "Seccion": "Marcos Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7247",
                                        "IdSeccion": 76,
                                        "Seccion": "Mercedes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7248",
                                        "IdSeccion": 77,
                                        "Seccion": "Merlo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7249",
                                        "IdSeccion": 78,
                                        "Seccion": "Monte"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b724a",
                                        "IdSeccion": 79,
                                        "Seccion": "Moreno"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b724b",
                                        "IdSeccion": 80,
                                        "Seccion": "Morón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b724c",
                                        "IdSeccion": 81,
                                        "Seccion": "Navarro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b724d",
                                        "IdSeccion": 82,
                                        "Seccion": "Necochea"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b724e",
                                        "IdSeccion": 83,
                                        "Seccion": "9 de Julio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b724f",
                                        "IdSeccion": 84,
                                        "Seccion": "Olavarría"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7250",
                                        "IdSeccion": 85,
                                        "Seccion": "Pehuajó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7251",
                                        "IdSeccion": 86,
                                        "Seccion": "Pellegrini"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7252",
                                        "IdSeccion": 87,
                                        "Seccion": "Pergamino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7253",
                                        "IdSeccion": 88,
                                        "Seccion": "Pila"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7254",
                                        "IdSeccion": 89,
                                        "Seccion": "Pilar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7255",
                                        "IdSeccion": 90,
                                        "Seccion": "Pinamar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7256",
                                        "IdSeccion": 91,
                                        "Seccion": "Puan"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7257",
                                        "IdSeccion": 92,
                                        "Seccion": "Quilmes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7258",
                                        "IdSeccion": 93,
                                        "Seccion": "Ramallo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7259",
                                        "IdSeccion": 94,
                                        "Seccion": "Rauch"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b725a",
                                        "IdSeccion": 95,
                                        "Seccion": "Rivadavia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b725b",
                                        "IdSeccion": 96,
                                        "Seccion": "Rojas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b725c",
                                        "IdSeccion": 97,
                                        "Seccion": "Roque Pérez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b725d",
                                        "IdSeccion": 98,
                                        "Seccion": "Saavedra"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b725e",
                                        "IdSeccion": 99,
                                        "Seccion": "Saladillo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b725f",
                                        "IdSeccion": 100,
                                        "Seccion": "Salliqueló"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7260",
                                        "IdSeccion": 101,
                                        "Seccion": "Salto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7261",
                                        "IdSeccion": 102,
                                        "Seccion": "San Andrés de Giles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7262",
                                        "IdSeccion": 103,
                                        "Seccion": "San Antonio de Areco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7263",
                                        "IdSeccion": 104,
                                        "Seccion": "San Cayetano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7264",
                                        "IdSeccion": 105,
                                        "Seccion": "San Fernando"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7265",
                                        "IdSeccion": 106,
                                        "Seccion": "San Isidro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7266",
                                        "IdSeccion": 107,
                                        "Seccion": "San Nicolás"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7267",
                                        "IdSeccion": 108,
                                        "Seccion": "San Pedro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7268",
                                        "IdSeccion": 109,
                                        "Seccion": "San Vicente"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7269",
                                        "IdSeccion": 110,
                                        "Seccion": "Suipacha"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b726a",
                                        "IdSeccion": 111,
                                        "Seccion": "Tandil"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b726b",
                                        "IdSeccion": 112,
                                        "Seccion": "Tapalqué"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b726c",
                                        "IdSeccion": 113,
                                        "Seccion": "Tigre"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b726d",
                                        "IdSeccion": 114,
                                        "Seccion": "Tornquist"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b726e",
                                        "IdSeccion": 115,
                                        "Seccion": "Trenque Lauquen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b726f",
                                        "IdSeccion": 116,
                                        "Seccion": "Tordillo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7270",
                                        "IdSeccion": 117,
                                        "Seccion": "Tres Arroyos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7271",
                                        "IdSeccion": 118,
                                        "Seccion": "Tres de Febrero"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7272",
                                        "IdSeccion": 119,
                                        "Seccion": "La Costa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7273",
                                        "IdSeccion": 120,
                                        "Seccion": "Monte Hermoso"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7274",
                                        "IdSeccion": 121,
                                        "Seccion": "25 de Mayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7275",
                                        "IdSeccion": 122,
                                        "Seccion": "Vicente López"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7276",
                                        "IdSeccion": 123,
                                        "Seccion": "Villa Gesell"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7277",
                                        "IdSeccion": 124,
                                        "Seccion": "Villarino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7278",
                                        "IdSeccion": 125,
                                        "Seccion": "Zárate"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7279",
                                        "IdSeccion": 126,
                                        "Seccion": "Tres Lomas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b727a",
                                        "IdSeccion": 127,
                                        "Seccion": "Florentino Ameghino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b727b",
                                        "IdSeccion": 128,
                                        "Seccion": "Presidente Perón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b727c",
                                        "IdSeccion": 129,
                                        "Seccion": "José C. Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b727d",
                                        "IdSeccion": 130,
                                        "Seccion": "Malvinas Argentinas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b727e",
                                        "IdSeccion": 131,
                                        "Seccion": "Punta Indio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b727f",
                                        "IdSeccion": 132,
                                        "Seccion": "Ezeiza"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7280",
                                        "IdSeccion": 133,
                                        "Seccion": "Ituzaingó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7281",
                                        "IdSeccion": 134,
                                        "Seccion": "Hurlingham"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7282",
                                        "IdSeccion": 135,
                                        "Seccion": "Lezama"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b7283",
                        "IdDistrito": 3,
                        "Distrito": "Catamarca",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b7284",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7285",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7286",
                                        "IdSeccion": 2,
                                        "Seccion": "Capayán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7287",
                                        "IdSeccion": 3,
                                        "Seccion": "La Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7288",
                                        "IdSeccion": 4,
                                        "Seccion": "Ancasti"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7289",
                                        "IdSeccion": 5,
                                        "Seccion": "El Alto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b728a",
                                        "IdSeccion": 6,
                                        "Seccion": "Santa Rosa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b728b",
                                        "IdSeccion": 7,
                                        "Seccion": "Paclín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b728c",
                                        "IdSeccion": 8,
                                        "Seccion": "Valle Viejo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b728d",
                                        "IdSeccion": 9,
                                        "Seccion": "Fray Mamerto Esquiú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b728e",
                                        "IdSeccion": 10,
                                        "Seccion": "Ambato"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b728f",
                                        "IdSeccion": 11,
                                        "Seccion": "Pomán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7290",
                                        "IdSeccion": 12,
                                        "Seccion": "Andalgalá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7291",
                                        "IdSeccion": 13,
                                        "Seccion": "Belén"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7292",
                                        "IdSeccion": 14,
                                        "Seccion": "Antofagasta de la Sierra"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7293",
                                        "IdSeccion": 15,
                                        "Seccion": "Tinogasta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7294",
                                        "IdSeccion": 16,
                                        "Seccion": "Santa María"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b7295",
                        "IdDistrito": 4,
                        "Distrito": "Córdoba",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b7296",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7297",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7298",
                                        "IdSeccion": 2,
                                        "Seccion": "Calamuchita"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7299",
                                        "IdSeccion": 3,
                                        "Seccion": "Colón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b729a",
                                        "IdSeccion": 4,
                                        "Seccion": "Cruz del Eje"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b729b",
                                        "IdSeccion": 5,
                                        "Seccion": "General Roca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b729c",
                                        "IdSeccion": 6,
                                        "Seccion": "General San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b729d",
                                        "IdSeccion": 7,
                                        "Seccion": "Ischilín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b729e",
                                        "IdSeccion": 8,
                                        "Seccion": "Juárez Celman"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b729f",
                                        "IdSeccion": 9,
                                        "Seccion": "Marcos Juárez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72a0",
                                        "IdSeccion": 10,
                                        "Seccion": "Minas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72a1",
                                        "IdSeccion": 11,
                                        "Seccion": "Pocho"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72a2",
                                        "IdSeccion": 12,
                                        "Seccion": "Punilla"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72a3",
                                        "IdSeccion": 13,
                                        "Seccion": "Río Cuarto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72a4",
                                        "IdSeccion": 14,
                                        "Seccion": "Río Primero"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72a5",
                                        "IdSeccion": 15,
                                        "Seccion": "Río Seco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72a6",
                                        "IdSeccion": 16,
                                        "Seccion": "Río Segundo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72a7",
                                        "IdSeccion": 17,
                                        "Seccion": "Presidente Roque Sáenz Peña"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72a8",
                                        "IdSeccion": 18,
                                        "Seccion": "San Alberto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72a9",
                                        "IdSeccion": 19,
                                        "Seccion": "San Javier"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72aa",
                                        "IdSeccion": 20,
                                        "Seccion": "San Justo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72ab",
                                        "IdSeccion": 21,
                                        "Seccion": "Santa María"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72ac",
                                        "IdSeccion": 22,
                                        "Seccion": "Sobremonte"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72ad",
                                        "IdSeccion": 23,
                                        "Seccion": "Tercero Arriba"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72ae",
                                        "IdSeccion": 24,
                                        "Seccion": "Totoral"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72af",
                                        "IdSeccion": 25,
                                        "Seccion": "Tulumba"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72b0",
                                        "IdSeccion": 26,
                                        "Seccion": "Unión"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b72b1",
                        "IdDistrito": 5,
                        "Distrito": "Corrientes",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b72b2",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b72b3",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72b4",
                                        "IdSeccion": 2,
                                        "Seccion": "Goya"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72b5",
                                        "IdSeccion": 3,
                                        "Seccion": "Curuzú Cuatiá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72b6",
                                        "IdSeccion": 4,
                                        "Seccion": "Mercedes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72b7",
                                        "IdSeccion": 5,
                                        "Seccion": "Esquina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72b8",
                                        "IdSeccion": 6,
                                        "Seccion": "Lavalle"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72b9",
                                        "IdSeccion": 7,
                                        "Seccion": "Santo Tomé"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72ba",
                                        "IdSeccion": 8,
                                        "Seccion": "Paso de los Libres"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72bb",
                                        "IdSeccion": 9,
                                        "Seccion": "Monte Caseros"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72bc",
                                        "IdSeccion": 10,
                                        "Seccion": "San Luis del Palmar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72bd",
                                        "IdSeccion": 11,
                                        "Seccion": "Bella Vista"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72be",
                                        "IdSeccion": 12,
                                        "Seccion": "Empedrado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72bf",
                                        "IdSeccion": 13,
                                        "Seccion": "San Roque"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72c0",
                                        "IdSeccion": 14,
                                        "Seccion": "General Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72c1",
                                        "IdSeccion": 15,
                                        "Seccion": "Saladas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72c2",
                                        "IdSeccion": 16,
                                        "Seccion": "San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72c3",
                                        "IdSeccion": 17,
                                        "Seccion": "Concepción"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72c4",
                                        "IdSeccion": 18,
                                        "Seccion": "Mburucuyá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72c5",
                                        "IdSeccion": 19,
                                        "Seccion": "Ituzaingó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72c6",
                                        "IdSeccion": 20,
                                        "Seccion": "Sauce"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72c7",
                                        "IdSeccion": 21,
                                        "Seccion": "San Cosme"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72c8",
                                        "IdSeccion": 22,
                                        "Seccion": "General Alvear"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72c9",
                                        "IdSeccion": 23,
                                        "Seccion": "San Miguel"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72ca",
                                        "IdSeccion": 24,
                                        "Seccion": "Itatí"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72cb",
                                        "IdSeccion": 25,
                                        "Seccion": "Berón de Astrada"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b72cc",
                        "IdDistrito": 6,
                        "Distrito": "Chaco",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b72cd",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b72ce",
                                        "IdSeccion": 1,
                                        "Seccion": "San Fernando"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72cf",
                                        "IdSeccion": 2,
                                        "Seccion": "1º de Mayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72d0",
                                        "IdSeccion": 3,
                                        "Seccion": "Libertad"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72d1",
                                        "IdSeccion": 4,
                                        "Seccion": "General Donovan"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72d2",
                                        "IdSeccion": 5,
                                        "Seccion": "Sargento Cabral"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72d3",
                                        "IdSeccion": 6,
                                        "Seccion": "Presidencia de la Plaza"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72d4",
                                        "IdSeccion": 7,
                                        "Seccion": "Bermejo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72d5",
                                        "IdSeccion": 8,
                                        "Seccion": "Libertador General San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72d6",
                                        "IdSeccion": 9,
                                        "Seccion": "Tapenagá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72d7",
                                        "IdSeccion": 10,
                                        "Seccion": "San Lorenzo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72d8",
                                        "IdSeccion": 11,
                                        "Seccion": "Mayor Luis J. Fontana"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72d9",
                                        "IdSeccion": 12,
                                        "Seccion": "O'Higgins"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72da",
                                        "IdSeccion": 13,
                                        "Seccion": "Comandante Fernández"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72db",
                                        "IdSeccion": 14,
                                        "Seccion": "Quitilipi"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72dc",
                                        "IdSeccion": 15,
                                        "Seccion": "25 de Mayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72dd",
                                        "IdSeccion": 16,
                                        "Seccion": "Maipú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72de",
                                        "IdSeccion": 17,
                                        "Seccion": "Independencia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72df",
                                        "IdSeccion": 18,
                                        "Seccion": "General Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72e0",
                                        "IdSeccion": 19,
                                        "Seccion": "9 de Julio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72e1",
                                        "IdSeccion": 20,
                                        "Seccion": "Chacabuco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72e2",
                                        "IdSeccion": 21,
                                        "Seccion": "12 de Octubre"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72e3",
                                        "IdSeccion": 22,
                                        "Seccion": "2 de Abril"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72e4",
                                        "IdSeccion": 23,
                                        "Seccion": "Fray Justo Santa María de Oro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72e5",
                                        "IdSeccion": 24,
                                        "Seccion": "Almirante Brown"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72e6",
                                        "IdSeccion": 25,
                                        "Seccion": "General Güemes"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b72e7",
                        "IdDistrito": 7,
                        "Distrito": "Chubut",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b72e8",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b72e9",
                                        "IdSeccion": 1,
                                        "Seccion": "Rawson"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72ea",
                                        "IdSeccion": 2,
                                        "Seccion": "Biedma"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72eb",
                                        "IdSeccion": 3,
                                        "Seccion": "Telsen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72ec",
                                        "IdSeccion": 4,
                                        "Seccion": "Gastre"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72ed",
                                        "IdSeccion": 5,
                                        "Seccion": "Cushamen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72ee",
                                        "IdSeccion": 6,
                                        "Seccion": "Futaleufú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72ef",
                                        "IdSeccion": 7,
                                        "Seccion": "Languiñeo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72f0",
                                        "IdSeccion": 8,
                                        "Seccion": "Tehuelches"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72f1",
                                        "IdSeccion": 9,
                                        "Seccion": "Paso de Indios"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72f2",
                                        "IdSeccion": 10,
                                        "Seccion": "Mártires"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72f3",
                                        "IdSeccion": 11,
                                        "Seccion": "Florentino Ameghino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72f4",
                                        "IdSeccion": 12,
                                        "Seccion": "Gaiman"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72f5",
                                        "IdSeccion": 13,
                                        "Seccion": "Río Senguer"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72f6",
                                        "IdSeccion": 14,
                                        "Seccion": "Sarmiento"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72f7",
                                        "IdSeccion": 15,
                                        "Seccion": "Escalante"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b72f8",
                        "IdDistrito": 8,
                        "Distrito": "Entre Ríos",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b72f9",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b72fa",
                                        "IdSeccion": 1,
                                        "Seccion": "Paraná"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72fb",
                                        "IdSeccion": 3,
                                        "Seccion": "La Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72fc",
                                        "IdSeccion": 4,
                                        "Seccion": "Diamante"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72fd",
                                        "IdSeccion": 5,
                                        "Seccion": "Victoria"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72fe",
                                        "IdSeccion": 6,
                                        "Seccion": "Nogoyá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b72ff",
                                        "IdSeccion": 7,
                                        "Seccion": "Gualeguay"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7300",
                                        "IdSeccion": 8,
                                        "Seccion": "Tala"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7301",
                                        "IdSeccion": 9,
                                        "Seccion": "Uruguay"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7302",
                                        "IdSeccion": 10,
                                        "Seccion": "Gualeguaychú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7303",
                                        "IdSeccion": 11,
                                        "Seccion": "Islas del Ibicuy"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7304",
                                        "IdSeccion": 12,
                                        "Seccion": "Villaguay"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7305",
                                        "IdSeccion": 13,
                                        "Seccion": "Concordia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7306",
                                        "IdSeccion": 14,
                                        "Seccion": "Federal"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7307",
                                        "IdSeccion": 15,
                                        "Seccion": "Colón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7308",
                                        "IdSeccion": 16,
                                        "Seccion": "Feliciano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7309",
                                        "IdSeccion": 17,
                                        "Seccion": "Federación"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b730a",
                                        "IdSeccion": 18,
                                        "Seccion": "San Salvador"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b730b",
                        "IdDistrito": 9,
                        "Distrito": "Formosa",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b730c",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b730d",
                                        "IdSeccion": 1,
                                        "Seccion": "Formosa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b730e",
                                        "IdSeccion": 2,
                                        "Seccion": "Laishí"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b730f",
                                        "IdSeccion": 3,
                                        "Seccion": "Pilcomayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7310",
                                        "IdSeccion": 4,
                                        "Seccion": "Pirané"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7311",
                                        "IdSeccion": 5,
                                        "Seccion": "Pilagás"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7312",
                                        "IdSeccion": 6,
                                        "Seccion": "Patiño"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7313",
                                        "IdSeccion": 7,
                                        "Seccion": "Bermejo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7314",
                                        "IdSeccion": 8,
                                        "Seccion": "Matacos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7315",
                                        "IdSeccion": 9,
                                        "Seccion": "Ramón Lista"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b7316",
                        "IdDistrito": 10,
                        "Distrito": "Jujuy",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b7317",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7318",
                                        "IdSeccion": 1,
                                        "Seccion": "Dr. Manuel Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7319",
                                        "IdSeccion": 2,
                                        "Seccion": "Palpalá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b731a",
                                        "IdSeccion": 3,
                                        "Seccion": "San Antonio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b731b",
                                        "IdSeccion": 4,
                                        "Seccion": "El Carmen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b731c",
                                        "IdSeccion": 5,
                                        "Seccion": "San Pedro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b731d",
                                        "IdSeccion": 6,
                                        "Seccion": "Santa Bárbara"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b731e",
                                        "IdSeccion": 7,
                                        "Seccion": "Ledesma"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b731f",
                                        "IdSeccion": 8,
                                        "Seccion": "Valle Grande"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7320",
                                        "IdSeccion": 9,
                                        "Seccion": "Tumbaya"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7321",
                                        "IdSeccion": 10,
                                        "Seccion": "Tilcara"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7322",
                                        "IdSeccion": 11,
                                        "Seccion": "Humahuaca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7323",
                                        "IdSeccion": 12,
                                        "Seccion": "Cochinoca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7324",
                                        "IdSeccion": 13,
                                        "Seccion": "Rinconada"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7325",
                                        "IdSeccion": 14,
                                        "Seccion": "Santa Catalina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7326",
                                        "IdSeccion": 15,
                                        "Seccion": "Yavi"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7327",
                                        "IdSeccion": 16,
                                        "Seccion": "Susques"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b7328",
                        "IdDistrito": 11,
                        "Distrito": "La Pampa",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b7329",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b732a",
                                        "IdSeccion": 1,
                                        "Seccion": "Atreucó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b732b",
                                        "IdSeccion": 2,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b732c",
                                        "IdSeccion": 3,
                                        "Seccion": "Caleu Caleu"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b732d",
                                        "IdSeccion": 4,
                                        "Seccion": "Catriló"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b732e",
                                        "IdSeccion": 5,
                                        "Seccion": "Chalileo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b732f",
                                        "IdSeccion": 6,
                                        "Seccion": "Chapaleufú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7330",
                                        "IdSeccion": 7,
                                        "Seccion": "Chical Có"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7331",
                                        "IdSeccion": 8,
                                        "Seccion": "Conhelo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7332",
                                        "IdSeccion": 9,
                                        "Seccion": "Curacó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7333",
                                        "IdSeccion": 10,
                                        "Seccion": "Guatraché"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7334",
                                        "IdSeccion": 11,
                                        "Seccion": "Hucal"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7335",
                                        "IdSeccion": 12,
                                        "Seccion": "Loventué"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7336",
                                        "IdSeccion": 13,
                                        "Seccion": "Lihuel Calel"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7337",
                                        "IdSeccion": 14,
                                        "Seccion": "Limay Mahuida"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7338",
                                        "IdSeccion": 15,
                                        "Seccion": "Maracó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7339",
                                        "IdSeccion": 16,
                                        "Seccion": "Puelén"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b733a",
                                        "IdSeccion": 17,
                                        "Seccion": "Quemú Quemú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b733b",
                                        "IdSeccion": 18,
                                        "Seccion": "Rancul"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b733c",
                                        "IdSeccion": 19,
                                        "Seccion": "Realicó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b733d",
                                        "IdSeccion": 20,
                                        "Seccion": "Toay"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b733e",
                                        "IdSeccion": 21,
                                        "Seccion": "Trenel"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b733f",
                                        "IdSeccion": 22,
                                        "Seccion": "Utracán"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b7340",
                        "IdDistrito": 12,
                        "Distrito": "La Rioja",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b7341",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7342",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7343",
                                        "IdSeccion": 2,
                                        "Seccion": "Sanagasta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7344",
                                        "IdSeccion": 3,
                                        "Seccion": "Castro Barros"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7345",
                                        "IdSeccion": 4,
                                        "Seccion": "Arauco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7346",
                                        "IdSeccion": 5,
                                        "Seccion": "San Blas de los Sauces"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7347",
                                        "IdSeccion": 6,
                                        "Seccion": "Chilecito"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7348",
                                        "IdSeccion": 7,
                                        "Seccion": "Famatina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7349",
                                        "IdSeccion": 8,
                                        "Seccion": "Coronel Felipe Varela"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b734a",
                                        "IdSeccion": 9,
                                        "Seccion": "General Lamadrid"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b734b",
                                        "IdSeccion": 10,
                                        "Seccion": "Vinchina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b734c",
                                        "IdSeccion": 11,
                                        "Seccion": "Independencia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b734d",
                                        "IdSeccion": 12,
                                        "Seccion": "Chamical"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b734e",
                                        "IdSeccion": 13,
                                        "Seccion": "Ángel Vicente Peñaloza"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b734f",
                                        "IdSeccion": 14,
                                        "Seccion": "General Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7350",
                                        "IdSeccion": 15,
                                        "Seccion": "General Juan Facundo Quiroga"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7351",
                                        "IdSeccion": 16,
                                        "Seccion": "General Ortiz de Ocampo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7352",
                                        "IdSeccion": 17,
                                        "Seccion": "Rosario Vera Peñaloza"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7353",
                                        "IdSeccion": 18,
                                        "Seccion": "General San Martín"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b7354",
                        "IdDistrito": 13,
                        "Distrito": "Mendoza",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b7355",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7356",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7357",
                                        "IdSeccion": 2,
                                        "Seccion": "Godoy Cruz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7358",
                                        "IdSeccion": 3,
                                        "Seccion": "Guaymallén"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7359",
                                        "IdSeccion": 4,
                                        "Seccion": "Las Heras"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b735a",
                                        "IdSeccion": 5,
                                        "Seccion": "Lavalle"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b735b",
                                        "IdSeccion": 6,
                                        "Seccion": "Maipú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b735c",
                                        "IdSeccion": 7,
                                        "Seccion": "Luján de Cuyo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b735d",
                                        "IdSeccion": 8,
                                        "Seccion": "Tupungato"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b735e",
                                        "IdSeccion": 9,
                                        "Seccion": "San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b735f",
                                        "IdSeccion": 10,
                                        "Seccion": "Junín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7360",
                                        "IdSeccion": 11,
                                        "Seccion": "Rivadavia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7361",
                                        "IdSeccion": 12,
                                        "Seccion": "Tunuyán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7362",
                                        "IdSeccion": 13,
                                        "Seccion": "San Carlos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7363",
                                        "IdSeccion": 14,
                                        "Seccion": "Santa Rosa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7364",
                                        "IdSeccion": 15,
                                        "Seccion": "La Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7365",
                                        "IdSeccion": 16,
                                        "Seccion": "San Rafael"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7366",
                                        "IdSeccion": 17,
                                        "Seccion": "Malargüe"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7367",
                                        "IdSeccion": 18,
                                        "Seccion": "General Alvear"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b7368",
                        "IdDistrito": 14,
                        "Distrito": "Misiones",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b7369",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b736a",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b736b",
                                        "IdSeccion": 2,
                                        "Seccion": "Apóstoles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b736c",
                                        "IdSeccion": 3,
                                        "Seccion": "Candelaria"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b736d",
                                        "IdSeccion": 4,
                                        "Seccion": "Leandro N. Alem"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b736e",
                                        "IdSeccion": 5,
                                        "Seccion": "Concepción"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b736f",
                                        "IdSeccion": 6,
                                        "Seccion": "San Javier"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7370",
                                        "IdSeccion": 7,
                                        "Seccion": "San Ignacio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7371",
                                        "IdSeccion": 8,
                                        "Seccion": "Oberá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7372",
                                        "IdSeccion": 9,
                                        "Seccion": "Libertador General San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7373",
                                        "IdSeccion": 10,
                                        "Seccion": "Cainguás"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7374",
                                        "IdSeccion": 11,
                                        "Seccion": "25 de Mayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7375",
                                        "IdSeccion": 12,
                                        "Seccion": "Montecarlo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7376",
                                        "IdSeccion": 13,
                                        "Seccion": "Guaraní"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7377",
                                        "IdSeccion": 14,
                                        "Seccion": "Eldorado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7378",
                                        "IdSeccion": 15,
                                        "Seccion": "San Pedro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7379",
                                        "IdSeccion": 16,
                                        "Seccion": "Iguazú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b737a",
                                        "IdSeccion": 17,
                                        "Seccion": "General Manuel Belgrano"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b737b",
                        "IdDistrito": 15,
                        "Distrito": "Neuquén",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b737c",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b737d",
                                        "IdSeccion": 1,
                                        "Seccion": "Confluencia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b737e",
                                        "IdSeccion": 2,
                                        "Seccion": "Zapala"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b737f",
                                        "IdSeccion": 3,
                                        "Seccion": "Añelo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7380",
                                        "IdSeccion": 4,
                                        "Seccion": "Pehuenches"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7381",
                                        "IdSeccion": 5,
                                        "Seccion": "Chos Malal"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7382",
                                        "IdSeccion": 6,
                                        "Seccion": "Minas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7383",
                                        "IdSeccion": 7,
                                        "Seccion": "Ñorquín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7384",
                                        "IdSeccion": 8,
                                        "Seccion": "Loncopué"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7385",
                                        "IdSeccion": 9,
                                        "Seccion": "Picunches"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7386",
                                        "IdSeccion": 10,
                                        "Seccion": "Aluminé"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7387",
                                        "IdSeccion": 11,
                                        "Seccion": "Catán Lil"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7388",
                                        "IdSeccion": 12,
                                        "Seccion": "Picún Leufú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7389",
                                        "IdSeccion": 13,
                                        "Seccion": "Collón Curá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b738a",
                                        "IdSeccion": 14,
                                        "Seccion": "Huiliches"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b738b",
                                        "IdSeccion": 15,
                                        "Seccion": "Lácar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b738c",
                                        "IdSeccion": 16,
                                        "Seccion": "Los Lagos"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b738d",
                        "IdDistrito": 16,
                        "Distrito": "Río Negro",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b738e",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b738f",
                                        "IdSeccion": 1,
                                        "Seccion": "Adolfo Alsina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7390",
                                        "IdSeccion": 2,
                                        "Seccion": "Conesa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7391",
                                        "IdSeccion": 3,
                                        "Seccion": "San Antonio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7392",
                                        "IdSeccion": 4,
                                        "Seccion": "Valcheta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7393",
                                        "IdSeccion": 5,
                                        "Seccion": "9 de Julio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7394",
                                        "IdSeccion": 6,
                                        "Seccion": "25 de Mayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7395",
                                        "IdSeccion": 7,
                                        "Seccion": "Ñorquinco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7396",
                                        "IdSeccion": 8,
                                        "Seccion": "Pilcaniyeu"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7397",
                                        "IdSeccion": 9,
                                        "Seccion": "Bariloche"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7398",
                                        "IdSeccion": 10,
                                        "Seccion": "Pichi Mahuida"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7399",
                                        "IdSeccion": 11,
                                        "Seccion": "Avellaneda"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b739a",
                                        "IdSeccion": 12,
                                        "Seccion": "General Roca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b739b",
                                        "IdSeccion": 13,
                                        "Seccion": "El Cuy"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b739c",
                        "IdDistrito": 17,
                        "Distrito": "Salta",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b739d",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b739e",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b739f",
                                        "IdSeccion": 2,
                                        "Seccion": "La Caldera"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73a0",
                                        "IdSeccion": 3,
                                        "Seccion": "General Güemes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73a1",
                                        "IdSeccion": 4,
                                        "Seccion": "Metán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73a2",
                                        "IdSeccion": 5,
                                        "Seccion": "Anta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73a3",
                                        "IdSeccion": 6,
                                        "Seccion": "Rivadavia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73a4",
                                        "IdSeccion": 7,
                                        "Seccion": "Orán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73a5",
                                        "IdSeccion": 8,
                                        "Seccion": "General José de San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73a6",
                                        "IdSeccion": 9,
                                        "Seccion": "Iruya"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73a7",
                                        "IdSeccion": 10,
                                        "Seccion": "Santa Victoria"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73a8",
                                        "IdSeccion": 11,
                                        "Seccion": "Cerrillos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73a9",
                                        "IdSeccion": 12,
                                        "Seccion": "Chicoana"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73aa",
                                        "IdSeccion": 13,
                                        "Seccion": "La Viña"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73ab",
                                        "IdSeccion": 14,
                                        "Seccion": "Guachipas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73ac",
                                        "IdSeccion": 15,
                                        "Seccion": "Rosario de la Frontera"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73ad",
                                        "IdSeccion": 16,
                                        "Seccion": "La Candelaria"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73ae",
                                        "IdSeccion": 17,
                                        "Seccion": "Cafayate"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73af",
                                        "IdSeccion": 18,
                                        "Seccion": "San Carlos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73b0",
                                        "IdSeccion": 19,
                                        "Seccion": "Molinos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73b1",
                                        "IdSeccion": 20,
                                        "Seccion": "Cachi"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73b2",
                                        "IdSeccion": 21,
                                        "Seccion": "Rosario de Lerma"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73b3",
                                        "IdSeccion": 22,
                                        "Seccion": "La Poma"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73b4",
                                        "IdSeccion": 23,
                                        "Seccion": "Los Andes"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b73b5",
                        "IdDistrito": 18,
                        "Distrito": "San Juan",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b73b6",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b73b7",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73b8",
                                        "IdSeccion": 2,
                                        "Seccion": "Santa Lucía"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73b9",
                                        "IdSeccion": 3,
                                        "Seccion": "Chimbas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73ba",
                                        "IdSeccion": 4,
                                        "Seccion": "Rivadavia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73bb",
                                        "IdSeccion": 5,
                                        "Seccion": "Zonda"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73bc",
                                        "IdSeccion": 6,
                                        "Seccion": "Rawson"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73bd",
                                        "IdSeccion": 7,
                                        "Seccion": "9 de Julio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73be",
                                        "IdSeccion": 8,
                                        "Seccion": "San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73bf",
                                        "IdSeccion": 9,
                                        "Seccion": "Angaco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73c0",
                                        "IdSeccion": 10,
                                        "Seccion": "Albardón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73c1",
                                        "IdSeccion": 11,
                                        "Seccion": "Ullum"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73c2",
                                        "IdSeccion": 12,
                                        "Seccion": "Pocito"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73c3",
                                        "IdSeccion": 13,
                                        "Seccion": "Sarmiento"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73c4",
                                        "IdSeccion": 14,
                                        "Seccion": "25 de Mayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73c5",
                                        "IdSeccion": 15,
                                        "Seccion": "Caucete"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73c6",
                                        "IdSeccion": 16,
                                        "Seccion": "Valle Fértil"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73c7",
                                        "IdSeccion": 17,
                                        "Seccion": "Jáchal"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73c8",
                                        "IdSeccion": 18,
                                        "Seccion": "Iglesia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73c9",
                                        "IdSeccion": 19,
                                        "Seccion": "Calingasta"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b73ca",
                        "IdDistrito": 19,
                        "Distrito": "San Luis",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b73cb",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b73cc",
                                        "IdSeccion": 1,
                                        "Seccion": "Juan Martín de Pueyrredón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73cd",
                                        "IdSeccion": 2,
                                        "Seccion": "Coronel Pringles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73ce",
                                        "IdSeccion": 3,
                                        "Seccion": "General Pedernera"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73cf",
                                        "IdSeccion": 4,
                                        "Seccion": "Chacabuco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73d0",
                                        "IdSeccion": 5,
                                        "Seccion": "Libertador General San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73d1",
                                        "IdSeccion": 6,
                                        "Seccion": "Junín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73d2",
                                        "IdSeccion": 7,
                                        "Seccion": "Ayacucho"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73d3",
                                        "IdSeccion": 8,
                                        "Seccion": "Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73d4",
                                        "IdSeccion": 9,
                                        "Seccion": "Gobernador Dupuy"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b73d5",
                        "IdDistrito": 20,
                        "Distrito": "Santa Cruz",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b73d6",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b73d7",
                                        "IdSeccion": 1,
                                        "Seccion": "Deseado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73d8",
                                        "IdSeccion": 2,
                                        "Seccion": "Lago Buenos Aires"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73d9",
                                        "IdSeccion": 3,
                                        "Seccion": "Magallanes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73da",
                                        "IdSeccion": 4,
                                        "Seccion": "Río Chico"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73db",
                                        "IdSeccion": 5,
                                        "Seccion": "Corpen Aike"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73dc",
                                        "IdSeccion": 6,
                                        "Seccion": "Lago Argentino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73dd",
                                        "IdSeccion": 7,
                                        "Seccion": "Güer Aike"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b73de",
                        "IdDistrito": 21,
                        "Distrito": "Santa Fe",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b73df",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b73e0",
                                        "IdSeccion": 1,
                                        "Seccion": "La Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73e1",
                                        "IdSeccion": 2,
                                        "Seccion": "Las Colonias"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73e2",
                                        "IdSeccion": 3,
                                        "Seccion": "San Jerónimo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73e3",
                                        "IdSeccion": 4,
                                        "Seccion": "Garay"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73e4",
                                        "IdSeccion": 5,
                                        "Seccion": "Castellanos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73e5",
                                        "IdSeccion": 6,
                                        "Seccion": "San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73e6",
                                        "IdSeccion": 7,
                                        "Seccion": "San Cristóbal"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73e7",
                                        "IdSeccion": 8,
                                        "Seccion": "San Justo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73e8",
                                        "IdSeccion": 9,
                                        "Seccion": "General Obligado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73e9",
                                        "IdSeccion": 10,
                                        "Seccion": "Vera"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73ea",
                                        "IdSeccion": 11,
                                        "Seccion": "San Javier"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73eb",
                                        "IdSeccion": 12,
                                        "Seccion": "9 de Julio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73ec",
                                        "IdSeccion": 13,
                                        "Seccion": "Rosario"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73ed",
                                        "IdSeccion": 14,
                                        "Seccion": "Caseros"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73ee",
                                        "IdSeccion": 15,
                                        "Seccion": "Constitución"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73ef",
                                        "IdSeccion": 16,
                                        "Seccion": "General López"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73f0",
                                        "IdSeccion": 17,
                                        "Seccion": "Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73f1",
                                        "IdSeccion": 18,
                                        "Seccion": "Iriondo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73f2",
                                        "IdSeccion": 19,
                                        "Seccion": "San Lorenzo"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b73f3",
                        "IdDistrito": 22,
                        "Distrito": "Santiago del Estero",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b73f4",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b73f5",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73f6",
                                        "IdSeccion": 2,
                                        "Seccion": "Avellaneda"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73f7",
                                        "IdSeccion": 3,
                                        "Seccion": "Aguirre"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73f8",
                                        "IdSeccion": 4,
                                        "Seccion": "Alberdi"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73f9",
                                        "IdSeccion": 5,
                                        "Seccion": "Atamisqui"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73fa",
                                        "IdSeccion": 6,
                                        "Seccion": "Banda"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73fb",
                                        "IdSeccion": 7,
                                        "Seccion": "Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73fc",
                                        "IdSeccion": 8,
                                        "Seccion": "Copo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73fd",
                                        "IdSeccion": 9,
                                        "Seccion": "Choya"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73fe",
                                        "IdSeccion": 10,
                                        "Seccion": "Figueroa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b73ff",
                                        "IdSeccion": 11,
                                        "Seccion": "Guasayán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7400",
                                        "IdSeccion": 12,
                                        "Seccion": "Jiménez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7401",
                                        "IdSeccion": 13,
                                        "Seccion": "Loreto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7402",
                                        "IdSeccion": 14,
                                        "Seccion": "Juan F. Ibarra"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7403",
                                        "IdSeccion": 15,
                                        "Seccion": "Mitre"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7404",
                                        "IdSeccion": 16,
                                        "Seccion": "Moreno"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7405",
                                        "IdSeccion": 17,
                                        "Seccion": "Ojo de Agua"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7406",
                                        "IdSeccion": 18,
                                        "Seccion": "Pellegrini"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7407",
                                        "IdSeccion": 19,
                                        "Seccion": "Quebrachos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7408",
                                        "IdSeccion": 20,
                                        "Seccion": "Rivadavia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7409",
                                        "IdSeccion": 21,
                                        "Seccion": "Robles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b740a",
                                        "IdSeccion": 22,
                                        "Seccion": "Río Hondo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b740b",
                                        "IdSeccion": 23,
                                        "Seccion": "Silípica"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b740c",
                                        "IdSeccion": 24,
                                        "Seccion": "San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b740d",
                                        "IdSeccion": 25,
                                        "Seccion": "Salavina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b740e",
                                        "IdSeccion": 26,
                                        "Seccion": "Sarmiento"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b740f",
                                        "IdSeccion": 27,
                                        "Seccion": "General Taboada"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b7410",
                        "IdDistrito": 23,
                        "Distrito": "Tucumán",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b7411",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7412",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7413",
                                        "IdSeccion": 2,
                                        "Seccion": "Lules"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7414",
                                        "IdSeccion": 3,
                                        "Seccion": "Famaillá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7415",
                                        "IdSeccion": 4,
                                        "Seccion": "Monteros"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7416",
                                        "IdSeccion": 5,
                                        "Seccion": "Chicligasta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7417",
                                        "IdSeccion": 6,
                                        "Seccion": "Río Chico"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7418",
                                        "IdSeccion": 7,
                                        "Seccion": "Juan Bautista Alberdi"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7419",
                                        "IdSeccion": 8,
                                        "Seccion": "La Cocha"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b741a",
                                        "IdSeccion": 9,
                                        "Seccion": "Graneros"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b741b",
                                        "IdSeccion": 10,
                                        "Seccion": "Simoca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b741c",
                                        "IdSeccion": 11,
                                        "Seccion": "Leales"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b741d",
                                        "IdSeccion": 12,
                                        "Seccion": "Cruz Alta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b741e",
                                        "IdSeccion": 13,
                                        "Seccion": "Burruyacú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b741f",
                                        "IdSeccion": 14,
                                        "Seccion": "Trancas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7420",
                                        "IdSeccion": 15,
                                        "Seccion": "Yerba Buena"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7421",
                                        "IdSeccion": 16,
                                        "Seccion": "Tafí Viejo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7422",
                                        "IdSeccion": 17,
                                        "Seccion": "Tafí del Valle"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b7423",
                        "IdDistrito": 24,
                        "Distrito": "Tierra del Fuego, Antártida e Islas del Atlántico Sur",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b7424",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7425",
                                        "IdSeccion": 1,
                                        "Seccion": "Ushuaia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7426",
                                        "IdSeccion": 2,
                                        "Seccion": "Río Grande"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7427",
                                        "IdSeccion": 3,
                                        "Seccion": "Antártida Argentina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7428",
                                        "IdSeccion": 5,
                                        "Seccion": "Tolhuin"
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                "_id": "66134fd690a68119101b7429",
                "IdCargo": "9",
                "Cargo": "PARLAMENTO MERCOSUR REGIONAL",
                "Distritos": [
                    {
                        "_id": "66134fd690a68119101b742a",
                        "IdDistrito": 1,
                        "Distrito": "Ciudad Autónoma de Buenos Aires",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b742b",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b742c",
                                        "IdSeccion": 1,
                                        "Seccion": "Comuna 01"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b742d",
                                        "IdSeccion": 2,
                                        "Seccion": "Comuna 02"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b742e",
                                        "IdSeccion": 3,
                                        "Seccion": "Comuna 03"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b742f",
                                        "IdSeccion": 4,
                                        "Seccion": "Comuna 04"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7430",
                                        "IdSeccion": 5,
                                        "Seccion": "Comuna 05"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7431",
                                        "IdSeccion": 6,
                                        "Seccion": "Comuna 06"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7432",
                                        "IdSeccion": 7,
                                        "Seccion": "Comuna 07"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7433",
                                        "IdSeccion": 8,
                                        "Seccion": "Comuna 08"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7434",
                                        "IdSeccion": 9,
                                        "Seccion": "Comuna 09"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7435",
                                        "IdSeccion": 10,
                                        "Seccion": "Comuna 10"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7436",
                                        "IdSeccion": 11,
                                        "Seccion": "Comuna 11"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7437",
                                        "IdSeccion": 12,
                                        "Seccion": "Comuna 12"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7438",
                                        "IdSeccion": 13,
                                        "Seccion": "Comuna 13"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7439",
                                        "IdSeccion": 14,
                                        "Seccion": "Comuna 14"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b743a",
                                        "IdSeccion": 15,
                                        "Seccion": "Comuna 15"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b743b",
                        "IdDistrito": 2,
                        "Distrito": "Buenos Aires",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b743c",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b743d",
                                        "IdSeccion": 1,
                                        "Seccion": "Adolfo Alsina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b743e",
                                        "IdSeccion": 2,
                                        "Seccion": "Alberti"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b743f",
                                        "IdSeccion": 3,
                                        "Seccion": "Almirante Brown"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7440",
                                        "IdSeccion": 4,
                                        "Seccion": "Avellaneda"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7441",
                                        "IdSeccion": 5,
                                        "Seccion": "Ayacucho"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7442",
                                        "IdSeccion": 6,
                                        "Seccion": "Azul"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7443",
                                        "IdSeccion": 7,
                                        "Seccion": "Bahía Blanca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7444",
                                        "IdSeccion": 8,
                                        "Seccion": "Balcarce"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7445",
                                        "IdSeccion": 9,
                                        "Seccion": "Baradero"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7446",
                                        "IdSeccion": 10,
                                        "Seccion": "Arrecifes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7447",
                                        "IdSeccion": 11,
                                        "Seccion": "Berazategui"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7448",
                                        "IdSeccion": 12,
                                        "Seccion": "Berisso"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7449",
                                        "IdSeccion": 13,
                                        "Seccion": "Bolívar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b744a",
                                        "IdSeccion": 14,
                                        "Seccion": "Bragado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b744b",
                                        "IdSeccion": 15,
                                        "Seccion": "Brandsen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b744c",
                                        "IdSeccion": 16,
                                        "Seccion": "Campana"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b744d",
                                        "IdSeccion": 17,
                                        "Seccion": "Cañuelas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b744e",
                                        "IdSeccion": 18,
                                        "Seccion": "Capitán Sarmiento"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b744f",
                                        "IdSeccion": 19,
                                        "Seccion": "Carlos Casares"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7450",
                                        "IdSeccion": 20,
                                        "Seccion": "Carlos Tejedor"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7451",
                                        "IdSeccion": 21,
                                        "Seccion": "Carmen de Areco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7452",
                                        "IdSeccion": 22,
                                        "Seccion": "Patagones"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7453",
                                        "IdSeccion": 23,
                                        "Seccion": "Castelli"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7454",
                                        "IdSeccion": 24,
                                        "Seccion": "Colón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7455",
                                        "IdSeccion": 25,
                                        "Seccion": "Coronel Dorrego"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7456",
                                        "IdSeccion": 26,
                                        "Seccion": "Coronel Pringles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7457",
                                        "IdSeccion": 27,
                                        "Seccion": "Coronel de Marina L. Rosales"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7458",
                                        "IdSeccion": 28,
                                        "Seccion": "Coronel Suárez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7459",
                                        "IdSeccion": 29,
                                        "Seccion": "Chacabuco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b745a",
                                        "IdSeccion": 30,
                                        "Seccion": "Chascomús"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b745b",
                                        "IdSeccion": 31,
                                        "Seccion": "Chivilcoy"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b745c",
                                        "IdSeccion": 32,
                                        "Seccion": "Daireaux"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b745d",
                                        "IdSeccion": 33,
                                        "Seccion": "Dolores"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b745e",
                                        "IdSeccion": 34,
                                        "Seccion": "Ensenada"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b745f",
                                        "IdSeccion": 35,
                                        "Seccion": "Escobar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7460",
                                        "IdSeccion": 36,
                                        "Seccion": "Esteban Echeverría"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7461",
                                        "IdSeccion": 37,
                                        "Seccion": "Exaltación de la Cruz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7462",
                                        "IdSeccion": 38,
                                        "Seccion": "Florencio Varela"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7463",
                                        "IdSeccion": 39,
                                        "Seccion": "General Alvarado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7464",
                                        "IdSeccion": 40,
                                        "Seccion": "General Alvear"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7465",
                                        "IdSeccion": 41,
                                        "Seccion": "General Arenales"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7466",
                                        "IdSeccion": 42,
                                        "Seccion": "General Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7467",
                                        "IdSeccion": 43,
                                        "Seccion": "General Guido"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7468",
                                        "IdSeccion": 44,
                                        "Seccion": "General La Madrid"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7469",
                                        "IdSeccion": 45,
                                        "Seccion": "General Las Heras"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b746a",
                                        "IdSeccion": 46,
                                        "Seccion": "General Lavalle"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b746b",
                                        "IdSeccion": 47,
                                        "Seccion": "General Juan Madariaga"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b746c",
                                        "IdSeccion": 48,
                                        "Seccion": "General Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b746d",
                                        "IdSeccion": 49,
                                        "Seccion": "General Pinto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b746e",
                                        "IdSeccion": 50,
                                        "Seccion": "General Pueyrredón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b746f",
                                        "IdSeccion": 51,
                                        "Seccion": "General Rodríguez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7470",
                                        "IdSeccion": 52,
                                        "Seccion": "General San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7471",
                                        "IdSeccion": 53,
                                        "Seccion": "San Miguel"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7472",
                                        "IdSeccion": 54,
                                        "Seccion": "General Viamonte"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7473",
                                        "IdSeccion": 55,
                                        "Seccion": "General Villegas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7474",
                                        "IdSeccion": 56,
                                        "Seccion": "Adolfo Gonzales Chaves"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7475",
                                        "IdSeccion": 57,
                                        "Seccion": "Guaminí"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7476",
                                        "IdSeccion": 58,
                                        "Seccion": "Hipólito Yrigoyen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7477",
                                        "IdSeccion": 59,
                                        "Seccion": "Benito Juárez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7478",
                                        "IdSeccion": 60,
                                        "Seccion": "Junín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7479",
                                        "IdSeccion": 61,
                                        "Seccion": "La Matanza"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b747a",
                                        "IdSeccion": 62,
                                        "Seccion": "Lanús"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b747b",
                                        "IdSeccion": 63,
                                        "Seccion": "La Plata"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b747c",
                                        "IdSeccion": 64,
                                        "Seccion": "Laprida"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b747d",
                                        "IdSeccion": 65,
                                        "Seccion": "Las Flores"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b747e",
                                        "IdSeccion": 66,
                                        "Seccion": "Leandro N. Alem"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b747f",
                                        "IdSeccion": 67,
                                        "Seccion": "Lincoln"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7480",
                                        "IdSeccion": 68,
                                        "Seccion": "Lobería"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7481",
                                        "IdSeccion": 69,
                                        "Seccion": "Lobos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7482",
                                        "IdSeccion": 70,
                                        "Seccion": "Lomas de Zamora"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7483",
                                        "IdSeccion": 71,
                                        "Seccion": "Luján"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7484",
                                        "IdSeccion": 72,
                                        "Seccion": "Magdalena"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7485",
                                        "IdSeccion": 73,
                                        "Seccion": "Maipú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7486",
                                        "IdSeccion": 74,
                                        "Seccion": "Mar Chiquita"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7487",
                                        "IdSeccion": 75,
                                        "Seccion": "Marcos Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7488",
                                        "IdSeccion": 76,
                                        "Seccion": "Mercedes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7489",
                                        "IdSeccion": 77,
                                        "Seccion": "Merlo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b748a",
                                        "IdSeccion": 78,
                                        "Seccion": "Monte"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b748b",
                                        "IdSeccion": 79,
                                        "Seccion": "Moreno"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b748c",
                                        "IdSeccion": 80,
                                        "Seccion": "Morón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b748d",
                                        "IdSeccion": 81,
                                        "Seccion": "Navarro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b748e",
                                        "IdSeccion": 82,
                                        "Seccion": "Necochea"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b748f",
                                        "IdSeccion": 83,
                                        "Seccion": "9 de Julio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7490",
                                        "IdSeccion": 84,
                                        "Seccion": "Olavarría"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7491",
                                        "IdSeccion": 85,
                                        "Seccion": "Pehuajó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7492",
                                        "IdSeccion": 86,
                                        "Seccion": "Pellegrini"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7493",
                                        "IdSeccion": 87,
                                        "Seccion": "Pergamino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7494",
                                        "IdSeccion": 88,
                                        "Seccion": "Pila"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7495",
                                        "IdSeccion": 89,
                                        "Seccion": "Pilar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7496",
                                        "IdSeccion": 90,
                                        "Seccion": "Pinamar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7497",
                                        "IdSeccion": 91,
                                        "Seccion": "Puan"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7498",
                                        "IdSeccion": 92,
                                        "Seccion": "Quilmes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7499",
                                        "IdSeccion": 93,
                                        "Seccion": "Ramallo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b749a",
                                        "IdSeccion": 94,
                                        "Seccion": "Rauch"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b749b",
                                        "IdSeccion": 95,
                                        "Seccion": "Rivadavia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b749c",
                                        "IdSeccion": 96,
                                        "Seccion": "Rojas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b749d",
                                        "IdSeccion": 97,
                                        "Seccion": "Roque Pérez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b749e",
                                        "IdSeccion": 98,
                                        "Seccion": "Saavedra"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b749f",
                                        "IdSeccion": 99,
                                        "Seccion": "Saladillo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74a0",
                                        "IdSeccion": 100,
                                        "Seccion": "Salliqueló"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74a1",
                                        "IdSeccion": 101,
                                        "Seccion": "Salto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74a2",
                                        "IdSeccion": 102,
                                        "Seccion": "San Andrés de Giles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74a3",
                                        "IdSeccion": 103,
                                        "Seccion": "San Antonio de Areco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74a4",
                                        "IdSeccion": 104,
                                        "Seccion": "San Cayetano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74a5",
                                        "IdSeccion": 105,
                                        "Seccion": "San Fernando"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74a6",
                                        "IdSeccion": 106,
                                        "Seccion": "San Isidro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74a7",
                                        "IdSeccion": 107,
                                        "Seccion": "San Nicolás"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74a8",
                                        "IdSeccion": 108,
                                        "Seccion": "San Pedro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74a9",
                                        "IdSeccion": 109,
                                        "Seccion": "San Vicente"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74aa",
                                        "IdSeccion": 110,
                                        "Seccion": "Suipacha"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74ab",
                                        "IdSeccion": 111,
                                        "Seccion": "Tandil"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74ac",
                                        "IdSeccion": 112,
                                        "Seccion": "Tapalqué"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74ad",
                                        "IdSeccion": 113,
                                        "Seccion": "Tigre"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74ae",
                                        "IdSeccion": 114,
                                        "Seccion": "Tornquist"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74af",
                                        "IdSeccion": 115,
                                        "Seccion": "Trenque Lauquen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74b0",
                                        "IdSeccion": 116,
                                        "Seccion": "Tordillo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74b1",
                                        "IdSeccion": 117,
                                        "Seccion": "Tres Arroyos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74b2",
                                        "IdSeccion": 118,
                                        "Seccion": "Tres de Febrero"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74b3",
                                        "IdSeccion": 119,
                                        "Seccion": "La Costa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74b4",
                                        "IdSeccion": 120,
                                        "Seccion": "Monte Hermoso"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74b5",
                                        "IdSeccion": 121,
                                        "Seccion": "25 de Mayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74b6",
                                        "IdSeccion": 122,
                                        "Seccion": "Vicente López"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74b7",
                                        "IdSeccion": 123,
                                        "Seccion": "Villa Gesell"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74b8",
                                        "IdSeccion": 124,
                                        "Seccion": "Villarino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74b9",
                                        "IdSeccion": 125,
                                        "Seccion": "Zárate"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74ba",
                                        "IdSeccion": 126,
                                        "Seccion": "Tres Lomas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74bb",
                                        "IdSeccion": 127,
                                        "Seccion": "Florentino Ameghino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74bc",
                                        "IdSeccion": 128,
                                        "Seccion": "Presidente Perón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74bd",
                                        "IdSeccion": 129,
                                        "Seccion": "José C. Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74be",
                                        "IdSeccion": 130,
                                        "Seccion": "Malvinas Argentinas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74bf",
                                        "IdSeccion": 131,
                                        "Seccion": "Punta Indio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74c0",
                                        "IdSeccion": 132,
                                        "Seccion": "Ezeiza"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74c1",
                                        "IdSeccion": 133,
                                        "Seccion": "Ituzaingó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74c2",
                                        "IdSeccion": 134,
                                        "Seccion": "Hurlingham"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74c3",
                                        "IdSeccion": 135,
                                        "Seccion": "Lezama"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b74c4",
                        "IdDistrito": 3,
                        "Distrito": "Catamarca",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b74c5",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b74c6",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74c7",
                                        "IdSeccion": 2,
                                        "Seccion": "Capayán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74c8",
                                        "IdSeccion": 3,
                                        "Seccion": "La Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74c9",
                                        "IdSeccion": 4,
                                        "Seccion": "Ancasti"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74ca",
                                        "IdSeccion": 5,
                                        "Seccion": "El Alto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74cb",
                                        "IdSeccion": 6,
                                        "Seccion": "Santa Rosa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74cc",
                                        "IdSeccion": 7,
                                        "Seccion": "Paclín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74cd",
                                        "IdSeccion": 8,
                                        "Seccion": "Valle Viejo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74ce",
                                        "IdSeccion": 9,
                                        "Seccion": "Fray Mamerto Esquiú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74cf",
                                        "IdSeccion": 10,
                                        "Seccion": "Ambato"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74d0",
                                        "IdSeccion": 11,
                                        "Seccion": "Pomán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74d1",
                                        "IdSeccion": 12,
                                        "Seccion": "Andalgalá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74d2",
                                        "IdSeccion": 13,
                                        "Seccion": "Belén"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74d3",
                                        "IdSeccion": 14,
                                        "Seccion": "Antofagasta de la Sierra"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74d4",
                                        "IdSeccion": 15,
                                        "Seccion": "Tinogasta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74d5",
                                        "IdSeccion": 16,
                                        "Seccion": "Santa María"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b74d6",
                        "IdDistrito": 4,
                        "Distrito": "Córdoba",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b74d7",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b74d8",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74d9",
                                        "IdSeccion": 2,
                                        "Seccion": "Calamuchita"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74da",
                                        "IdSeccion": 3,
                                        "Seccion": "Colón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74db",
                                        "IdSeccion": 4,
                                        "Seccion": "Cruz del Eje"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74dc",
                                        "IdSeccion": 5,
                                        "Seccion": "General Roca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74dd",
                                        "IdSeccion": 6,
                                        "Seccion": "General San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74de",
                                        "IdSeccion": 7,
                                        "Seccion": "Ischilín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74df",
                                        "IdSeccion": 8,
                                        "Seccion": "Juárez Celman"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74e0",
                                        "IdSeccion": 9,
                                        "Seccion": "Marcos Juárez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74e1",
                                        "IdSeccion": 10,
                                        "Seccion": "Minas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74e2",
                                        "IdSeccion": 11,
                                        "Seccion": "Pocho"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74e3",
                                        "IdSeccion": 12,
                                        "Seccion": "Punilla"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74e4",
                                        "IdSeccion": 13,
                                        "Seccion": "Río Cuarto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74e5",
                                        "IdSeccion": 14,
                                        "Seccion": "Río Primero"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74e6",
                                        "IdSeccion": 15,
                                        "Seccion": "Río Seco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74e7",
                                        "IdSeccion": 16,
                                        "Seccion": "Río Segundo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74e8",
                                        "IdSeccion": 17,
                                        "Seccion": "Presidente Roque Sáenz Peña"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74e9",
                                        "IdSeccion": 18,
                                        "Seccion": "San Alberto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74ea",
                                        "IdSeccion": 19,
                                        "Seccion": "San Javier"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74eb",
                                        "IdSeccion": 20,
                                        "Seccion": "San Justo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74ec",
                                        "IdSeccion": 21,
                                        "Seccion": "Santa María"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74ed",
                                        "IdSeccion": 22,
                                        "Seccion": "Sobremonte"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74ee",
                                        "IdSeccion": 23,
                                        "Seccion": "Tercero Arriba"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74ef",
                                        "IdSeccion": 24,
                                        "Seccion": "Totoral"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74f0",
                                        "IdSeccion": 25,
                                        "Seccion": "Tulumba"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74f1",
                                        "IdSeccion": 26,
                                        "Seccion": "Unión"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b74f2",
                        "IdDistrito": 5,
                        "Distrito": "Corrientes",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b74f3",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b74f4",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74f5",
                                        "IdSeccion": 2,
                                        "Seccion": "Goya"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74f6",
                                        "IdSeccion": 3,
                                        "Seccion": "Curuzú Cuatiá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74f7",
                                        "IdSeccion": 4,
                                        "Seccion": "Mercedes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74f8",
                                        "IdSeccion": 5,
                                        "Seccion": "Esquina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74f9",
                                        "IdSeccion": 6,
                                        "Seccion": "Lavalle"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74fa",
                                        "IdSeccion": 7,
                                        "Seccion": "Santo Tomé"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74fb",
                                        "IdSeccion": 8,
                                        "Seccion": "Paso de los Libres"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74fc",
                                        "IdSeccion": 9,
                                        "Seccion": "Monte Caseros"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74fd",
                                        "IdSeccion": 10,
                                        "Seccion": "San Luis del Palmar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74fe",
                                        "IdSeccion": 11,
                                        "Seccion": "Bella Vista"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b74ff",
                                        "IdSeccion": 12,
                                        "Seccion": "Empedrado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7500",
                                        "IdSeccion": 13,
                                        "Seccion": "San Roque"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7501",
                                        "IdSeccion": 14,
                                        "Seccion": "General Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7502",
                                        "IdSeccion": 15,
                                        "Seccion": "Saladas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7503",
                                        "IdSeccion": 16,
                                        "Seccion": "San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7504",
                                        "IdSeccion": 17,
                                        "Seccion": "Concepción"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7505",
                                        "IdSeccion": 18,
                                        "Seccion": "Mburucuyá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7506",
                                        "IdSeccion": 19,
                                        "Seccion": "Ituzaingó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7507",
                                        "IdSeccion": 20,
                                        "Seccion": "Sauce"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7508",
                                        "IdSeccion": 21,
                                        "Seccion": "San Cosme"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7509",
                                        "IdSeccion": 22,
                                        "Seccion": "General Alvear"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b750a",
                                        "IdSeccion": 23,
                                        "Seccion": "San Miguel"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b750b",
                                        "IdSeccion": 24,
                                        "Seccion": "Itatí"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b750c",
                                        "IdSeccion": 25,
                                        "Seccion": "Berón de Astrada"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b750d",
                        "IdDistrito": 6,
                        "Distrito": "Chaco",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b750e",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b750f",
                                        "IdSeccion": 1,
                                        "Seccion": "San Fernando"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7510",
                                        "IdSeccion": 2,
                                        "Seccion": "1º de Mayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7511",
                                        "IdSeccion": 3,
                                        "Seccion": "Libertad"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7512",
                                        "IdSeccion": 4,
                                        "Seccion": "General Donovan"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7513",
                                        "IdSeccion": 5,
                                        "Seccion": "Sargento Cabral"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7514",
                                        "IdSeccion": 6,
                                        "Seccion": "Presidencia de la Plaza"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7515",
                                        "IdSeccion": 7,
                                        "Seccion": "Bermejo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7516",
                                        "IdSeccion": 8,
                                        "Seccion": "Libertador General San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7517",
                                        "IdSeccion": 9,
                                        "Seccion": "Tapenagá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7518",
                                        "IdSeccion": 10,
                                        "Seccion": "San Lorenzo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7519",
                                        "IdSeccion": 11,
                                        "Seccion": "Mayor Luis J. Fontana"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b751a",
                                        "IdSeccion": 12,
                                        "Seccion": "O'Higgins"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b751b",
                                        "IdSeccion": 13,
                                        "Seccion": "Comandante Fernández"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b751c",
                                        "IdSeccion": 14,
                                        "Seccion": "Quitilipi"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b751d",
                                        "IdSeccion": 15,
                                        "Seccion": "25 de Mayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b751e",
                                        "IdSeccion": 16,
                                        "Seccion": "Maipú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b751f",
                                        "IdSeccion": 17,
                                        "Seccion": "Independencia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7520",
                                        "IdSeccion": 18,
                                        "Seccion": "General Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7521",
                                        "IdSeccion": 19,
                                        "Seccion": "9 de Julio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7522",
                                        "IdSeccion": 20,
                                        "Seccion": "Chacabuco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7523",
                                        "IdSeccion": 21,
                                        "Seccion": "12 de Octubre"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7524",
                                        "IdSeccion": 22,
                                        "Seccion": "2 de Abril"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7525",
                                        "IdSeccion": 23,
                                        "Seccion": "Fray Justo Santa María de Oro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7526",
                                        "IdSeccion": 24,
                                        "Seccion": "Almirante Brown"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7527",
                                        "IdSeccion": 25,
                                        "Seccion": "General Güemes"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b7528",
                        "IdDistrito": 7,
                        "Distrito": "Chubut",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b7529",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b752a",
                                        "IdSeccion": 1,
                                        "Seccion": "Rawson"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b752b",
                                        "IdSeccion": 2,
                                        "Seccion": "Biedma"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b752c",
                                        "IdSeccion": 3,
                                        "Seccion": "Telsen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b752d",
                                        "IdSeccion": 4,
                                        "Seccion": "Gastre"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b752e",
                                        "IdSeccion": 5,
                                        "Seccion": "Cushamen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b752f",
                                        "IdSeccion": 6,
                                        "Seccion": "Futaleufú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7530",
                                        "IdSeccion": 7,
                                        "Seccion": "Languiñeo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7531",
                                        "IdSeccion": 8,
                                        "Seccion": "Tehuelches"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7532",
                                        "IdSeccion": 9,
                                        "Seccion": "Paso de Indios"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7533",
                                        "IdSeccion": 10,
                                        "Seccion": "Mártires"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7534",
                                        "IdSeccion": 11,
                                        "Seccion": "Florentino Ameghino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7535",
                                        "IdSeccion": 12,
                                        "Seccion": "Gaiman"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7536",
                                        "IdSeccion": 13,
                                        "Seccion": "Río Senguer"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7537",
                                        "IdSeccion": 14,
                                        "Seccion": "Sarmiento"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7538",
                                        "IdSeccion": 15,
                                        "Seccion": "Escalante"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b7539",
                        "IdDistrito": 8,
                        "Distrito": "Entre Ríos",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b753a",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b753b",
                                        "IdSeccion": 1,
                                        "Seccion": "Paraná"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b753c",
                                        "IdSeccion": 3,
                                        "Seccion": "La Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b753d",
                                        "IdSeccion": 4,
                                        "Seccion": "Diamante"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b753e",
                                        "IdSeccion": 5,
                                        "Seccion": "Victoria"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b753f",
                                        "IdSeccion": 6,
                                        "Seccion": "Nogoyá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7540",
                                        "IdSeccion": 7,
                                        "Seccion": "Gualeguay"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7541",
                                        "IdSeccion": 8,
                                        "Seccion": "Tala"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7542",
                                        "IdSeccion": 9,
                                        "Seccion": "Uruguay"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7543",
                                        "IdSeccion": 10,
                                        "Seccion": "Gualeguaychú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7544",
                                        "IdSeccion": 11,
                                        "Seccion": "Islas del Ibicuy"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7545",
                                        "IdSeccion": 12,
                                        "Seccion": "Villaguay"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7546",
                                        "IdSeccion": 13,
                                        "Seccion": "Concordia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7547",
                                        "IdSeccion": 14,
                                        "Seccion": "Federal"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7548",
                                        "IdSeccion": 15,
                                        "Seccion": "Colón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7549",
                                        "IdSeccion": 16,
                                        "Seccion": "Feliciano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b754a",
                                        "IdSeccion": 17,
                                        "Seccion": "Federación"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b754b",
                                        "IdSeccion": 18,
                                        "Seccion": "San Salvador"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b754c",
                        "IdDistrito": 9,
                        "Distrito": "Formosa",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b754d",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b754e",
                                        "IdSeccion": 1,
                                        "Seccion": "Formosa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b754f",
                                        "IdSeccion": 2,
                                        "Seccion": "Laishí"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7550",
                                        "IdSeccion": 3,
                                        "Seccion": "Pilcomayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7551",
                                        "IdSeccion": 4,
                                        "Seccion": "Pirané"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7552",
                                        "IdSeccion": 5,
                                        "Seccion": "Pilagás"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7553",
                                        "IdSeccion": 6,
                                        "Seccion": "Patiño"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7554",
                                        "IdSeccion": 7,
                                        "Seccion": "Bermejo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7555",
                                        "IdSeccion": 8,
                                        "Seccion": "Matacos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7556",
                                        "IdSeccion": 9,
                                        "Seccion": "Ramón Lista"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b7557",
                        "IdDistrito": 10,
                        "Distrito": "Jujuy",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b7558",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7559",
                                        "IdSeccion": 1,
                                        "Seccion": "Dr. Manuel Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b755a",
                                        "IdSeccion": 2,
                                        "Seccion": "Palpalá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b755b",
                                        "IdSeccion": 3,
                                        "Seccion": "San Antonio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b755c",
                                        "IdSeccion": 4,
                                        "Seccion": "El Carmen"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b755d",
                                        "IdSeccion": 5,
                                        "Seccion": "San Pedro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b755e",
                                        "IdSeccion": 6,
                                        "Seccion": "Santa Bárbara"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b755f",
                                        "IdSeccion": 7,
                                        "Seccion": "Ledesma"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7560",
                                        "IdSeccion": 8,
                                        "Seccion": "Valle Grande"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7561",
                                        "IdSeccion": 9,
                                        "Seccion": "Tumbaya"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7562",
                                        "IdSeccion": 10,
                                        "Seccion": "Tilcara"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7563",
                                        "IdSeccion": 11,
                                        "Seccion": "Humahuaca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7564",
                                        "IdSeccion": 12,
                                        "Seccion": "Cochinoca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7565",
                                        "IdSeccion": 13,
                                        "Seccion": "Rinconada"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7566",
                                        "IdSeccion": 14,
                                        "Seccion": "Santa Catalina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7567",
                                        "IdSeccion": 15,
                                        "Seccion": "Yavi"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7568",
                                        "IdSeccion": 16,
                                        "Seccion": "Susques"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b7569",
                        "IdDistrito": 11,
                        "Distrito": "La Pampa",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b756a",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b756b",
                                        "IdSeccion": 1,
                                        "Seccion": "Atreucó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b756c",
                                        "IdSeccion": 2,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b756d",
                                        "IdSeccion": 3,
                                        "Seccion": "Caleu Caleu"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b756e",
                                        "IdSeccion": 4,
                                        "Seccion": "Catriló"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b756f",
                                        "IdSeccion": 5,
                                        "Seccion": "Chalileo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7570",
                                        "IdSeccion": 6,
                                        "Seccion": "Chapaleufú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7571",
                                        "IdSeccion": 7,
                                        "Seccion": "Chical Có"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7572",
                                        "IdSeccion": 8,
                                        "Seccion": "Conhelo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7573",
                                        "IdSeccion": 9,
                                        "Seccion": "Curacó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7574",
                                        "IdSeccion": 10,
                                        "Seccion": "Guatraché"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7575",
                                        "IdSeccion": 11,
                                        "Seccion": "Hucal"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7576",
                                        "IdSeccion": 12,
                                        "Seccion": "Loventué"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7577",
                                        "IdSeccion": 13,
                                        "Seccion": "Lihuel Calel"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7578",
                                        "IdSeccion": 14,
                                        "Seccion": "Limay Mahuida"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7579",
                                        "IdSeccion": 15,
                                        "Seccion": "Maracó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b757a",
                                        "IdSeccion": 16,
                                        "Seccion": "Puelén"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b757b",
                                        "IdSeccion": 17,
                                        "Seccion": "Quemú Quemú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b757c",
                                        "IdSeccion": 18,
                                        "Seccion": "Rancul"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b757d",
                                        "IdSeccion": 19,
                                        "Seccion": "Realicó"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b757e",
                                        "IdSeccion": 20,
                                        "Seccion": "Toay"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b757f",
                                        "IdSeccion": 21,
                                        "Seccion": "Trenel"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7580",
                                        "IdSeccion": 22,
                                        "Seccion": "Utracán"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b7581",
                        "IdDistrito": 12,
                        "Distrito": "La Rioja",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b7582",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7583",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7584",
                                        "IdSeccion": 2,
                                        "Seccion": "Sanagasta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7585",
                                        "IdSeccion": 3,
                                        "Seccion": "Castro Barros"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7586",
                                        "IdSeccion": 4,
                                        "Seccion": "Arauco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7587",
                                        "IdSeccion": 5,
                                        "Seccion": "San Blas de los Sauces"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7588",
                                        "IdSeccion": 6,
                                        "Seccion": "Chilecito"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7589",
                                        "IdSeccion": 7,
                                        "Seccion": "Famatina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b758a",
                                        "IdSeccion": 8,
                                        "Seccion": "Coronel Felipe Varela"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b758b",
                                        "IdSeccion": 9,
                                        "Seccion": "General Lamadrid"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b758c",
                                        "IdSeccion": 10,
                                        "Seccion": "Vinchina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b758d",
                                        "IdSeccion": 11,
                                        "Seccion": "Independencia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b758e",
                                        "IdSeccion": 12,
                                        "Seccion": "Chamical"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b758f",
                                        "IdSeccion": 13,
                                        "Seccion": "Ángel Vicente Peñaloza"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7590",
                                        "IdSeccion": 14,
                                        "Seccion": "General Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7591",
                                        "IdSeccion": 15,
                                        "Seccion": "General Juan Facundo Quiroga"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7592",
                                        "IdSeccion": 16,
                                        "Seccion": "General Ortiz de Ocampo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7593",
                                        "IdSeccion": 17,
                                        "Seccion": "Rosario Vera Peñaloza"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7594",
                                        "IdSeccion": 18,
                                        "Seccion": "General San Martín"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b7595",
                        "IdDistrito": 13,
                        "Distrito": "Mendoza",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b7596",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7597",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7598",
                                        "IdSeccion": 2,
                                        "Seccion": "Godoy Cruz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7599",
                                        "IdSeccion": 3,
                                        "Seccion": "Guaymallén"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b759a",
                                        "IdSeccion": 4,
                                        "Seccion": "Las Heras"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b759b",
                                        "IdSeccion": 5,
                                        "Seccion": "Lavalle"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b759c",
                                        "IdSeccion": 6,
                                        "Seccion": "Maipú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b759d",
                                        "IdSeccion": 7,
                                        "Seccion": "Luján de Cuyo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b759e",
                                        "IdSeccion": 8,
                                        "Seccion": "Tupungato"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b759f",
                                        "IdSeccion": 9,
                                        "Seccion": "San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75a0",
                                        "IdSeccion": 10,
                                        "Seccion": "Junín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75a1",
                                        "IdSeccion": 11,
                                        "Seccion": "Rivadavia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75a2",
                                        "IdSeccion": 12,
                                        "Seccion": "Tunuyán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75a3",
                                        "IdSeccion": 13,
                                        "Seccion": "San Carlos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75a4",
                                        "IdSeccion": 14,
                                        "Seccion": "Santa Rosa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75a5",
                                        "IdSeccion": 15,
                                        "Seccion": "La Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75a6",
                                        "IdSeccion": 16,
                                        "Seccion": "San Rafael"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75a7",
                                        "IdSeccion": 17,
                                        "Seccion": "Malargüe"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75a8",
                                        "IdSeccion": 18,
                                        "Seccion": "General Alvear"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b75a9",
                        "IdDistrito": 14,
                        "Distrito": "Misiones",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b75aa",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b75ab",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75ac",
                                        "IdSeccion": 2,
                                        "Seccion": "Apóstoles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75ad",
                                        "IdSeccion": 3,
                                        "Seccion": "Candelaria"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75ae",
                                        "IdSeccion": 4,
                                        "Seccion": "Leandro N. Alem"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75af",
                                        "IdSeccion": 5,
                                        "Seccion": "Concepción"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75b0",
                                        "IdSeccion": 6,
                                        "Seccion": "San Javier"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75b1",
                                        "IdSeccion": 7,
                                        "Seccion": "San Ignacio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75b2",
                                        "IdSeccion": 8,
                                        "Seccion": "Oberá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75b3",
                                        "IdSeccion": 9,
                                        "Seccion": "Libertador General San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75b4",
                                        "IdSeccion": 10,
                                        "Seccion": "Cainguás"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75b5",
                                        "IdSeccion": 11,
                                        "Seccion": "25 de Mayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75b6",
                                        "IdSeccion": 12,
                                        "Seccion": "Montecarlo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75b7",
                                        "IdSeccion": 13,
                                        "Seccion": "Guaraní"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75b8",
                                        "IdSeccion": 14,
                                        "Seccion": "Eldorado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75b9",
                                        "IdSeccion": 15,
                                        "Seccion": "San Pedro"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75ba",
                                        "IdSeccion": 16,
                                        "Seccion": "Iguazú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75bb",
                                        "IdSeccion": 17,
                                        "Seccion": "General Manuel Belgrano"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b75bc",
                        "IdDistrito": 15,
                        "Distrito": "Neuquén",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b75bd",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b75be",
                                        "IdSeccion": 1,
                                        "Seccion": "Confluencia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75bf",
                                        "IdSeccion": 2,
                                        "Seccion": "Zapala"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75c0",
                                        "IdSeccion": 3,
                                        "Seccion": "Añelo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75c1",
                                        "IdSeccion": 4,
                                        "Seccion": "Pehuenches"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75c2",
                                        "IdSeccion": 5,
                                        "Seccion": "Chos Malal"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75c3",
                                        "IdSeccion": 6,
                                        "Seccion": "Minas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75c4",
                                        "IdSeccion": 7,
                                        "Seccion": "Ñorquín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75c5",
                                        "IdSeccion": 8,
                                        "Seccion": "Loncopué"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75c6",
                                        "IdSeccion": 9,
                                        "Seccion": "Picunches"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75c7",
                                        "IdSeccion": 10,
                                        "Seccion": "Aluminé"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75c8",
                                        "IdSeccion": 11,
                                        "Seccion": "Catán Lil"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75c9",
                                        "IdSeccion": 12,
                                        "Seccion": "Picún Leufú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75ca",
                                        "IdSeccion": 13,
                                        "Seccion": "Collón Curá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75cb",
                                        "IdSeccion": 14,
                                        "Seccion": "Huiliches"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75cc",
                                        "IdSeccion": 15,
                                        "Seccion": "Lácar"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75cd",
                                        "IdSeccion": 16,
                                        "Seccion": "Los Lagos"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b75ce",
                        "IdDistrito": 16,
                        "Distrito": "Río Negro",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b75cf",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b75d0",
                                        "IdSeccion": 1,
                                        "Seccion": "Adolfo Alsina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75d1",
                                        "IdSeccion": 2,
                                        "Seccion": "Conesa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75d2",
                                        "IdSeccion": 3,
                                        "Seccion": "San Antonio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75d3",
                                        "IdSeccion": 4,
                                        "Seccion": "Valcheta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75d4",
                                        "IdSeccion": 5,
                                        "Seccion": "9 de Julio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75d5",
                                        "IdSeccion": 6,
                                        "Seccion": "25 de Mayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75d6",
                                        "IdSeccion": 7,
                                        "Seccion": "Ñorquinco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75d7",
                                        "IdSeccion": 8,
                                        "Seccion": "Pilcaniyeu"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75d8",
                                        "IdSeccion": 9,
                                        "Seccion": "Bariloche"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75d9",
                                        "IdSeccion": 10,
                                        "Seccion": "Pichi Mahuida"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75da",
                                        "IdSeccion": 11,
                                        "Seccion": "Avellaneda"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75db",
                                        "IdSeccion": 12,
                                        "Seccion": "General Roca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75dc",
                                        "IdSeccion": 13,
                                        "Seccion": "El Cuy"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b75dd",
                        "IdDistrito": 17,
                        "Distrito": "Salta",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b75de",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b75df",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75e0",
                                        "IdSeccion": 2,
                                        "Seccion": "La Caldera"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75e1",
                                        "IdSeccion": 3,
                                        "Seccion": "General Güemes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75e2",
                                        "IdSeccion": 4,
                                        "Seccion": "Metán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75e3",
                                        "IdSeccion": 5,
                                        "Seccion": "Anta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75e4",
                                        "IdSeccion": 6,
                                        "Seccion": "Rivadavia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75e5",
                                        "IdSeccion": 7,
                                        "Seccion": "Orán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75e6",
                                        "IdSeccion": 8,
                                        "Seccion": "General José de San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75e7",
                                        "IdSeccion": 9,
                                        "Seccion": "Iruya"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75e8",
                                        "IdSeccion": 10,
                                        "Seccion": "Santa Victoria"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75e9",
                                        "IdSeccion": 11,
                                        "Seccion": "Cerrillos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75ea",
                                        "IdSeccion": 12,
                                        "Seccion": "Chicoana"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75eb",
                                        "IdSeccion": 13,
                                        "Seccion": "La Viña"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75ec",
                                        "IdSeccion": 14,
                                        "Seccion": "Guachipas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75ed",
                                        "IdSeccion": 15,
                                        "Seccion": "Rosario de la Frontera"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75ee",
                                        "IdSeccion": 16,
                                        "Seccion": "La Candelaria"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75ef",
                                        "IdSeccion": 17,
                                        "Seccion": "Cafayate"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75f0",
                                        "IdSeccion": 18,
                                        "Seccion": "San Carlos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75f1",
                                        "IdSeccion": 19,
                                        "Seccion": "Molinos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75f2",
                                        "IdSeccion": 20,
                                        "Seccion": "Cachi"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75f3",
                                        "IdSeccion": 21,
                                        "Seccion": "Rosario de Lerma"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75f4",
                                        "IdSeccion": 22,
                                        "Seccion": "La Poma"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75f5",
                                        "IdSeccion": 23,
                                        "Seccion": "Los Andes"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b75f6",
                        "IdDistrito": 18,
                        "Distrito": "San Juan",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b75f7",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b75f8",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75f9",
                                        "IdSeccion": 2,
                                        "Seccion": "Santa Lucía"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75fa",
                                        "IdSeccion": 3,
                                        "Seccion": "Chimbas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75fb",
                                        "IdSeccion": 4,
                                        "Seccion": "Rivadavia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75fc",
                                        "IdSeccion": 5,
                                        "Seccion": "Zonda"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75fd",
                                        "IdSeccion": 6,
                                        "Seccion": "Rawson"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75fe",
                                        "IdSeccion": 7,
                                        "Seccion": "9 de Julio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b75ff",
                                        "IdSeccion": 8,
                                        "Seccion": "San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7600",
                                        "IdSeccion": 9,
                                        "Seccion": "Angaco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7601",
                                        "IdSeccion": 10,
                                        "Seccion": "Albardón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7602",
                                        "IdSeccion": 11,
                                        "Seccion": "Ullum"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7603",
                                        "IdSeccion": 12,
                                        "Seccion": "Pocito"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7604",
                                        "IdSeccion": 13,
                                        "Seccion": "Sarmiento"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7605",
                                        "IdSeccion": 14,
                                        "Seccion": "25 de Mayo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7606",
                                        "IdSeccion": 15,
                                        "Seccion": "Caucete"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7607",
                                        "IdSeccion": 16,
                                        "Seccion": "Valle Fértil"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7608",
                                        "IdSeccion": 17,
                                        "Seccion": "Jáchal"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7609",
                                        "IdSeccion": 18,
                                        "Seccion": "Iglesia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b760a",
                                        "IdSeccion": 19,
                                        "Seccion": "Calingasta"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b760b",
                        "IdDistrito": 19,
                        "Distrito": "San Luis",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b760c",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b760d",
                                        "IdSeccion": 1,
                                        "Seccion": "Juan Martín de Pueyrredón"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b760e",
                                        "IdSeccion": 2,
                                        "Seccion": "Coronel Pringles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b760f",
                                        "IdSeccion": 3,
                                        "Seccion": "General Pedernera"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7610",
                                        "IdSeccion": 4,
                                        "Seccion": "Chacabuco"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7611",
                                        "IdSeccion": 5,
                                        "Seccion": "Libertador General San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7612",
                                        "IdSeccion": 6,
                                        "Seccion": "Junín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7613",
                                        "IdSeccion": 7,
                                        "Seccion": "Ayacucho"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7614",
                                        "IdSeccion": 8,
                                        "Seccion": "Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7615",
                                        "IdSeccion": 9,
                                        "Seccion": "Gobernador Dupuy"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b7616",
                        "IdDistrito": 20,
                        "Distrito": "Santa Cruz",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b7617",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7618",
                                        "IdSeccion": 1,
                                        "Seccion": "Deseado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7619",
                                        "IdSeccion": 2,
                                        "Seccion": "Lago Buenos Aires"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b761a",
                                        "IdSeccion": 3,
                                        "Seccion": "Magallanes"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b761b",
                                        "IdSeccion": 4,
                                        "Seccion": "Río Chico"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b761c",
                                        "IdSeccion": 5,
                                        "Seccion": "Corpen Aike"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b761d",
                                        "IdSeccion": 6,
                                        "Seccion": "Lago Argentino"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b761e",
                                        "IdSeccion": 7,
                                        "Seccion": "Güer Aike"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b761f",
                        "IdDistrito": 21,
                        "Distrito": "Santa Fe",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b7620",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7621",
                                        "IdSeccion": 1,
                                        "Seccion": "La Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7622",
                                        "IdSeccion": 2,
                                        "Seccion": "Las Colonias"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7623",
                                        "IdSeccion": 3,
                                        "Seccion": "San Jerónimo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7624",
                                        "IdSeccion": 4,
                                        "Seccion": "Garay"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7625",
                                        "IdSeccion": 5,
                                        "Seccion": "Castellanos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7626",
                                        "IdSeccion": 6,
                                        "Seccion": "San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7627",
                                        "IdSeccion": 7,
                                        "Seccion": "San Cristóbal"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7628",
                                        "IdSeccion": 8,
                                        "Seccion": "San Justo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7629",
                                        "IdSeccion": 9,
                                        "Seccion": "General Obligado"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b762a",
                                        "IdSeccion": 10,
                                        "Seccion": "Vera"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b762b",
                                        "IdSeccion": 11,
                                        "Seccion": "San Javier"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b762c",
                                        "IdSeccion": 12,
                                        "Seccion": "9 de Julio"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b762d",
                                        "IdSeccion": 13,
                                        "Seccion": "Rosario"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b762e",
                                        "IdSeccion": 14,
                                        "Seccion": "Caseros"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b762f",
                                        "IdSeccion": 15,
                                        "Seccion": "Constitución"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7630",
                                        "IdSeccion": 16,
                                        "Seccion": "General López"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7631",
                                        "IdSeccion": 17,
                                        "Seccion": "Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7632",
                                        "IdSeccion": 18,
                                        "Seccion": "Iriondo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7633",
                                        "IdSeccion": 19,
                                        "Seccion": "San Lorenzo"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b7634",
                        "IdDistrito": 22,
                        "Distrito": "Santiago del Estero",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b7635",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7636",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7637",
                                        "IdSeccion": 2,
                                        "Seccion": "Avellaneda"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7638",
                                        "IdSeccion": 3,
                                        "Seccion": "Aguirre"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7639",
                                        "IdSeccion": 4,
                                        "Seccion": "Alberdi"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b763a",
                                        "IdSeccion": 5,
                                        "Seccion": "Atamisqui"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b763b",
                                        "IdSeccion": 6,
                                        "Seccion": "Banda"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b763c",
                                        "IdSeccion": 7,
                                        "Seccion": "Belgrano"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b763d",
                                        "IdSeccion": 8,
                                        "Seccion": "Copo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b763e",
                                        "IdSeccion": 9,
                                        "Seccion": "Choya"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b763f",
                                        "IdSeccion": 10,
                                        "Seccion": "Figueroa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7640",
                                        "IdSeccion": 11,
                                        "Seccion": "Guasayán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7641",
                                        "IdSeccion": 12,
                                        "Seccion": "Jiménez"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7642",
                                        "IdSeccion": 13,
                                        "Seccion": "Loreto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7643",
                                        "IdSeccion": 14,
                                        "Seccion": "Juan F. Ibarra"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7644",
                                        "IdSeccion": 15,
                                        "Seccion": "Mitre"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7645",
                                        "IdSeccion": 16,
                                        "Seccion": "Moreno"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7646",
                                        "IdSeccion": 17,
                                        "Seccion": "Ojo de Agua"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7647",
                                        "IdSeccion": 18,
                                        "Seccion": "Pellegrini"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7648",
                                        "IdSeccion": 19,
                                        "Seccion": "Quebrachos"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7649",
                                        "IdSeccion": 20,
                                        "Seccion": "Rivadavia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b764a",
                                        "IdSeccion": 21,
                                        "Seccion": "Robles"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b764b",
                                        "IdSeccion": 22,
                                        "Seccion": "Río Hondo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b764c",
                                        "IdSeccion": 23,
                                        "Seccion": "Silípica"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b764d",
                                        "IdSeccion": 24,
                                        "Seccion": "San Martín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b764e",
                                        "IdSeccion": 25,
                                        "Seccion": "Salavina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b764f",
                                        "IdSeccion": 26,
                                        "Seccion": "Sarmiento"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7650",
                                        "IdSeccion": 27,
                                        "Seccion": "General Taboada"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b7651",
                        "IdDistrito": 23,
                        "Distrito": "Tucumán",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b7652",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7653",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7654",
                                        "IdSeccion": 2,
                                        "Seccion": "Lules"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7655",
                                        "IdSeccion": 3,
                                        "Seccion": "Famaillá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7656",
                                        "IdSeccion": 4,
                                        "Seccion": "Monteros"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7657",
                                        "IdSeccion": 5,
                                        "Seccion": "Chicligasta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7658",
                                        "IdSeccion": 6,
                                        "Seccion": "Río Chico"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7659",
                                        "IdSeccion": 7,
                                        "Seccion": "Juan Bautista Alberdi"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b765a",
                                        "IdSeccion": 8,
                                        "Seccion": "La Cocha"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b765b",
                                        "IdSeccion": 9,
                                        "Seccion": "Graneros"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b765c",
                                        "IdSeccion": 10,
                                        "Seccion": "Simoca"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b765d",
                                        "IdSeccion": 11,
                                        "Seccion": "Leales"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b765e",
                                        "IdSeccion": 12,
                                        "Seccion": "Cruz Alta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b765f",
                                        "IdSeccion": 13,
                                        "Seccion": "Burruyacú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7660",
                                        "IdSeccion": 14,
                                        "Seccion": "Trancas"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7661",
                                        "IdSeccion": 15,
                                        "Seccion": "Yerba Buena"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7662",
                                        "IdSeccion": 16,
                                        "Seccion": "Tafí Viejo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7663",
                                        "IdSeccion": 17,
                                        "Seccion": "Tafí del Valle"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b7664",
                        "IdDistrito": 24,
                        "Distrito": "Tierra del Fuego, Antártida e Islas del Atlántico Sur",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b7665",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b7666",
                                        "IdSeccion": 1,
                                        "Seccion": "Ushuaia"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7667",
                                        "IdSeccion": 2,
                                        "Seccion": "Río Grande"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7668",
                                        "IdSeccion": 3,
                                        "Seccion": "Antártida Argentina"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7669",
                                        "IdSeccion": 5,
                                        "Seccion": "Tolhuin"
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                "_id": "66134fd690a68119101b766a",
                "IdCargo": "10",
                "Cargo": "CONCEJAL/A - MIEMBROS DE LA JUNTA",
                "Distritos": [
                    {
                        "_id": "66134fd690a68119101b766b",
                        "IdDistrito": 1,
                        "Distrito": "Ciudad Autónoma de Buenos Aires",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b766c",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b766d",
                                        "IdSeccion": 1,
                                        "Seccion": "Comuna 01"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b766e",
                                        "IdSeccion": 2,
                                        "Seccion": "Comuna 02"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b766f",
                                        "IdSeccion": 3,
                                        "Seccion": "Comuna 03"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7670",
                                        "IdSeccion": 4,
                                        "Seccion": "Comuna 04"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7671",
                                        "IdSeccion": 5,
                                        "Seccion": "Comuna 05"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7672",
                                        "IdSeccion": 6,
                                        "Seccion": "Comuna 06"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7673",
                                        "IdSeccion": 7,
                                        "Seccion": "Comuna 07"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7674",
                                        "IdSeccion": 8,
                                        "Seccion": "Comuna 08"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7675",
                                        "IdSeccion": 9,
                                        "Seccion": "Comuna 09"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7676",
                                        "IdSeccion": 10,
                                        "Seccion": "Comuna 10"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7677",
                                        "IdSeccion": 11,
                                        "Seccion": "Comuna 11"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7678",
                                        "IdSeccion": 12,
                                        "Seccion": "Comuna 12"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7679",
                                        "IdSeccion": 13,
                                        "Seccion": "Comuna 13"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b767a",
                                        "IdSeccion": 14,
                                        "Seccion": "Comuna 14"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b767b",
                                        "IdSeccion": 15,
                                        "Seccion": "Comuna 15"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "_id": "66134fd690a68119101b767c",
                        "IdDistrito": 3,
                        "Distrito": "Catamarca",
                        "SeccionesProvinciales": [
                            {
                                "_id": "66134fd690a68119101b767d",
                                "IDSeccionProvincial": null,
                                "SeccionProvincial": null,
                                "Secciones": [
                                    {
                                        "_id": "66134fd690a68119101b767e",
                                        "IdSeccion": 1,
                                        "Seccion": "Capital"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b767f",
                                        "IdSeccion": 2,
                                        "Seccion": "Capayán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7680",
                                        "IdSeccion": 3,
                                        "Seccion": "La Paz"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7681",
                                        "IdSeccion": 4,
                                        "Seccion": "Ancasti"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7682",
                                        "IdSeccion": 5,
                                        "Seccion": "El Alto"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7683",
                                        "IdSeccion": 6,
                                        "Seccion": "Santa Rosa"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7684",
                                        "IdSeccion": 7,
                                        "Seccion": "Paclín"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7685",
                                        "IdSeccion": 8,
                                        "Seccion": "Valle Viejo"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7686",
                                        "IdSeccion": 9,
                                        "Seccion": "Fray Mamerto Esquiú"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7687",
                                        "IdSeccion": 11,
                                        "Seccion": "Pomán"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7688",
                                        "IdSeccion": 12,
                                        "Seccion": "Andalgalá"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b7689",
                                        "IdSeccion": 13,
                                        "Seccion": "Belén"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b768a",
                                        "IdSeccion": 15,
                                        "Seccion": "Tinogasta"
                                    },
                                    {
                                        "_id": "66134fd690a68119101b768b",
                                        "IdSeccion": 16,
                                        "Seccion": "Santa María"
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    }
]