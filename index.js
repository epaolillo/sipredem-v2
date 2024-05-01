const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const axios = require('axios');
app.use(express.json()); 

const port = 3000;
const sqlite3 = require('sqlite3').verbose();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const personas = require('./models/personas.js');
const { resultados_2023 } = require('./models/resultados_2023.js');
require('dotenv').config();

const cookieParser = require('cookie-parser');

app.use(cookieParser());



const jobs = require('./jobs/jobs.js');

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


app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Verificar las credenciales
    if (username === 'admin' && password === 'sueñodedatos') {
        // Establecer una cookie
        res.cookie('sipredem', 'admin', { httpOnly: true }); // Opciones adicionales pueden ser configuradas según la necesidad
        res.send('Login exitoso: Cookie establecida');
    } else {
        res.status(401).send('Credenciales inválidas');
    }
});


app.use((req, res, next) => {
    const sipredemCookie = req.cookies.sipredem;
    if (sipredemCookie === 'admin') {
        next();  // La cookie existe y tiene el valor 'admin', continua con la siguiente ruta/middleware
    } else {
        res.status(403).send('Acceso denegado: no tiene las credenciales adecuadas');  // Rechaza la solicitud
    }
});

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
    //runJob(jobs);
});


// Endpoint para normalizar direcciones
app.post('/normalizarDireccion', async (req, res) => {
    const direcciones = req.body;

    console.log(direcciones)
    if (!Array.isArray(direcciones)) {
        return res.status(400).send({ error: 'El cuerpo de la solicitud debe ser un array de direcciones.' });
    }

    res.json( await normalizarUnLoteDirecciones(direcciones));
});

// Función para normalizar una única dirección usando la API
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
        return response.data;

}




function runJob(jobs) {
    jobs.forEach((job) => {
        const { id, filename, loop } = job;
        const jobPath = path.join(__dirname, 'jobs', filename);
        const jobProcess = exec(`node ${jobPath}`);

        jobProcess.on('exit', (code) => {
            console.log(`Job ${filename} (ID: ${id}) exited with code ${code}`);
            if (loop) {
                // Si loop es true, ejecutar el job nuevamente después de un tiempo
                setTimeout(() => {
                    runJob([job]); // Llama recursivamente runJob con el job actual
                }, 1000); // Espera 1 segundo antes de volver a ejecutar el job (puedes ajustar el tiempo según sea necesario)
            }
        });
    });
}
