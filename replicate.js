const mysql = require('mysql2');
const iconv = require('iconv-lite');
const { createClient } = require('@clickhouse/client');

const OFFSET = 0;
const LIMIT = 1_000_000;

const clickhouse = createClient({
  database: 'padron',
  password: 'clickhouse1063',
  username: 'default',
  clickhouse_settings: {
    // https://clickhouse.com/docs/en/operations/settings/settings#async-insert
    async_insert: 1,
  },
  // Agrega otras opciones de configuración si son necesarias
});

// Conexión a la base de datos MySQL
const mysqlConnection = mysql.createConnection({
  host: '165.227.203.167',
  user: 'local',
  password: 'jbjzVeaBSiapOrFi',
  database: 'padron'
});

const constTotalRowsMysql = async () => {

  return new Promise((resolve, reject) => {
    const query = `SELECT COUNT(*) AS total FROM padron`;
    mysqlConnection.query(query, (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });

}


// Funcion para obtener 1000 filas de mysql padron, que reciba un limit de 1000 y un offset
const getMysqlData = (limit, offset, retries = 10) => {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM padron LIMIT ${limit} OFFSET ${offset}`;
      mysqlConnection.query(query, (err, results) => {
        if (err) {
          if (retries > 0) {
            console.log(`Error de servidor apagado, reintentando en 10 segundos... (${retries} intentos restantes)`);
            setTimeout(() => {
              resolve(getMysqlData(limit, offset, retries - 1));
            }, 10000);
          } else {
            reject(err);
          }
        } else {
          resolve(results);
        }
      });
    });
};

// Funcion que recibe un array de 1000 INSERTS, es decir 1000 Queries en un solo string y los inserta en clickhouse
async function insertData(table, values, format = 'JSONEachRow') {
    try {
      await clickhouse.insert({
        table,
        values,
        format,
      });
      console.log(`Se insertaron ${values.length} filas en la tabla ${table}`);
    } catch (err) {
      console.error(`Error al insertar datos en la tabla ${table}:`, err);
      // Puedes implementar un manejo de errores más específico aquí si es necesario
    }
}


function fixEncoding(str) {
    // Primero, trata la cadena como si estuviera codificada incorrectamente en Windows-1252
    const binaryString = iconv.encode(str, 'windows-1252');
    // Luego, decodifica la cadena binaria como UTF-8
    return iconv.decode(binaryString, 'utf8');
  }

// Funcion que utiliza getMysqlData con limite 10000 y offset 0 la primera vez, inserta en clickhouse la concatenacion de queries, y luego incrementa el offset en 10000
// Siendo las columnas: DIRECCION_ESTABLECIMIENTO, DISTRITO, ESTBLECIMIENTO, NUMERO_MESA, NU_MATRICULA, NU_ORDEN_MESA, TX_APELLIDO, TX_CIRCUITO, TX_CLASE, TX_CODIGO_POSTAL, TX_DOMICILIO, TX_GENERO, TX_LOCALIDAD, TX_NOMBRE, TX_SECCION, TX_TIPO_EJEMPLAR, TX_TIPO_NACIONALIDAD 
// Sanear cada string de mysql con la funcion fixEncoding

const replicate = async () => {
    let totalRows = await constTotalRowsMysql();
    let offset = OFFSET || 0;
    let limit = LIMIT || 1000;
    let results = await getMysqlData(limit, offset);
    console.log("Total de filas en MySQL: ", totalRows[0].total);
    while (results.length > 0) {

        // Armamos el JSON requerido
        let queryJson  = convertToJSONEachRow(results);
    
        // Imprimimos en pantalla cantidad de queries
        
        console.log("Insertando Lote de Queries");
        await insertData('persona', queryJson);
        
        offset += limit;
        results = await getMysqlData(limit, offset);
    }
};

function convertToJSONEachRow(results) {
    return results.map(row => ({
      DIRECCION_ESTABLECIMIENTO: fixEncoding(row.DIRECCION_ESTABLECIMIENTO),
      DISTRITO: fixEncoding(row.DISTRITO),
      ESTBLECIMIENTO: fixEncoding(row.ESTBLECIMIENTO),
      NUMERO_MESA: fixEncoding(row.NUMERO_MESA),
      NU_MATRICULA: fixEncoding(row.NU_MATRICULA),
      NU_ORDEN_MESA: fixEncoding(row.NU_ORDEN_MESA),
      TX_APELLIDO: fixEncoding(row.TX_APELLIDO),
      TX_CIRCUITO: fixEncoding(row.TX_CIRCUITO),
      TX_CLASE: fixEncoding(row.TX_CLASE),
      TX_CODIGO_POSTAL: fixEncoding(row.TX_CODIGO_POSTAL),
      TX_DOMICILIO: fixEncoding(row.TX_DOMICILIO),
      TX_GENERO: fixEncoding(row.TX_GENERO),
      TX_LOCALIDAD: fixEncoding(row.TX_LOCALIDAD),
      TX_NOMBRE: fixEncoding(row.TX_NOMBRE),
      TX_SECCION: fixEncoding(row.TX_SECCION),
      TX_TIPO_EJEMPLAR: fixEncoding(row.TX_TIPO_EJEMPLAR),
      TX_TIPO_NACIONALIDAD: fixEncoding(row.TX_TIPO_NACIONALIDAD)
    }));
  }

// llamamos a la funcion replicate
replicate();
