const puppeteer = require('puppeteer');
const axios = require('axios');
const { queryCh, clickhouse } = require('../database.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { parse } = require('node-html-parser');


// Listados de items que el scrapper debe reconocer como puntos para er navegados

async function obtenerCUILES() {
    const query =  {
        query: `SELECT DISTINCT NU_MATRICULA, TX_GENERO FROM persona WHERE lower(TX_SECCION) LIKE lower('%105 - SAN FERNANDO%') AND NU_MATRICULA >= 16000000`,
        format: 'JSONEachRow',
    };

    const resultados = await queryCh(query);
    return resultados
}

(async () => {
    const browser = await puppeteer.launch({
        // healdess false
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Reset query values
    const resetQuery = {
        query:`ALTER TABLE padron.persona UPDATE m2 = 0 WHERE 1=1`,
        format: 'JSONEachRow'
    };

    //await queryChWithRetry(resetQuery);

    const puntosDeNavegacion = ['Mostrar todas las ofertas'];
    const regionesDeInteres = ['https://servicioswww.anses.gob.ar/ooss2/ConsultaDoc.aspx']


    /*
    page.on('console', msg => {
        console.log('BROWSER-CONSOLE:', msg.text());
    });
    */
    
    let EXISTS_NEXT = true;
    let MAX_PAGES = 1000;
    var CURRENT_PAGE = 1;
    // Obtenemos los links de interes
    /*
    const links = await page.evaluate((puntosDeNavegacion) => {
        const allLinks = Array.from(document.querySelectorAll('a'));
        return allLinks.filter(link => puntosDeNavegacion.includes(link.textContent)).map(link => ({
        href: link.href,
        text: link.textContent
        }));
    }, puntosDeNavegacion);
    */

    // andes-pagination__link

    // Navegamos las regiones de interes
    for (let region of regionesDeInteres) {
        console.log(`Navegando a ${region}`);
        await page.goto(region);
        // await waitContent(page);


        let cuiles = await obtenerCUILES();
       
        cuiles = cuiles.map(cuil => calcularCuit(cuil.NU_MATRICULA, cuil.TX_GENERO == 'M' ? 20 : 27));

        for(const cuil of cuiles){
            // completando cuit 20345553062 en elemento con name ctl00$ContentPlaceHolder1$txtDoc

            //await page.type('input[name="ctl00$ContentPlaceHolder1$txtDoc"]', cuil);
            await typeWithRandomDelay(page, 'input[name="ctl00$ContentPlaceHolder1$txtDoc"]', cuil);
    
            // Click en continuar elemento name ctl00$ContentPlaceHolder1$Button1
            await page.click('input[name="ctl00$ContentPlaceHolder1$Button1"]');

            try{
                // if ContentPlaceHolder1_MessageLabel is text = El CUIL ingresado no es válido. entonces volvemos atras y ponemos siguiente cuil
                await waitForEitherSelector(page, '#ContentPlaceHolder1_MessageLabel', '#tblCabecera', 3000);
                
                try{
                    const message2 = await page.$eval('#ContentPlaceHolder1_MessageLabel', el => el.innerText);
        
                    if(message2){
                        await sleep(2000);
                        await page.goto(region);
                        continue;
                    }
                }
                catch(e){

                }

                try{
                    await sleep(1000);
                    const cuil_final = await page.$eval('#ContentPlaceHolder1_lblCuil', el => el.innerHTML);
                    const nombre_final = await page.$eval('#ContentPlaceHolder1_lblNombre', el => el.innerHTML);
                    const os_final = await page.$eval('#ContentPlaceHolder1_DGOOSS', el => el.innerHTML);

                    console.log(`CUIL Encontrado: ${cuil_final} - ${nombre_final} - ${extractData(os_final)}`);
        
                    await sleep(1000);
                }
                catch(e){
                    console.log(e)
                }
    
                
                await page.goto(region);
            }
            catch(e){
                console.log(e);
                await page.goto(region);
            }


        }

    }



  await browser.close();
})();

const typeWithRandomDelay = async (page, selector, text) => {
    for (const char of text) {
      await page.type(selector, char);
      await sleep(Math.floor(Math.random() * 100) + 100); // Espera entre 100ms y 300ms
    }
};

const extractData = (html) => {
    // Parse the HTML
    const root = parse(html);
    
    // Find the second row
    const row = root.querySelector('tr:nth-child(2)');
    if (!row) {
      console.error('No se encontró la fila de datos');
      return null;
    }
  
    // Extract data from the cells
    const cells = row.querySelectorAll('td');
    const codigo = cells[0]?.text.trim() || '';
    const descripcion = cells[1]?.text.trim() || '';
    const condicion = cells[2]?.text.trim() || '';
    const situacion = cells[3]?.text.trim() || '';
  
    if (!codigo || !condicion || !situacion || !descripcion) {
      console.error('No se pudieron extraer todos los datos');
      return null;
    }
  
    return `${codigo};${condicion};${situacion};${descripcion}`;
};

async function simulateRandomMouseMovement(page, duration = 5000) {
    const { width, height } = await page.viewport();
    const startTime = Date.now();
  
    while (Date.now() - startTime < duration) {
      const randomX = Math.floor(Math.random() * width);
      const randomY = Math.floor(Math.random() * height);
  
      await page.mouse.move(randomX, randomY);
      await page.waitForTimeout(Math.random() * 200 + 100); // Espera entre 100ms y 300ms
    }
  }
  

async function waitForEitherSelector(page, selector1, selector2, timeout) {
    return Promise.race([
      page.waitForSelector(selector1, { timeout }),
      page.waitForSelector(selector2, { timeout }),
    ]);
}

// convert DNI into CUIL
function calcularCuit(dni, prefijo) {
    // Prefijo: 20 para hombres, 27 para mujeres
    const cuitSinVerificador = `${prefijo}${dni}`;
  
    // Multiplicadores: se usan en el orden de los dígitos
    const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  
    let suma = 0;
    
    for (let i = 0; i < multiplicadores.length; i++) {
      suma += parseInt(cuitSinVerificador[i]) * multiplicadores[i];
    }
    
    const resto = suma % 11;
    let digitoVerificador = 11 - resto;
  
    if (digitoVerificador === 11) {
      digitoVerificador = 0;
    } else if (digitoVerificador === 10) {
      digitoVerificador = 9;
    }
  
    return `${cuitSinVerificador}${digitoVerificador}`;
  }

const sleep = ms => new Promise(res => setTimeout(res, ms));

async function existsNextPage(page, CURRENT_PAGE) {
    return (await page.evaluate((currentPage) => {
        const items = Array.from(document.querySelectorAll('.andes-pagination__link'));
        let exist_item = items.find(item => item.innerText == currentPage);
        return exist_item ? true : false;
    }, CURRENT_PAGE)); // Pasamos CURRENT_PAGE como argumento a la función
}


async function insertInmueble(inmuebleData) {
    
    try{
        await clickhouse.insert({
            table: 'inmuebles',
            values: inmuebleData,
            format: 'JSONEachRow',
            // `id` column value for this row will be zero (default for UInt32)
            columns: ['link', 'lat', 'lon', 'superficieTotal', 'superficieCubierta', 'precio', 'precioMetroCuadradoTotal', 'precioMetroCuadradoCubierto', 'ambientes', 'dormitorios', 'banos', 'cocheras', 'bauleras', 'cantidadDePisos', 'tipoDeCasa', 'orientacion', 'antiguedad', 'expensas', 'seguridad', 'portonAutomatico', 'conBarrioCerrado', 'accesoControlado', 'parrilla',
             'pileta', 'placards', 'toilette', 'terraza', 'comedor', 'vestidor', 'estudio', 'living', 'patio',
              'dormitorioEnSuite', 'balcon', 'altillo', 'jardin', 'cocina', 'dependenciaDeServicio', 'playroom',
               'conLavadero', 'desayunador', 'accesoAInternet', 'aireAcondicionado', 'calefaccion', 'tvPorCable',
                'lineaTelefonica', 'gasNatural', 'grupoElectrogeno', 'conEnergiaSolar', 'conConexionParaLavarropas',
                 'aguaCorriente', 'cisterna', 'caldera', 'chimenea', 'gimnasio', 'jacuzzi', 'estacionamientoParaVisitantes',
                  'areaDeCine', 'areaDeJuegosInfantiles', 'conAreaVerde', 'ascensor', 'canchaDeBasquetbol', 'conCanchaDeFutbol',
                   'canchaDePaddle', 'canchaDeTenis', 'conCanchaPolideportiva', 'salonDeFiestas', 'sauna', 'heladera', 'amoblado', 'usuario','moneda']
          })

    }
    catch(e){
        console.log(e);
    }
}


async function clickElementPageN(page, n) {
    // Selector CSS que coincide con los enlaces de paginación
    const selector = '.andes-pagination__link';
    await page.waitForSelector('.andes-pagination__link');
    // Espera a que los elementos estén visibles en la página
    // Obtén los elementos y encuentra el correcto basado en su número
    const links = await page.$$(selector);
    for (const link of links) {
        const text = await (await link.getProperty('innerText')).jsonValue();
        if (text.trim() == n.toString()) {
            console.log(`Item found: ${text}`);
            // Si el texto coincide, haz clic en el elemento
            await link.click();
            return; // Sale de la función después de hacer clic
        }
    }
    console.log('No item found');
}

function printEntity(entity) {
    if (!entity || Object.keys(entity).length === 0) {
        console.log("No hay entidad para mostrar.");
        return;
    }

    const MAX_LENGTH = 30;
    const styledEntity = {};
    for (const key in entity) {
        let value = entity[key].toString();
        if (value.length > MAX_LENGTH) {
            value = value.substring(0, MAX_LENGTH) + '...';
        }
        styledEntity[key] = value;
    }

    console.table([styledEntity]);
}

async function scrapeData(page) {

    // Extraer todos los links de los items
    const itemLinks = await page.$$eval('.ui-search-item__group__element.ui-search-item__title-grid a', items => items.map(item => item.href));
  
    let results = [];

    for (let link of itemLinks) {
        await page.goto(link);

        await waitContent(page);


        let imageSrc = null;
        // Extraer la imagen
            try{
                imageSrc = await page.$eval('.ui-vip-location__map img', img => img.src);
            }
            catch(e){
                console.log(e);
                continue;
            }

        // Intentar obtener los datos de la tabla directamente
        let tableData = await page.$$eval('table.andes-table tbody tr', rows => 
            rows.map(row => ({
            header: row.querySelector('th').innerText.trim(),
            value: row.querySelector('td').innerText.trim()
            }))
        );
    
        // Si no se encuentra la tabla, hacer clic en el botón para expandir y volver a intentar
        if (!tableData.some(row => row.header.includes('Superficie total'))) {
            try{
                await page.click('.ui-pdp-collapsable__action');

                await page.waitForSelector('table.andes-table'); // Asegúrate de que la tabla se haya cargado
                
                tableData = await page.$$eval('table.andes-table tbody tr', rows => 
                    rows.map(row => ({
                        header: row.querySelector('th').innerText.trim(),
                        value: row.querySelector('td').innerText.trim()
                    }))
                );
            }
            catch(e){
                console.log(e);
            }
        }
    
        let superficieTotal = extractIntegerFromString(tableData.find(row => row.header === 'Superficie total')?.value) || null;
        let superficieCubierta = extractIntegerFromString(tableData.find(row => row.header === 'Superficie cubierta')?.value) || null;
        const ambientes = extractIntegerFromString(tableData.find(row => row.header === 'Ambientes')?.value) || null;
        const dormitorios = extractIntegerFromString(tableData.find(row => row.header === 'Dormitorios')?.value) || null;
        const banos = extractIntegerFromString(tableData.find(row => row.header === 'Baños')?.value) || null;
        const cocheras = extractIntegerFromString(tableData.find(row => row.header === 'Cocheras')?.value) || null;
        const bauleras = extractIntegerFromString(tableData.find(row => row.header === 'Bauleras')?.value) || null;
        const cantidadDePisos = extractIntegerFromString(tableData.find(row => row.header === 'Cantidad de pisos')?.value) || null;
        const tipoDeCasa = tableData.find(row => row.header === 'Tipo de casa')?.value || null;
        const orientacion = tableData.find(row => row.header === 'Orientación')?.value || null;
        const antiguedad = extractIntegerFromString(tableData.find(row => row.header === 'Antigüedad')?.value) || null;
        const expensas = extractIntegerFromString(tableData.find(row => row.header === 'Expensas')?.value) || null;
        const seguridad = tableData.find(row => row.header === 'Seguridad')?.value || null;
        const portonAutomatico = tableData.find(row => row.header === 'Portón automático')?.value || null;
        const conBarrioCerrado = tableData.find(row => row.header === 'Con barrio cerrado')?.value || null;
        const accesoControlado = tableData.find(row => row.header === 'Acceso controlado')?.value || null;
        const parrilla = tableData.find(row => row.header === 'Parrilla')?.value || null;
        const pileta = tableData.find(row => row.header === 'Pileta')?.value || null;
        const placards = tableData.find(row => row.header === 'Placards')?.value || null;
        const toilette = tableData.find(row => row.header === 'Toilette')?.value || null;
        const terraza = tableData.find(row => row.header === 'Terraza')?.value || null;
        const comedor = tableData.find(row => row.header === 'Comedor')?.value || null;
        const vestidor = tableData.find(row => row.header === 'Vestidor')?.value || null;
        const estudio = tableData.find(row => row.header === 'Estudio')?.value || null;
        const living = tableData.find(row => row.header === 'Living')?.value || null;
        const patio = tableData.find(row => row.header === 'Patio')?.value || null;
        const dormitorioEnSuite = tableData.find(row => row.header === 'Dormitorio en suite')?.value || null;
        const balcon = tableData.find(row => row.header === 'Balcón')?.value || null;
        const altillo = tableData.find(row => row.header === 'Altillo')?.value || null;
        const jardin = tableData.find(row => row.header === 'Jardín')?.value || null;
        const cocina = tableData.find(row => row.header === 'Cocina')?.value || null;
        const dependenciaDeServicio = tableData.find(row => row.header === 'Dependencia de servicio')?.value || null;
        const playroom = tableData.find(row => row.header === 'Playroom')?.value || null;
        const conLavadero = tableData.find(row => row.header === 'Con lavadero')?.value || null;
        const desayunador = tableData.find(row => row.header === 'Desayunador')?.value || null;
        const accesoAInternet = tableData.find(row => row.header === 'Acceso a internet')?.value || null;
        const aireAcondicionado = tableData.find(row => row.header === 'Aire acondicionado')?.value || null;
        const calefaccion = tableData.find(row => row.header === 'Calefacción')?.value || null;
        const tvPorCable = tableData.find(row => row.header === 'TV por cable')?.value || null;
        const lineaTelefonica = tableData.find(row => row.header === 'Línea telefónica')?.value || null;
        const gasNatural = tableData.find(row => row.header === 'Gas natural')?.value || null;
        const grupoElectrogeno = tableData.find(row => row.header === 'Grupo electrógeno')?.value || null;
        const conEnergiaSolar = tableData.find(row => row.header === 'Con energia solar')?.value || null;
        const conConexionParaLavarropas = tableData.find(row => row.header === 'Con conexión para lavarropas')?.value || null;
        const aguaCorriente = tableData.find(row => row.header === 'Agua corriente')?.value || null;
        const cisterna = tableData.find(row => row.header === 'Cisterna')?.value || null;
        const caldera = tableData.find(row => row.header === 'Caldera')?.value || null;
        const chimenea = tableData.find(row => row.header === 'Chimenea')?.value || null;
        const gimnasio = tableData.find(row => row.header === 'Gimnasio')?.value || null;
        const jacuzzi = tableData.find(row => row.header === 'Jacuzzi')?.value || null;
        const estacionamientoParaVisitantes = tableData.find(row => row.header === 'Estacionamiento para visitantes')?.value || null;
        const areaDeCine = tableData.find(row => row.header === 'Área de cine')?.value || null;
        const areaDeJuegosInfantiles = tableData.find(row => row.header === 'Área de juegos infantiles')?.value || null;
        const conAreaVerde = tableData.find(row => row.header === 'Con área verde')?.value || null;
        const ascensor = tableData.find(row => row.header === 'Ascensor')?.value || null;
        const canchaDeBasquetbol = tableData.find(row => row.header === 'Cancha de básquetbol')?.value || null;
        const conCanchaDeFutbol = tableData.find(row => row.header === 'Con cancha de fútbol')?.value || null;
        const canchaDePaddle = tableData.find(row => row.header === 'Cancha de paddle')?.value || null;
        const canchaDeTenis = tableData.find(row => row.header === 'Cancha de tenis')?.value || null;
        const conCanchaPolideportiva = tableData.find(row => row.header === 'Con cancha polideportiva')?.value || null;
        const salonDeFiestas = tableData.find(row => row.header === 'Salón de fiestas')?.value || null;
        const sauna = tableData.find(row => row.header === 'Sauna')?.value || null;
        const heladera = tableData.find(row => row.header === 'Heladera')?.value || null;
        const amoblado = tableData.find(row => row.header === 'Amoblado')?.value || null;

        // ui-vip-profile-info__info-link h3
        const usuario = await page.$$eval('.ui-vip-profile-info__info-link h3', rows => 
            rows.map(row => row.textContent.replace('.', ''))?.[0]
        );


        let precio = await page.$$eval('[itemprop="price"]', rows => 
            rows.map(row => row.getAttribute("content").replace('.',''))?.[0]
        );

        let moneda = await page.$$eval('.andes-money-amount .andes-money-amount__currency-symbol', rows =>
            rows.map(row => row.textContent)?.[0]
        );

        
        let precioMetroCuadradoTotal = (superficieTotal && precio)? precio / superficieTotal : null;
        let precioMetroCuadradoCubierto = (superficieCubierta && precio)? precio / superficieCubierta : null;
    
        let coordenadas = extractLatLngFromUrl(imageSrc);

        let object = { link,
            lat: coordenadas.latitude,
            lon: coordenadas.longitude,
            superficieTotal,
            superficieCubierta,
            precio,
            precioMetroCuadradoTotal,
            precioMetroCuadradoCubierto,
            ambientes,
            dormitorios,
            banos,
            cocheras,
            bauleras,
            cantidadDePisos,
            tipoDeCasa,
            orientacion,
            antiguedad,
            expensas,
            seguridad,
            portonAutomatico,
            conBarrioCerrado,
            accesoControlado,
            parrilla,
            pileta,
            placards,
            toilette,
            terraza,
            comedor,
            vestidor,
            estudio,
            living,
            patio,
            dormitorioEnSuite,
            balcon,
            altillo,
            jardin,
            cocina,
            dependenciaDeServicio,
            playroom,
            conLavadero,
            desayunador,
            accesoAInternet,
            aireAcondicionado,
            calefaccion,
            tvPorCable,
            lineaTelefonica,
            gasNatural,
            grupoElectrogeno,
            conEnergiaSolar,
            conConexionParaLavarropas,
            aguaCorriente,
            cisterna,
            caldera,
            chimenea,
            gimnasio,
            jacuzzi,
            estacionamientoParaVisitantes,
            areaDeCine,
            areaDeJuegosInfantiles,
            conAreaVerde,
            ascensor,
            canchaDeBasquetbol,
            conCanchaDeFutbol,
            canchaDePaddle,
            canchaDeTenis,
            conCanchaPolideportiva,
            salonDeFiestas,
            sauna,
            heladera,
            amoblado,
            usuario,
            moneda
        };
            results.push(object);

            console.log("PUTOS RESULTADOS",object)
            console.log("Usuario:",usuario)
    }

  
    return results;
}
  
function extractLatLngFromUrl(url) {

    
    // Expresión regular para encontrar la latitud y longitud en el parámetro 'center' del URL
    const latLngPattern = /center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/;
    try{
        const match = url.match(latLngPattern);
    
        if (match) {
            return {
                latitude: parseFloat(match[1]),
                longitude: parseFloat(match[2])
            };
        } else {
            return null; // Retornar null si no se encuentran los datos de latitud y longitud
        }
    }
    catch(e){
        console.log(e);
        return null;
    }
}

function extractIntegerFromString(inputString) {
    // Utilizamos una expresión regular para mantener solo dígitos numéricos
    try{
        const numericPart = inputString.replace(/[^0-9]/g, '');
        // Convertimos la parte numérica a un entero
        return parseInt(numericPart, 10);
    }
    catch(e){
        console.log(`${inputString} no es una cadena`)
        return null;
    }
}


async function extractMLProductos(page){
    return new Promise(async (resolve, reject) => {

        // Extraemos todos los items .ui-search-item__group__element.ui-search-item__title-grid
        const itemLinks = await page.$$eval('.ui-search-item__group__element.ui-search-item__title-grid', items => items.map(item => item.href));

        const results = [];

        // Hacemos click en el primer item

        // Extraemos la data

        // Retornamos hacia atras

        let items = await page.evaluate(() => {



            const items = Array.from(document.querySelectorAll('.ui-search-result__content'));
            return items.map(item => {
                const precio = parseFloat(item.querySelector('.andes-money-amount__fraction').innerText.replace('.',''));
                const domicilio = item.querySelector('.ui-search-item__location-label').innerText;

                let m2 = null
                const elements = Array.from(item.querySelectorAll('.ui-search-card-attributes__attribute'));
                for (let element of elements) {
                  const text = element.innerText;
                  const match = text.match(/(\d+)\s*m²/);
                  if (match) {
                    m2 = parseInt(match[1].replace('.',''));  // Retorna solo el número de metros cuadrados.
                  }
                }


                return {
                    domicilio,
                    precio,
                    m2,
                    m2value: m2 ? Math.round(precio / m2) : null
                };
            });
            
        });
        if (!items || items.length === 0) {
            reject([]);
        }
        else{
            resolve(items);
        }
    });
}

async function extractCard(page){

    return new Promise(async (resolve, reject) => {
        let items = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('.andes-card'));
            return items.map(item => {
                const titulo = item.querySelector('.ui-search-item__title').innerText;
                const precio = item.querySelector('.andes-money-amount__fraction').innerText;
                const enlace = item.querySelector('a').href;
                return {
                    titulo,
                    precio,
                    enlace
                };
            });
            
        });
        if (!items || items.length === 0) {
            reject([]);
        }
        else{
            resolve(items);
        }
    });
    
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



async function waitMLContent(page){
    await page.waitForSelector('.nav-logo');
}

async function waitContent(page){
    await sleep(1000);
    await page.waitForSelector('.andes-money-amount__fraction');
}