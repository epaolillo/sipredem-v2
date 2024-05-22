var myApp = angular.module('myApp', ['ng-admin']);


myApp.config(['$stateProvider','NgAdminConfigurationProvider', function ($stateProvider,nga) {
    // create an admin application


    $stateProvider.state('geo', {
        parent: 'ng-admin',  // Esto es crucial para mantener el layout de ng-admin
        url: '/geo',
        controller: 'GeoController',
        templateUrl: 'geo.html'
    });

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
        nga.field('fdiydt_2023').label('FIT 2023'),
        nga.field('m2').label('Valor m2')


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


    // ###################### inmuebles ###############################

    var inmuebles = nga.entity('inmuebles').identifier(nga.field('link'));

    inmuebles.listView()
    .title('Inmuebles San Fernando')
    .perPage(30)
    .fields([
 
        nga.field('link', 'string').label('Link'),
        nga.field('lat', 'string').label('Latitud'),
        nga.field('lon', 'string').label('Longitud'),
        nga.field('superficieTotal', 'number').label('Superficie Total'),
        nga.field('superficieCubierta', 'number').label('Superficie Cubierta'),
        nga.field('precio', 'number').label('Precio'),
        nga.field('precioMetroCuadradoTotal', 'number').label('Precio por Metro Cuadrado Total'),
        nga.field('precioMetroCuadradoCubierto', 'number').label('Precio por Metro Cuadrado Cubierto'),
        nga.field('ambientes', 'number').label('Ambientes'),
        nga.field('dormitorios', 'number').label('Dormitorios'),
        nga.field('banos', 'number').label('Baños'),
        nga.field('cocheras', 'number').label('Cocheras'),
        nga.field('bauleras', 'number').label('Bauleras'),
        nga.field('cantidadDePisos', 'number').label('Cantidad de Pisos'),
        nga.field('tipoDeCasa', 'string').label('Tipo de Casa'),
        nga.field('orientacion', 'string').label('Orientación'),
        nga.field('antiguedad', 'number').label('Antigüedad'),
        nga.field('expensas', 'number').label('Expensas'),
        nga.field('seguridad', 'string').label('Seguridad'),
        nga.field('portonAutomatico', 'string').label('Portón Automático'),
        nga.field('conBarrioCerrado', 'string').label('Con Barrio Cerrado'),
        nga.field('accesoControlado', 'string').label('Acceso Controlado'),
        nga.field('parrilla', 'string').label('Parrilla'),
        nga.field('pileta', 'string').label('Pileta'),
        nga.field('placards', 'string').label('Placards'),
        nga.field('toilette', 'string').label('Toilette'),
        nga.field('terraza', 'string').label('Terraza'),
        nga.field('comedor', 'string').label('Comedor'),
        nga.field('vestidor', 'string').label('Vestidor'),
        nga.field('estudio', 'string').label('Estudio'),
        nga.field('living', 'string').label('Living'),
        nga.field('patio', 'string').label('Patio'),
        nga.field('dormitorioEnSuite', 'string').label('Dormitorio en Suite'),
        nga.field('balcon', 'string').label('Balcón'),
        nga.field('altillo', 'string').label('Altillo'),
        nga.field('jardin', 'string').label('Jardín'),
        nga.field('cocina', 'string').label('Cocina'),
        nga.field('dependenciaDeServicio', 'string').label('Dependencia de Servicio'),
        nga.field('playroom', 'string').label('Playroom'),
        nga.field('conLavadero', 'string').label('Con Lavadero'),
        nga.field('desayunador', 'string').label('Desayunador'),
        nga.field('accesoAInternet', 'string').label('Acceso a Internet'),
        nga.field('aireAcondicionado', 'string').label('Aire Acondicionado'),
        nga.field('calefaccion', 'string').label('Calefacción'),
        nga.field('tvPorCable', 'string').label('TV por Cable'),
        nga.field('lineaTelefonica', 'string').label('Línea Telefónica'),
        nga.field('gasNatural', 'string').label('Gas Natural'),
        nga.field('grupoElectrogeno', 'string').label('Grupo Electrógeno'),
        nga.field('conEnergiaSolar', 'string').label('Con Energía Solar'),
        nga.field('conConexionParaLavarropas', 'string').label('Conexión para Lavarropas'),
        nga.field('aguaCorriente', 'string').label('Agua Corriente'),
        nga.field('cisterna', 'string').label('Cisterna'),
        nga.field('caldera', 'string').label('Caldera'),
        nga.field('chimenea', 'string').label('Chimenea'),
        nga.field('gimnasio', 'string').label('Gimnasio'),
        nga.field('jacuzzi', 'string').label('Jacuzzi'),
        nga.field('usuario', 'string').label('Usuario'),
        nga.field('moneda', 'string').label('Moneda'),
        nga.field('estacionamientoParaVisitantes', 'string').label('Estacionamiento para Visitantes')


    ]).filters([
        nga.field('precio', 'number')
        .label('Precio')
        .pinned(true),
    
    nga.field('superficieTotal', 'number')
        .label('Superficie Total')
        .pinned(true),
    
    nga.field('dormitorios', 'number')
        .label('Dormitorios')
        .pinned(true),
    
    nga.field('banos', 'number')
        .label('Baños')
        .pinned(true),
    
    nga.field('cocheras', 'number')
        .label('Cocheras')
        .pinned(true),
    
    nga.field('tipoDeCasa', 'string')
        .label('Tipo de Casa')
        .pinned(true),
    
    nga.field('antiguedad', 'number')
        .label('Antigüedad')
        .pinned(true),
    
    nga.field('seguridad', 'boolean')
        .label('Seguridad')
        .pinned(true),
    
    nga.field('piscina', 'boolean')  // Asumiendo que quisiste decir 'pileta' como 'piscina'
        .label('Piscina')
        .pinned(true),
    
    nga.field('accesoControlado', 'boolean')
        .label('Acceso Controlado')
        .pinned(true)

    ])

    .sortField('precioMetroCuadradoTotal')
    .sortDir('ASC')

    

    admin.addEntity(inmuebles);
    

    admin.menu(
        nga.menu()
        .addChild(nga.menu()
            .title('Geo')  // El título que aparecerá en el menú
            .link('/geo')  // Usa el mismo URL definido en el estado
            .icon('<span class="glyphicon glyphicon-world"></span>') // Icono personalizado (opcional)
        )
        
        .addChild(nga.menu(persona))
        .addChild(nga.menu(resultados))
        .addChild(nga.menu(inmuebles))
    );
    // attach the admin application to the DOM and execute i
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


myApp.controller('GeoController', ['$scope', '$http', function($scope, $http) {
    $scope.data = [];

    var API = '';
    // If the URL is localhost then use localhost API
    if (window.location.hostname === 'localhost') {
        API = 'http://localhost:3000/';
    }

    $scope.loadData = function() {
        $http.get(`${API}geo`).then(function(response) {
            $scope.data = response.data;
            $scope.mostrarMapa(); // Ensure to call it as a scope function
        }, function(error) {
            console.error('Error fetching data:', error);
        });
    };

    $scope.mostrarMapa = function() {
        var map = new ol.Map({
            target: 'map',
            layers: [
                new ol.layer.Tile({
                    source: new ol.source.OSM()
                })
            ],
            view: new ol.View({
                center: ol.proj.fromLonLat([-58.54692979910881, -34.445240420040676]),
                zoom: 12
            })
        });


        const normalizedm2 = $scope.normalizeArrayValue($scope.data.map(item => item.precioMetroCuadradoCubierto));

    
        // Capa de mapa de calor para m2
        var heatMapLayerM2 = new ol.layer.Heatmap({
            source: new ol.source.Vector({
                features: $scope.data.map((item,index) => new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.fromLonLat([item.lon, item.lat])),
                    weight: item.precioMetroCuadradoCubierto
                }))
            }),
            blur: 40,
            radius: 5,
            gradient: ['#00f', '#0ff', '#0f0', '#ff0', '#f00']
        });




        // Capa de mapa de calor para m2 total
        var heatMapLayerM2Total = new ol.layer.Heatmap({
            source: new ol.source.Vector({
                features: $scope.data.map((item,index) => new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.fromLonLat([item.lon, item.lat])),
                    weight: item.precioMetroCuadradoTotal
                }))
            }),
            blur: 40,
            radius: 5,
            gradient: ['#00f', '#0ff', '#0f0', '#ff0', '#f00']
        });


        
        var seguridad = new ol.layer.Heatmap({
            source: new ol.source.Vector({
                features: $scope.data.map((item,index) => new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.fromLonLat([item.lon, item.lat])),
                    weight: (item.seguridad == 'Sí'? 1 : 0)
                }))
            }),
            blur: 40,
            radius: 5,
            gradient: ['#00f', '#0ff', '#0f0', '#ff0', '#f00']
        });

        var pileta = new ol.layer.Heatmap({
            source: new ol.source.Vector({
                features: $scope.data.map((item,index) => new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.fromLonLat([item.lon, item.lat])),
                    weight: (item.pileta == 'Sí'? 1 : 0)
                }))
            }),
            blur: 40,
            radius: 5,
            gradient: ['#00f', '#0ff', '#0f0', '#ff0', '#f00']
        });



        // Todos juntos


        map.addLayer(heatMapLayerM2);
        map.addLayer(heatMapLayerM2Total);
        map.addLayer(seguridad);
        map.addLayer(pileta);


 
     
        heatMapLayerM2.setVisible(false); // Start with m2 layer invisible
        heatMapLayerM2Total.setVisible(false); // Start with m2 total layer invisible
        seguridad.setVisible(false); // Start with ambientes layer invisible
        pileta.setVisible(false); // Start with ambientes layer invisible

        $scope.map = map;
        $scope.heatMapLayerM2 = heatMapLayerM2;
        $scope.heatMapLayerM2Total = heatMapLayerM2Total;
        $scope.seguridad = seguridad;
        $scope.pileta = pileta;

        
    };

   


    $scope.normalizeArrayValue = function(numbers) {
        if (!numbers.length) return []; // Retorna un array vacío si no hay elementos
    
        const max = Math.max(...numbers);
        const min = Math.min(...numbers);
    
        // Si max y min son iguales, todos los elementos son iguales, devuelve array de unos.
        if (max === min) return numbers.map(() => 1);
    
        return numbers.map(num => (num - min) / (max - min));
    }

    // Función para alternar la visibilidad de las capas
    $scope.toggleLayer = function(layerName) {
        $scope[layerName].setVisible(!$scope[layerName].getVisible());
    };
    


    $scope.loadData();
}]);



myApp.controller('GeoController2', ['$scope', '$http', function($scope, $http) {


    const normalizedlla2023 = $scope.normalizeArrayPolitica($scope.data.map(item => item.lla_2023));

    // Capa de mapa de calor para lla_2023
    var heatMapLayerLla2023 = new ol.layer.Heatmap({
        source: new ol.source.Vector({
            features: $scope.data.map((item,index) => new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([item.lon, item.lat])),
                weight: normalizedlla2023[index]
            }))
        }),
        blur: 40,
        radius: 5,
        opacity: 0.5,
        gradient: ['rgba(0,0,0,0)','#ff00ff']
    });

    const normalizedjpec2023 = $scope.normalizeArrayPolitica($scope.data.map(item => item.jpec_2023));

    // Capa de mapa de calor para lla_2023
    var heatMapLayerJpec2023= new ol.layer.Heatmap({
        source: new ol.source.Vector({
            features: $scope.data.map((item,index) => new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([item.lon, item.lat])),
                weight: normalizedjpec2023[index]
            }))
        }),
        blur: 40,
        radius: 5,
        opacity: 0.5,
        gradient: ['rgba(0,0,0,0)','#ffff00']
    });

    const normalizeduplp2023 = $scope.normalizeArrayPolitica($scope.data.map(item => item.uplp_2023));

    // Capa de mapa de calor para lla_2023
    var heatMapLayeruplp2023= new ol.layer.Heatmap({
        source: new ol.source.Vector({
            features: $scope.data.map((item,index) => new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([item.lon, item.lat])),
                weight: normalizeduplp2023[index]
            }))
        }),
        blur: 40,
        radius: 5,
        opacity: 0.5,
        gradient: ['rgba(0,0,0,0)','#0000ff']
    });

    const normalizedfit2023 = $scope.normalizeArrayPolitica($scope.data.map(item => item.fdiydt_2023));


    console.log("Normalizados m2",normalizedfit2023)
    console.log("Data fit",$scope.data.map(item => item.fdiydt_2023));

    // Capa de mapa de calor para lla_2023
    var heatMapLayerfit2023= new ol.layer.Heatmap({
        source: new ol.source.Vector({
            features: $scope.data.map((item,index) => new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([item.lon, item.lat])),
                weight: normalizedfit2023[index]
            }))
        }),
        blur: 40,
        radius: 5,
        opacity: 0.5,
        gradient: ['rgba(0,0,0,0)','#ff0000']
    });

    map.addLayer(heatMapLayerLla2023);
    map.addLayer(heatMapLayerJpec2023);
    map.addLayer(heatMapLayeruplp2023);
    map.addLayer(heatMapLayerfit2023);

    heatMapLayerLla2023.setVisible(false); // Start with lla_2023 layer invisible
    heatMapLayerJpec2023.setVisible(false); // Start with jpec_2023 layer invisible
    heatMapLayeruplp2023.setVisible(false); // Start with uplp_2023 layer invisible
    heatMapLayerfit2023.setVisible(false); // Start with fit_2023 layer invisible

    $scope.heatMapLayerLla2023 = heatMapLayerLla2023;
    $scope.heatMapLayerJpec2023 = heatMapLayerJpec2023;
    $scope.heatMapLayeruplp2023 = heatMapLayeruplp2023;
    $scope.heatMapLayerfit2023 = heatMapLayerfit2023;


     // Función para alternar la visibilidad de las capas
     $scope.toggleLayer = function(layerName) {
        if (layerName === 'm2') {
            $scope.heatMapLayerM2.setVisible(!$scope.heatMapLayerM2.getVisible());
        } else if (layerName === 'lla_2023') {
            $scope.heatMapLayerLla2023.setVisible(!$scope.heatMapLayerLla2023.getVisible());
        }
        else if (layerName === 'jpec_2023') {
            $scope.heatMapLayerJpec2023.setVisible(!$scope.heatMapLayerJpec2023.getVisible());
        }
        else if (layerName === 'uplp_2023') {
            $scope.heatMapLayeruplp2023.setVisible(!$scope.heatMapLayeruplp2023.getVisible());
        }
        else if (layerName === 'fit_2023') {
            $scope.heatMapLayerfit2023.setVisible(!$scope.heatMapLayerfit2023.getVisible());
        }
    };


    $scope.normalizeArrayPolitica = function(numbers) {
        if (!numbers.length) return []; // Retorna un array vacío si no hay elementos
    
        const max = 100
        const min = 0
    
        // Si max y min son iguales, todos los elementos son iguales, devuelve array de unos.
        if (max === min) return numbers.map(() => 1);
    
        return numbers.map(num => (num - min) / (max - min));
    }

}])