const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

const sqlite3 = require('sqlite3').verbose();
const personas = require('./models/personas.js');
const resultados_2023 = require('./models/resultados_2023.js');
require('dotenv').config();


const users = [
    { id: 1, name: 'Ezequiel Paolillo', username: 'paolilloe@gmail.com'},
    { id: 2, name: 'Guillermo Ferino', username: 'guillermoferino@gmail.com'}
];


// Jobs dispatcher
// Al momento de inicializar el servidor se crean los jobs y se va manteniendo actualizado su estado
// Los jobs se pueden pausar, reanudar, cancelar, etc.
// Un JOB puede tener estos atributos
// id
// status
// nombre
// last_update
// created_at



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
    return personas(req, res);
});


app.get('/resultados_2023', async (req, res) => {
    return resultados_2023(req, res);
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




function runJob(jobFile) {
    const jobPath = path.join(__dirname, 'jobs', jobFile);
    const job = exec(`node ${jobPath}`);

    job.on('exit', (code) => {
        console.log(`Job ${jobFile} exited with code ${code}`);
        // Si se desea ejecutar en bucle, descomenta la siguiente línea:
        // runJob(jobFile);
    });

    return job;
}


