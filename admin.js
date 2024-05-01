var myApp = angular.module('myApp', ['ng-admin']);
myApp.config(['NgAdminConfigurationProvider', function (nga) {
    // create an admin application

    var API = ''
    // If the URL is localhost then use loclhost API
    if (window.location.hostname === 'localhost') {
        API = 'http://localhost:3000/';
    }

    var admin = nga.application('SIPREDEM').baseApiUrl(API); // main API endpoint

    // create a user entity
    // the API endpoint for this entity will be 'http://jsonplaceholder.typicode.com/users/:id
    var user = nga.entity('users');
    // set the fields of the user entity list view
    user.listView().fields([
        nga.field('name'),
        nga.field('username'),
    ]);

    // add the user entity to the admin application
    admin.addEntity(user);


    // ###################### PERSONA ###############################

    var persona = nga.entity('personas').identifier(nga.field('NU_MATRICULA'));

    persona.listView()
    .title('Lista de Personas')
    .perPage(30)
    .fields([
        /* Estos campos
        ┌─DISTRITO─┬─TX_TIPO_EJEMPLAR─┬─NU_MATRICULA─┬─TX_APELLIDO─┬─TX_NOMBRE───┬─TX_CLASE─┬─TX_GENERO─┬─TX_DOMICILIO───────────────────────┬─TX_SECCION─┬─TX_CIRCUITO─────────┬─TX_LOCALIDAD───────────────────────────────────────┬─TX_CODIGO_POSTAL─┬─TX_TIPO_NACIONALIDAD─┬─NUMERO_MESA─┬─NU_ORDEN_MESA─┬─ESTBLECIMIENTO──────────────┬─DIRECCION_ESTABLECIMIENTO─
        */

        nga.field('NU_MATRICULA').label('DNI'),
        nga.field('TX_APELLIDO').label('Apellido'),
        nga.field('TX_NOMBRE').label('Nombre'),
        nga.field('TX_CLASE').label('Clase'),
        nga.field('TX_GENERO').label('Genero'),
        nga.field('TX_DOMICILIO').label('Domicilio'),
        nga.field('TX_SECCION').label('Seccion'),
        nga.field('TX_CIRCUITO').label('Circuito'),
        nga.field('TX_LOCALIDAD').label('Localidad'),
        nga.field('TX_CODIGO_POSTAL').label('Codigo Postal'),
        nga.field('TX_TIPO_NACIONALIDAD').label('Nacionalidad'),
        nga.field('NUMERO_MESA').label('N° Mesa'),
        nga.field('NU_ORDEN_MESA').label('Orden Mesa'),
        nga.field('ESTBLECIMIENTO').label('Establecimiento'),
        nga.field('DIRECCION_ESTABLECIMIENTO').label('Direccion Establecimiento'),
        nga.field('lla_2023').label('LLA 2023'),
        nga.field('jpec_2023').label('JXC 2023'),
        nga.field('uplp_2023').label('UPP 2023'),
        nga.field('hpnp_2023').label('HPN 2023'),
        nga.field('fdiydt_2023').label('FIT 2023')



    ]).filters([
    
        nga.field('custom_query', 'template')
            .label('Custom Query SQL')
            .template(`
            <input type="text" ng-model="value" placeholder="SQL query" class="form-control">
            `)
            .pinned(true),


        nga.field('TX_APELLIDO')
            .label('Apellido')
            .pinned(true),
        nga.field('TX_NOMBRE')
            .label('Nombre')
            .pinned(true),
        nga.field('TX_LOCALIDAD')
            .label('Localidad')
            .pinned(true),
        nga.field('NUMERO_MESA')
            .label('N° Mesa')
            .pinned(true),
        nga.field('NU_MATRICULA')
            .label('DNI')
            .pinned(true),
        nga.field('TX_SECCION')
            .label('Seccion')
            .pinned(true),

    ])

    .sortField('NU_MATRICULA')
    .sortDir('ASC')

    
    .exportFields([
        persona.listView().fields() // Reutiliza campos de la vista de lista
    ])
    .exportOptions({
        quotes: true,
        delimiter: ';'
    })
    

    admin.addEntity(persona);



    // ###################### RESULTADO ###############################

    var resultados = nga.entity('resultados_2023').identifier(nga.field('NU_MATRICULA'));

    resultados.listView()
    .title('Resultados de elecciones 2023')
    .perPage(30)
    .fields([
        /* Estos campos
        ┌─DISTRITO─┬─TX_TIPO_EJEMPLAR─┬─NU_MATRICULA─┬─TX_APELLIDO─┬─TX_NOMBRE───┬─TX_CLASE─┬─TX_GENERO─┬─TX_DOMICILIO───────────────────────┬─TX_SECCION─┬─TX_CIRCUITO─────────┬─TX_LOCALIDAD───────────────────────────────────────┬─TX_CODIGO_POSTAL─┬─TX_TIPO_NACIONALIDAD─┬─NUMERO_MESA─┬─NU_ORDEN_MESA─┬─ESTBLECIMIENTO──────────────┬─DIRECCION_ESTABLECIMIENTO─
        */

        nga.field('NU_MATRICULA').label('DNI'),
        nga.field('TX_APELLIDO').label('Apellido'),
        nga.field('TX_NOMBRE').label('Nombre'),
        nga.field('TX_CLASE').label('Clase'),
        nga.field('TX_GENERO').label('Genero'),
        nga.field('TX_DOMICILIO').label('Domicilio'),
        nga.field('TX_SECCION').label('Seccion'),
        nga.field('TX_CIRCUITO').label('Circuito'),
        nga.field('TX_LOCALIDAD').label('Localidad'),
        nga.field('TX_CODIGO_POSTAL').label('Codigo Postal'),
        nga.field('TX_TIPO_NACIONALIDAD').label('Nacionalidad'),
        nga.field('NUMERO_MESA').label('N° Mesa'),
        nga.field('NU_ORDEN_MESA').label('Orden Mesa'),
        nga.field('ESTBLECIMIENTO').label('Establecimiento'),
        nga.field('DIRECCION_ESTABLECIMIENTO').label('Direccion Establecimiento'),
        nga.field('lla_2023').label('LLA 2023'),
        nga.field('jpec_2023').label('JXC 2023'),
        nga.field('uplp_2023').label('UPP 2023'),
        nga.field('hpnp_2023').label('HPN 2023'),
        nga.field('fdiydt_2023').label('FIT 2023')


    ]).filters([
    
        nga.field('custom_query', 'template')
            .label('Custom Query SQL')
            .template(`
            <input type="text" ng-model="value" placeholder="SQL query" class="form-control">
            `)
            .pinned(true),


        nga.field('TX_APELLIDO')
            .label('Apellido')
            .pinned(true),
        nga.field('TX_NOMBRE')
            .label('Nombre')
            .pinned(true),
        nga.field('TX_LOCALIDAD')
            .label('Localidad')
            .pinned(true),
        nga.field('NUMERO_MESA')
            .label('N° Mesa')
            .pinned(true),
        nga.field('NU_MATRICULA')
            .label('DNI')
            .pinned(true),
        nga.field('TX_SECCION')
            .label('Seccion')
            .pinned(true),

    ])

    .sortField('NU_MATRICULA')
    .sortDir('ASC')

    

    admin.addEntity(resultados);
    
    // attach the admin application to the DOM and execute it
    nga.configure(admin);
}]);

const query = function (query) {
    console.log("Query",query)
}



myApp.config(['RestangularProvider', function (RestangularProvider) {
    RestangularProvider.addFullRequestInterceptor(function(element, operation, what, url, headers, params) {
        // Solo modificar las peticiones para obtener listas de recursos
        if (operation === "getList") {
            // Verifica si los parámetros de paginación existen
            if (params._page && params._perPage) {
                // Calcula el OFFSET basado en la página actual y la cantidad de elementos por página
                var offset = (params._page - 1) * params._perPage;
                var limit = params._perPage;

                // Ajusta los parámetros de la consulta para usar LIMIT y OFFSET
                params._limit = limit;
                params._offset = offset;

                // Limpia los parámetros de paginación originales para evitar confusión en la API
                delete params._page;
                delete params._perPage;
            }

            // Verifica y ajusta los parámetros de ordenación si están presentes
            if (params._sortField) {
                params._sort = params._sortField;  // Asume que tu API espera un parámetro '_sort'
                params._order = params._sortDir;   // Asume que tu API espera un parámetro '_order'
                delete params._sortField;
                delete params._sortDir;
            }

            // Filtrado personalizado: convierte filtros de ng-admin a algo utilizable por tu API si es necesario
            if (params._filters) {
                for (var filter in params._filters) {
                    params[filter] = params._filters[filter];
                }
                delete params._filters;
            }
        }

        // Asegúrate de retornar los parámetros ajustados
        return { params: params };
    });
}]);
