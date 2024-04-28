
const queryCh = require('../database.js');

async function personas(req, res) {
    /* custom_query */
    try {
        // Parámetros de paginación
        const limit = parseInt(req.query._limit) || 5000000;  // Uso un valor por defecto más razonable
        const offset = parseInt(req.query._offset) || 0;

        // Parámetros de ordenación
        let sortField = req.query._sort || 'NU_MATRICULA';
        if(sortField = 'id'){
            sortField = 'NU_MATRICULA';
        }
        const sortOrder = req.query._order === 'DESC' ? 'DESC' : 'ASC';

        let custom_query = req.query.custom_query?? null;

        if(custom_query){

            custom_query += ` ORDER BY ${sortField} LIMIT ${limit} OFFSET ${offset}`
    
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
            query: `SELECT * FROM persona ${whereClause} ORDER BY ${sortField} ${sortOrder} LIMIT ${limit} OFFSET ${offset}`,
            format: 'JSONEachRow',
        };

        const query_total = {
            query: `SELECT count(*) as total FROM persona ${whereClause}`,
            format: 'JSONEachRow',
        };

        // Ejecuta la consulta para obtener las personas
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

module.exports = personas;