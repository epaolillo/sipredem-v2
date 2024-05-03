const puppeteer = require('puppeteer');
const axios = require('axios');
const queryCh= require('../database.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();



// Listados de items que el scrapper debe reconocer como puntos para er navegados



(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const puntosDeNavegacion = ['Mostrar todas las ofertas'];
    const regionesDeInteres = ['https://inmuebles.mercadolibre.com.ar/venta/bsas-gba-norte/san-fernando/_ITEM*CONDITION_2230581#applied_filter_id%3Dcity%26applied_filter_name%3DCiudades%26applied_filter_order%3D6%26applied_value_id%3DTUxBQ1NBTjQ0ZWIy%26applied_value_name%3DSan+Fernando%26applied_value_order%3D7%26applied_value_results%3D1884%26is_custom%3Dfalse']


    // Obtenemos los links de interes
    const links = await page.evaluate((puntosDeNavegacion) => {
        const allLinks = Array.from(document.querySelectorAll('a'));
        return allLinks.filter(link => puntosDeNavegacion.includes(link.textContent)).map(link => ({
        href: link.href,
        text: link.textContent
        }));
    }, puntosDeNavegacion);


    // Navegamos las regiones de interes
    for (let region of regionesDeInteres) {
        console.log(`Navegando a ${region}`);
        await page.goto(region);

        await waitContent(page);

        // Extraer items de la pagina

        
        
        try{
            const productos = await extractMLProductos(page);
            // Muestra los resultados
            productos.forEach(producto => {
                printEntity(producto);
            });
        }
        catch(e){
            console.log('No se encontraron productos');
        }


        try{
            const cards = await extractCard(page);
            // Muestra los resultados
            cards.forEach(card => {
                printEntity(card);
            });
        }
        catch(e){
            console.log('No se encontraron cards');
        }
        


    }

    console.log(links)


  await browser.close();
})();

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


async function extractMLData(page){
    return new Promise(async (resolve, reject) => {
        let items = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('.poly-card__content'));
            return items.map(item => {
                const titulo = item.querySelector('.poly-component__title').innerText;
                const precio = item.querySelector('.poly-component__price .poly-price__current .andes-money-amount__fraction').innerText;
                return {
                    titulo,
                    precio
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


async function extractMLProductos(page){
    return new Promise(async (resolve, reject) => {
        let items = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('.poly-card__content'));
            return items.map(item => {
                const titulo = item.querySelector('.poly-component__title').innerText;
                const precio = item.querySelector('.poly-component__price .poly-price__current .andes-money-amount__fraction').innerText;
                return {
                    titulo,
                    precio
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


async function waitMLContent(page){
    await page.waitForSelector('.nav-logo');
}

async function waitContent(page){
    await page.waitForSelector('body');
}