'use strict';
comicsApp.controller('ComicsAppCtrl', ['$scope', '$http', '$filter', '$timeout', '$templateCache', '$localStorage', function($scope, $http, $filter, $timeout, $templateCache, $localStorage) {
	$scope.dbug = dbug;
	$scope.console = $scope.iniciado;
	$scope.moment = moment;
	$scope.c = c;
	$scope.z = z;
	
	//Controlador de pestañas
	$scope.pestanaActiva = 'listado';
	$scope.pestanaActivar = function(pestana){ $scope.pestanaActiva = pestana; };
	$scope.agnoActivo = 0;
	
	//Índices para mostrar / ocultar alertas
	$scope.alertCargando = true;
	$scope.alertCargandoRegistros = true;
	$scope.alertEliminando = false;

	//Registros
	$scope.nuevo = vacio();
	
	//Cambiar valor de adquisición
	$scope.adquisicion = function(r, refresh){
		var adquisicion = (r.adquirido === 0) ? 1 : 0;
		var cambio = false;
		
		//Mensaje de información
		var msg = 'Fecha de registro:\n' + moment(r.fecha_registro).format('MMMM MM, YYYY - h:mm a') + ' \n\nFecha adquisición:\n' + moment(r.fecha_adquisicion).format('MMMM MM, YYYY - h:mm a');
		if(adquisicion === 0 && confirm('Confirme el cambio de adquisición:\n' + msg))
			var cambio = true;
		else if(adquisicion == 1)
			cambio = true;
		
		if(cambio)
		{
			// var r = angular.copy(r)
			r.adquirido = adquisicion;
			r.fecha_adquisicion = new Date();
			
			addRegistro({
				data: r,
				put: true,
				success: function(){
					//Actualizar directivas
					if(typeof refresh != 'undefined' && refresh) $scope.$broadcast('registrosAlterados', r);
				},
				error: function(e){
					alert('Ha ocurrido un error.');
					c(e);
					$scope.exitApp();
				}
			});
		}
	};
	
	/*Eliminación de registro*/
	$scope.eliminar = function(r){
		var r = angular.copy(r);		
		if(confirm('Confirme la eliminación de este registro:\n' + r.titulo + ' #' + r.volumen))
		{
			removeRegistro({
				id: r.id,
				success: function(){
					//Componer sumatorias
					$scope.sumar(r.agno, r.mes, r.dia, -r.precio);
					
					$scope.$apply();
					$('.comic-modal').modal('hide');
					
					//Remover de localStorage
					$scope.typeOptions.splice($scope.typeOptions.indexOf(r.titulo), 1);
					$localStorage.typeOptions.splice($localStorage.typeOptions.indexOf(r.titulo), 1);
					$scope.typeAheadSet();
					
					//Remover fechas si está vacío el día
					getRegistro({
						data: { agno: r.agno, mes: r.mes, dia: r.dia },
						success: function(data){
							if(data.length == 0)
							{
								$localStorage.fechas[r.agno][r.mes].splice($localStorage.fechas[r.agno][r.mes].indexOf(r.dia), 1);
								var k = z(r.agno) + z(r.mes) + z(r.dia);
								delete $localStorage.sumatorias[k];
								$scope.$apply();
							}
						}
					});
					
					//Remover mes si está vacío
					getRegistro({
						data: { agno: r.agno, mes: r.mes },
						success: function(data){
							if(data.length == 0)
							{
								delete $localStorage.fechas[r.agno][r.mes];
								$scope.$apply();
							}
						}
					});
					
					//Remover año si está vacío
					getRegistro({
						data: { agno: r.agno },
						success: function(data){
							if(data.length == 0)
							{
								delete $localStorage.fechas[r.agno];
								$scope.$apply();
								$scope.pestanaAgnoActivo($scope.keysReversed($scope.fechas)[0]);
							}
						}
					});
					
					//Actualizar directivas
					$scope.$broadcast('registrosAlterados', r);
				},
				error: function(){ alert('Ha ocurrido un error. Intente de nuevo más tarde.'); }
			});
		}
	};
	
	//FORMULARIO > Registrar. Validar y toda la cosa
	$scope.registrar = function(fecha_registro, fecha_adquisicion){
		var nuevo = angular.copy($scope.nuevo);
		nuevo.titulo = nuevo.titulo.toLocaleUpperCase(); //Mayúsculas
		nuevo.id = code(nuevo);
		$scope.fecha = moment($scope.fecha);
		
		//Establacer objetos de fecha para ayudar en los filtrados
		var momentObj = moment(nuevo.fecha);
		nuevo.agno = momentObj.year();
		nuevo.mes = momentObj.month() + 1;
		nuevo.dia = momentObj.date();
		
		if(angular.isUndefined(fecha_registro))
			nuevo.fecha_registro = (angular.isUndefined(nuevo.fecha_registro)) ? new Date() : new Date(nuevo.fecha_registro);
		else
			nuevo.fecha_registro = new Date(fecha_registro);
		
		if(angular.isUndefined(fecha_adquisicion))
			nuevo.fecha_adquisicion = (nuevo.adquirido == 1) ? nuevo.fecha_registro : 'No definido';
		else
			nuevo.fecha_adquisicion = new Date(fecha_adquisicion);
		
		//Agregar
		addRegistro({
			data: nuevo,
			success: function(){
				//Crear objetos de fecha
				$timeout(function(){ //El timeout es necesario para que se estabilicen las variables mientras se ejecutan otros inserts
					$scope.registros[nuevo.id] = nuevo; //Asignar a la colección
				
					if(typeof $scope.fechas[nuevo.agno] == 'undefined') $scope.fechas[nuevo.agno] = {};
					if(typeof $scope.fechas[nuevo.agno][nuevo.mes] == 'undefined') $scope.fechas[nuevo.agno][nuevo.mes] = [];
					if($scope.fechas[nuevo.agno][nuevo.mes].indexOf(nuevo.dia) < 0)
					{
						$scope.fechas[nuevo.agno][nuevo.mes].push(nuevo.dia);
						$scope.fechas[nuevo.agno][nuevo.mes] = $scope.fechas[nuevo.agno][nuevo.mes].sort(function(a, b){return b-a});
					}
					
					//Ingresar a sumatorias
					$scope.sumar(nuevo.agno, nuevo.mes, nuevo.dia, nuevo.precio);
					
					//TypeAhead
					if($scope.typeOptions.indexOf(nuevo.titulo) < 0) $scope.typeOptions.push(nuevo.titulo);
					$scope.typeAheadSet();
					
					//Actualizar directivas
					$scope.$broadcast('registrosAlterados', nuevo);
				}, 1);
			},
			repetido: function(){
				getRegistro({
					data: { id: nuevo.id },
					success: function(repetidos){
						for(var i in repetidos)
						{
							var conVariante = (nuevo.variante.length > 0) ? ' (Variante de ' + nuevo.variante + ')' : '';
							if(typeof navigator.notification != 'undefined') navigator.notification.vibrate(500);
							alert('Wow wow wow!\n¡Este ya lo tienes!\n' + nuevo.titulo + conVariante + ' #' + nuevo.volumen + ' ($' + repetidos[i].precio + '.00)\n' + $filter('date')(repetidos[i].fecha, 'longDate'));
							if(dbug) c('REPETIDO :( ' + nuevo.titulo);
						}
					},
					error: function(){ c('Error no definido.'); }
				});
			},
			error: function(e){ c(e); }
		});
		
		$scope.nuevo = vacio();
	}
	
	/*Inicializar sistema*/
	$scope.iniciado = false;
	$scope.initApp = function(){
		//Esperar a que la app esté lista
		var esperar = function(){
			$scope.console += '\nEsperando...';
			$timeout(function(){
				try{
					$scope.console += '\n'+!$scope.iniciado+' && '+device.available+' && '+isDeviceReady+' && '+!notificationOn;
					if(!$scope.iniciado && device.available && isDeviceReady && !notificationOn)
					{
						$scope.dbInitiate();
					}
					else esperar();
				} catch(e){
					$scope.console += '\n'+e;
					esperar();
				}
			}, 500);
		}
		
		//¡Comenzar!
		if(typeof cordova != 'undefined') //Mobil
			esperar();
		else //Local
			$scope.dbInitiate();
	};
	
	/*Inicializar la BDD*/
	$scope.registros = [];
	$scope.dbInitiate = function(){
		//Objetos de localStorage
		if(typeof $localStorage.fechas == 'undefined') $localStorage.fechas = {};
		if(typeof $localStorage.sumatorias == 'undefined') $localStorage.sumatorias = {};
		if(typeof $localStorage.typeOptions == 'undefined') $localStorage.typeOptions = [];
		$scope.fechas = $localStorage.fechas;
		$scope.sumatorias = $localStorage.sumatorias;
		$scope.typeOptions = $localStorage.typeOptions;
		
		//Agregar títulos al typeAhead
		$scope.typeAheadSet();
		$scope.alertCargando = false;
		
		//Seleccionar primer año
		if(objsize($scope.fechas) > 0) $scope.pestanaAgnoActivo($scope.keysReversed($scope.fechas)[0]);
		
		//Inicialización finalizada
		$scope.iniciado = true;
	};
	
	//Cambiar año activo
	$scope.pestanaAgnoActivo = function(i){
		var cambiarAgno = function(){
			$scope.agnoActivo = i;
			$scope.regs = $scope.filteredObjects($scope.registros, { agno: i });
		}
		
		//Abortar transacciones pendientes
		if(dbTransactions == 0)
			cambiarAgno();
		else
		{
			ccNotifReset();
			dbOpen({ success: function(){
				w('dbTransactions > ' + dbTransactions + ', dbCompletes > ' + dbCompletes);
				cambiarAgno();
				$scope.$apply();
			}});
		}
	};

	//Crear sumatorias por día
	$scope.sumar = function(agno, mes, dia, precio){
		var k = z(agno) + z(mes) + z(dia);
		if(typeof $scope.sumatorias[k] == 'undefined') $scope.sumatorias[k] = 0;
		$scope.sumatorias[k] += precio;
	};
	
	//Toogle de vista según adquisición
	$scope.filtroActivo = -1;
	$scope.filtroRegistros = function(filtro){
		$scope.filtroActivo = filtro;
	};
	
	//Generar objeto de filtro general
	$scope.filteredObjects = function(registros, args){
		if($scope.filtroActivo >= 0) args.adquirido = $scope.filtroActivo;
		var r = $filter('filtroObjetos')(registros, args);
		return r;
	}
	
	//Buscador
	$scope.matcher = function (item, query) { if (item.toLowerCase().indexOf(query.trim().toLowerCase()) != -1) return true; };
	
	//Asignar el typeAhead
	$scope.typeAheadSet = function(){
		$('.typeAhead').typeahead('destroy');
		$('.typeAhead').typeahead({
			minLength: 3,
			hint: false,
			highlight: false
		},
		{
			name: 'states',
			displayKey: 'value',
			source: function (query, process) {
				var states = [];
				$.each($scope.typeOptions, function (i, state) {
					if(states.length < 5 && $scope.matcher(state, query)) states.push({value: state});
				});
				process(states);
			},
		});
		$('.toUpper').blur(function(){ $(this).val($.trim($(this).val().toUpperCase())); });
	};
	
	//Abrir vínculos con el XDK
	$scope.openSite = function(){
		intel.xdk.device.launchExternal(host);
	};
	
	$scope.richEmail = 'rich.zavalac@gmail.com';
	$scope.sendMail = function(){
		var bodyText = '¡Tengo una idea para implementar en ContaComics!';
		intel.xdk.device.sendEmail(bodyText, $scope.richEmail, "ContaComics", true, "", "" ); 
	};

	//MISCOMICS
	/*$scope.misComicsElegido = { titulo: '', cover: '' }; //Info que va al $scope.agregar
	$scope.misComicsElegidoFecha = new Date(); //Info que va al $sope.agregar
	$scope.alertCargandoMisComics = false;
	$scope.alertCargandoMisComicsError = false;
	$scope.misComicsMes = (new Date()).getMonth() + 1;
	$scope.misComicsAgno = (new Date()).getFullYear();
	
	//Cambiar de mes
	$scope.misComicsCambio = function(i){
		$scope.misComicsMes += i;
		if($scope.misComicsMes === 0)
		{
			$scope.misComicsMes = 12;
			$scope.misComicsAgno--;
		}
		else if($scope.misComicsMes == 13)
		{
			$scope.misComicsMes = 1;
			$scope.misComicsAgno++;
		}
		$scope.misComicsLoad();
	};
	
	//Crear arreglo de comics
	$scope.misComicsObjetos = [];
	$scope.misComicsObjetosIndice = 0;
	$scope.misComicsLoad = function(){
		$scope.alertCargandoMisComicsError = false;
		if(!$scope.alertCargandoMisComics)
		{
			$('.MCmesesBotones .btn').addClass('disabled');
			var mesElegido = -1;
			if($scope.misComicsObjetos.length > 0) for(var i in $scope.misComicsObjetos) if($scope.misComicsObjetos[i].mes == $scope.misComicsMes && $scope.misComicsObjetos[i].agno == $scope.misComicsAgno) mesElegido = i;
			
			if(mesElegido == -1)
			{
				$scope.alertCargandoMisComics = true;
				var url = host + 'mexicomics/listado/' + $scope.misComicsMes + '/' + $scope.misComicsAgno + '.html';
				$.ajax({
					url: url,
					crossDomain: true,
					dataType: 'json',
					timeout: 10000,
					cache : false,
					success: function(data){
						//Reemplazar objetos sin cover
						for(var i in data) for(var ii in data[i].objetos) if(data[i].objetos[ii].cover.indexOf('nocover') >=0 || (data[i].objetos[ii].cover.indexOf('png') < 0 && data[i].objetos[ii].cover.indexOf('jpg') < 0)) data[i].objetos[ii].cover = 'images/no_cover.gif';
						
						var info = { mes: $scope.misComicsMes, agno: $scope.misComicsAgno, data: data };
						$scope.misComicsObjetos.push(info);
						$scope.misComicsObjetosIndice = $scope.misComicsObjetos.length - 1;
					},
					error: function(){
						// $('.MCmesesBotones .btn').hide('clip');
						$scope.alertCargandoMisComicsError = true;
					},
					complete: function(){
						$scope.alertCargandoMisComics = false;			
						$('.MCmesesBotones .btn').removeClass('disabled');
						$scope.$apply();
					}
				});
			}
			else
			{
				$scope.alertCargandoMisComics = false;
				$('.MCmesesBotones .btn').removeClass('disabled');
				$scope.misComicsObjetosIndice = mesElegido;
			}
		}
	};
	
	//Agregar desde MC
	$scope.misComicsPanelSeleccionado = 0;
	$scope.misComicsModal = function(o, fecha, kmc){
		$scope.misComicsElegido = o;
		$scope.misComicsElegidoFecha = fecha;
		$scope.misComicsPanelSeleccionado = kmc;
		
		//Se declara el atributo para que se abra externamente. Por alguna razón, angular no permite declararlo con brackets
		$('#mcModalTarget').attr('onclick', "intel.xdk.device.launchExternal('" + o.href + "');");
	};
	
	$scope.misComicsAgregando = false;
	$scope.misComicsAgregar = function(obj, fecha){
		obj = $scope.misComicsElegido;
		fecha = $scope.misComicsElegidoFecha;
		if(!$scope.misComicsAgregando)
		{
			$scope.misComicsAgregando = true;
			$scope.nuevo.titulo = obj.titulo.toUpperCase();
			$scope.nuevo.volumen = parseInt(obj.volumen.toUpperCase());
			$scope.nuevo.precio = parseFloat(obj.precio.toUpperCase());
			$scope.nuevo.variante = $.trim(obj.variante.toUpperCase().replace('VAR ', ''));
			var f = fecha.split('-');
			$scope.nuevo.fecha = new Date( f[1] + '-' + f[0] + '-' + f[2] );
			$scope.registrar(true);
			
			$('#mc-panel-' + $scope.misComicsPanelSeleccionado).animate({ opacity: 0.2 }, 1000);
			$scope.miscomicsModalCerrar();
			
			$scope.misComicsAgregando = false;
		}
	};
	
	//Cerrar Modal de MisComics
	$scope.miscomicsModalCerrar = function(){
		$('.mc-modal').modal('hide').on('hidden.bs.modal', function (){
			$scope.misComicsAgregando = false;
		});
	};
	*/
	//Ventana de más detalles
	$scope.detalle = vacio();
	$scope.detallesShow = function(registro){
		$scope.detalle = angular.copy(registro);
		$scope.detalle.foto = $scope.getFoto(registro.id);
		$('.comic-modal').modal('show');
	};
	
	//Foto en detalles
	$scope.fotos = [];
	$scope.getFoto = function(id){
		if(typeof $scope.fotos[id] == 'undefined') $scope.fotos[id] = nofoto;
		return $scope.fotos[id];
	};
	
	//Acciones por cambio de pestaña
	$scope.$watch('pestanaActiva', function(newVal, oldVal){
		//Mostrar pestaña de MisComics y cargar listado
		if(newVal == 'misComicsList') $scope.misComicsLoad();
		if(newVal == 'formulario') setTimeout(function(){ $('#nuevo_titulo').focus(); }, 300);
		if(newVal == 'opciones')
		{
			getRegistro({
				success: function(data){
					$scope.registrosTodos = data;
					$scope.$apply();
				},
				error: function(){ c('Error no definido en [obtener] > ' + filtro.agno + '/' + filtro.mes); }
			});
		}
		
		window.scrollTo(0, 0);
	});

	//Mostrar "Más opciones"
	$scope.masOpcionesIntento = 0;
	$scope.masOpcionesTry = function(){
		$scope.masOpcionesIntento++;
		if($scope.masOpcionesIntento > 5) $scope.pestanaActiva = 'opciones';
	};
	
	/*OPCIONES DE CORDOBA*/
	$scope.exitApp = function(){ if(typeof navigator != 'undefined') navigator.app.exitApp(); };
	
	//Ordenar inversamente los índices de un objeto
	$scope.keysReversed = function(obj){
    var keys = [];
    var sorted_obj = {};
    for(var key in obj) if(obj.hasOwnProperty(key)) keys.push(key);
    keys.sort(function(a, b){return b-a});//.reverse();
    // jQuery.each(keys, function(i, key){
      // sorted_obj[key] = obj[key];
    // });
		// c(keys);
    return keys;
	};

	//Contador de elementos en un objeto
	$scope.objsize = objsize;
	
	/*22 ago 2015 ¡SERIES!*/
	$scope.series = {};
	$scope.seriesGenerar = function(serie){
		$scope.series = { titulo: $scope.series.titulo, serie: serie, registros: [], volumenes: 0, importe: 0, show: false };
		var volumenes = {};		
		getRegistro({
			data: { titulo: serie },
			success: function(data){
				volumenes = data;
				
				//Ordenar por volumen
				$scope.series.registros = [];
				var numeros = [];
				for(var i in volumenes) numeros.push(volumenes[i].volumen);
				numeros = numeros.sort(function(a, b){return a-b});
				for(var i in numeros)
						for(var vi in volumenes)
								if(volumenes[vi].volumen == numeros[i])
								{
									$scope.series.registros.push(volumenes[vi]);
									$scope.series.volumenes++;
									$scope.series.importe += volumenes[vi].precio;
								}
				$scope.series.show = true;
				$scope.$apply();
			},
			error: function(){ er('Error no definido...'); }
		});
  };
	
	/*Modo de debugueo*/
	$scope.dbugChange = function(){
		$scope.dbug = !$scope.dbug;
		dbug = $scope.dbug;
	}
	
	/*Vaciar BDD*/
	$scope.bddVaciar = function(){
		executeTransaction({ query: "DELETE FROM registros", success: function(){c('Deleted');}, error: function(e){err(e);} });
		
		$scope.$storage = $localStorage.$reset();
		$scope.dbInitiate();
	}
	
	//7 Mayo 2016 > Alimentar la base de datos desde CENTURION
	$scope.bddDesdeCenturion = function(){
		$scope.centurionRegistro = $scope.centurionTotal = 0;
		centurionHTTP();
	};
	
	//Solicitar información a CENTURION
	var centurionHTTP = function(){
		if($scope.centurionTotal == 0 || $scope.centurionRegistro < $scope.centurionTotal)
		{
			$http.jsonp('http://192.168.10.104/contacomics_data/?registro=' + $scope.centurionRegistro + '&callback=JSON_CALLBACK')
			.then(function successCallback(response) {
				var data = response.data.registro;
				$scope.nuevo = data;
				$scope.nuevo.fecha = new Date(data.fecha);
				$('#nuevo_titulo').val($scope.nuevo.titulo);
				$scope.nuevo.titulo = data.titulo;
				try
				{
					$scope.registrar(data.fecha_registro, data.fecha_adquisicion);
					if($scope.centurionTotal == 0) $scope.centurionTotal = response.data.total;
					$scope.centurionRegistro++;
					centurionHTTP();
				}
				catch(e){ alert("ERROR: " + $scope.centurionRegistro +' < ' + $scope.centurionTotal); }
			}, function errorCallback(response) {
				alert('Ha ocurrido un error.');
				console.log(response);
			});
		}
		else
		{
			alert("Solicitudes finalizadas.");
			$scope.centurionRegistro = $scope.centurionTotal = 0;
		}
	};
}]);