'use strict';
var comicsApp = angular.module('comicsApp', []);

comicsApp.controller('ComicsAppCtrl', ['$scope', '$http', '$filter', '$timeout', function($scope, $http, $filter, $timeout) {
	//Controlador de pestañas
	$scope.pestanaActiva = 'listado';
	$scope.pestanaActivar = function(pestana){ $scope.pestanaActiva = pestana; };
	$scope.agnoActivo = 0;
	
	//Índices para mostrar / ocultar alertas
	$scope.alertCargando = false;
	$scope.alertCargandoRegistros = false;
	$scope.alertEliminando = false;
	$scope.alertSync = false;

	//Registros
	$scope.typeOptions = [];
	$scope.meses = [ 'Smarch', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre' ];
	$scope.nuevo = vacio();
	
	//Tab de Opciones
	$scope.dbGetVariables = function(){
		$scope._dbName = ls.getItem('dbName');
		$scope._dbTableName = ls.getItem('dbTableName');
		$scope._dbDeleteTableName = ls.getItem('dbDeleteTableName');
		$scope._host = ls.getItem('host');
		$scope._syncFecha = ls.getItem('syncDate');
		$scope.syncFechaSet();
	};
	
	//Establecer fechas de sincronización
	$scope._syncFecha = '';
	$scope._syncFechaFecha = '';
	$scope._syncFechaHora = '';
	$scope.syncFechaSet = function(){
		$scope._syncFecha = ls.getItem('syncDate');
		var sd = new Date($scope._syncFecha);
		$scope._syncFechaFecha = dateFormat(sd);
		$scope._syncFechaHora = hourFormat(sd);
	};
	
	//Cambiar valor de adquisición
	$scope.adquisicion = function( key_agno, key_fecha, key_r){
		var r = $scope.registros[key_agno][key_fecha][key_r];
		$scope.registros[key_agno][key_fecha][key_r].adquirido = r.adquirido = (r.adquirido === 0) ? 1 : 0;
		
		//Remover la clase de eliminación, ¡¡¡que no sé porqué pone!!! :'(
		$('.clicking').removeClass('clicking');
		
		dbUpdate($scope._dbTableName, 'adquirido', r.adquirido, r.id, function(){ c(r.id + ' > ' + ((r.adquirido == 1) ? 'Adquirido' : 'Inadquirido') ); });
		dbUpdate($scope._dbTableName, 'fecha_registro', $scope.getFechaActual(), r.id, function(){
			$scope.sync(true); //Sincronizar de ser posible
		});
	};
	
	/*Eliminación de registro*/
	$scope.eliminar = function(key_agno, key_fecha, key_r, id, titulo, volumen){
		if(confirm('Confirme la eliminación de este registro:\n' + titulo + ' #' + volumen))
		{
			dbDelete(dbTableName, id, function(){ c(id + ' > Eliminado'); });
			
			//Remover del arreglo
			$scope.registros[key_agno][key_fecha].splice(key_r, 1);
			$scope.generarSumatorias(key_agno, key_fecha);
			
			//Remover de la BDD
			var s = "INSERT INTO " + dbDeleteTableName + " VALUES (NULL, '" + id + "', '" + $scope.getFechaActual()  + "')";
			dbQuery(s, function(){
				$scope.sync(true); //Sincronizar de ser posible
			});
			
			//Remover meses y años vacíos
			if($scope.registros[key_agno][key_fecha].length === 0)
			{
				$scope.registros[key_agno].splice(key_fecha, 1);
				
				var index = $scope.fechas_orden[key_agno].indexOf($scope.fechas[key_agno][key_fecha].fecha);
				$scope.fechas_orden[key_agno].splice(index, 1);
				$scope.fechas[key_agno].splice(key_fecha, 1);

				if($scope.fechas[key_agno].length === 0)
				{
					$scope.registros.splice(key_agno, 1);
					$scope.fechas.splice(key_agno, 1);
					$scope.fechas_orden.splice(key_agno, 1);
					$scope.agnos.splice(key_agno, 1);
					$scope.pestanaAgnoActivo(0);
				}
			}
		}
		else $('.clicking').removeClass('clicking');
	};
	
	/*Resetear la DB*/
	$scope.dbReset = function(){
		$scope.agnos = [];
		$scope.fechas = [];
		$scope.registros = [];
		
		dbCrear();
		c('DB Reseteada :(');
	};
	
	//FORMULARIO
	/*Registrar. Validar y toda la cosa.*/
	$scope.registrar = function(desdeMisComics) {
		if(angular.isUndefined(desdeMisComics)) desdeMisComics = false;
		if(!desdeMisComics) $scope.nuevo.titulo = $('#nuevo_titulo').val(); //Reparar valores del arreglo $scope.nuevos. Corta los valores del título y no sé porqué :(
		if($scope.nuevo.titulo.length > 0 && $scope.nuevo.volumen !== null && $scope.nuevo.precio !== null)
		{
			$scope.nuevo.id = code($scope.nuevo);
			
			//Intentar insertar. No permitirá duplicados :)
			var fechaPublicacion = $filter('date')(new Date($scope.nuevo.fecha), 'yyyy-MM-dd');
			var s = "INSERT INTO " + dbTableName + " VALUES ('" + $scope.nuevo.id + "', '" + $scope.nuevo.titulo + "', '" + $scope.nuevo.volumen + "', '" + $scope.nuevo.precio + "', '" + fechaPublicacion + "', '" + $scope.getFechaActual() + "', '" + $scope.nuevo.variante + "', '" + $scope.nuevo.adquirido + "')";
			db.query(s).fail(function (tx, err) { //¡Producto repetido! ¿Cuándo lo compré?
				var s = "SELECT strftime('%d', fecha) dia, strftime('%m', fecha) + 0 mes, strftime('%Y', fecha) agno, precio FROM " + dbTableName + " WHERE titulo = '" + $scope.nuevo.titulo + "' AND volumen = '" + $scope.nuevo.volumen +  "' AND variante = '" + $scope.nuevo.variante + "'";
				db.query(s).done(function(r){
					var conVariante = ($scope.nuevo.variante.length > 0) ? ' (Variante de ' + $scope.nuevo.variante + ')' : '';
					alert('Wow wow wow!\n¡Este ya lo tienes!\n' + $scope.nuevo.titulo + conVariante + ' #' + $scope.nuevo.volumen + ' ($' + r[0].precio + '.00)\n' + r[0].dia + ' de ' + $scope.meses[parseInt(r[0].mes)] + ' del ' + r[0].agno);
				}).fail(function (tx, err) {
					alert('Error catastrófico!');
					throw new Error(err.message);
				});
			})
			.done(function (products) { //Producto registrado ¡Agregar al $scope!
				var fechaExiste = false; //Indica si la fecha del artículo existe
				var fecha = new Date($scope.nuevo.fecha);
				var key_agno = $scope.agnos.indexOf(fecha.getFullYear());
				if(key_agno >= 0) //El año existe
				{
					for(var key_fecha in $scope.fechas[key_agno])
					{
						if(!fechaExiste && parseInt($scope.fechas[key_agno][key_fecha].mes) == parseInt(fecha.getMonth() + 1) && parseInt($scope.fechas[key_agno][key_fecha].dia) == parseInt(fecha.getDate()))
						{
							$scope.registros[key_agno][key_fecha].push($scope.nuevo);
							fechaExiste = true;
							break;
						}
					}
				}
				else
				{
					$scope.agnos.push(fecha.getFullYear());
					key_agno = $scope.agnos.length - 1;
					$scope.fechas[key_agno] = [];
					$scope.registros[key_agno] = [];
					$scope.fechas_orden[key_agno] = [];
				}
				
				if(!fechaExiste)
				{
					if(typeof $scope.fechas[key_agno] == 'undefined') $scope.fechas[key_agno] = [];
					var nuevaFecha = {
						fecha: $filter('date')(new Date(fecha), 'yyyy-MM-dd'),
						dia: fecha.getDate(),
						mes: fecha.getMonth() + 1,
						agno: fecha.getFullYear(),
						suma: 0
					};
					$scope.fechas[key_agno].push(nuevaFecha);
					$scope.fechas_orden[key_agno].push(nuevaFecha.fecha);
					key_fecha = $scope.fechas[key_agno].length - 1;
					$scope.registros[key_agno][key_fecha] = [ $scope.nuevo ];
				}
				
				$scope.generarSumatorias(key_agno, key_fecha);
				$scope.fechas_orden[key_agno].sort().reverse();
				
				c("Agregado! > " + JSON.stringify($scope.nuevo));
				$scope.sync(true); //Sincronizar de ser posible
				$scope.nuevo = vacio();
				$scope.$apply();
			});
		}
	};

	//BDD
	/*Inicializar la BDD*/
	$scope.dbInitiate = function(){
		$scope.dbGetVariables();
	
		//Verificar que exista la base de datos
		var s = "SELECT COUNT(id) r FROM " + dbTableName;
		db.query(s).fail(function(tx, err){
			//¡No hay base de datos! ¡Crea una!
			dbCrear($scope.dbInitiate());
			throw new Error(err.message);
		}).done(function(records){	
			$scope.generarAgnos(); //Inicializar los años y mostrar registros del primero
			$scope.syncFechaSet(); //Establecer fecha de Sync en el #scope
			$scope.typeAheadGenerateOptions(); //Agregar títulos al typeAhead
		});
	};
	
	//Inicializar variables y registros
	$scope.generarAgnos = function(){
		//Resetear índices
		$scope.alertCargando = true;
		$scope.agnos = [];
		$scope.fechas = [];
		$scope.fechas_orden = [];
		$scope.registros = [];
		$scope.sumatorias = [];
		_totales = [];
		_totalesRegistrados = [];
		
		//Iniciar obtención de datos
		var s = "SELECT strftime('%Y', fecha) ano, COUNT(id) registros FROM " + dbTableName + " GROUP BY strftime('%Y', fecha) ORDER BY fecha DESC";
		db.query(s).fail(function(tx, err){
			throw new Error(err.message);
		}).done(function(records){ //Ejecutar algo si es correcto
			if(records.length > 0)
			{
				$scope.agnos = [];
				$scope.fechas = [];
				$scope.registros = [];			
				var r = angular.copy(records);
				for(var i = 0; i < r.length; i++)
				{
					_totales[i] = r[i].registros;
					_totalesRegistrados[i] = [];
					$scope.agnos.push(parseInt(r[i].ano));
				}
				
				$scope.generarFechas(0); //Cargar contenido del primer año
			}
			
			//Mostrar listado de años
			$scope.alertCargando = false;
			p('= Años indezados');
			if(_agnos.length === 0) $scope.$apply();
		});
	};
	
	//Cambiar año activo
	$scope.pestanaAgnoActivo = function(i){
		$scope.agnoActivo = i;
		if(angular.isUndefined($scope.registros[i])) $scope.generarFechas(i);
	};

	//Obtener fechas
	$scope.generarFechas = function(ai){
		$scope.alertCargandoRegistros = true;
		$scope.fechas[ai] = [];
		$scope.fechas_orden[ai] = [];
		var s = "SELECT DISTINCT fecha, strftime('%d', fecha) dia, strftime('%m', fecha) + 0 mes, strftime('%Y', fecha) agno, 0 suma FROM " + dbTableName + " WHERE strftime('%Y', fecha) = '" + $scope.agnos[ai] + "' ORDER BY fecha DESC";
		db.query(s).fail(function(tx, err){
			throw new Error(err.message);
		}).done(function(records){
			var r = angular.copy(records);
			for(var i = 0; i < r.length; i++)
			{
				r[i].agno = parseInt(r[i].agno);
				if(angular.isUndefined($scope.registros[ai])) $scope.registros[ai] = [];
				if(angular.isUndefined($scope.registros[ai][i])) $scope.registros[ai][i] = [];
				$scope.fechas[ai].push(r[i]);
				$scope.fechas_orden[ai].push(r[i].fecha);
				$scope.generarRegistros(r[i].fecha, ai, i);
			}
			
			$scope.fechas_orden[ai].reverse().reverse();
		});
	};

	//Obtener registros
	$scope.generarRegistros = function(f, ai, fi){
		var s = "SELECT * FROM " + dbTableName + " WHERE fecha = '" + f + "' ORDER BY fecha DESC, fecha_registro DESC";
		db.query(s).fail(function(tx, err){
			throw new Error(err.message);
		}).done(function(records){
			//Meter registros a variables
			var r = angular.copy(records);
			for(var i = 0; i < r.length; i++)
			{
				$scope.registros[ai][fi].push(r[i]);
				_totalesRegistrados[ai]++;
			}
			
			//Indezar registros al SCOPE
			if(_totalesRegistrados[ai] == _totales[ai])
			{
				// $scope.registros[ai] = _registros[ai];
				c('= Registros ' + $scope.agnos[ai] + ' indezados al $scope');
				$scope.alertCargandoRegistros = false;
				
				//Asignar TypeAhead
				$scope.typeAheadSet();
				
				//Crear sumatorias
				for(var fn in $scope.registros[ai]) $scope.generarSumatorias(ai, fn);
				$scope.$apply();
			}
		});
	};

	//Crear sumatorias por fecha
	$scope.generarSumatorias = function(ai, fi){
		$scope.fechas[ai][fi].suma = 0;
		for(var i in $scope.registros[ai][fi]) $scope.fechas[ai][fi].suma += $scope.registros[ai][fi][i].precio;
	};
	
	//Eliminaciones: Mostrar/Ocultar botones
	$scope.eliminarActivar = function(){
		$scope.alertEliminando = !$scope.alertEliminando;
	};

	//SYNC
	/*
	Parámetro "background" identifica si es una sincronización de proceso invisible o bajo solicitud
	*/
	var syncIntento;
	var syncIntentos;
	$scope.sync = function(background){
		syncIntento = 0;
		syncIntentos = 0;
	
		if(angular.isUndefined(background)) background = false;
		if(!background) $scope.alertSync = true;
		
		/*
		30 de Marzo
		Los registros nuevos y eliminaciones deben enviarse de manera independiente
		Esto es por el problema de limitación por GET
		PENDIENTE
		*/		
		
		//Obtener datos nuevos
		var syncFecha = $scope._syncFecha;
		try{ if(angular.isUndefined(syncFecha) || syncFecha.length === 0) syncFecha = '0000-00-00 00:00:00'; }catch(e){}
		var s = "SELECT * FROM " + dbTableName + " WHERE fecha_registro > '" + syncFecha + "'";
		db.query(s).fail(function(tx, err){
			if(!background) throw new Error(err.message);
		}).done(function(registros){
			//Obtener eliminaciones
			var s = "SELECT * FROM " + dbDeleteTableName + " WHERE fecha > '" + syncFecha + "'";
			db.query(s).fail(function(tx, err){
				throw new Error(err.message);
			}).done(function(eliminaciones){
				//Enviar al servidor
				try
				{
					var dataAjax = {
						syncFecha: syncFecha,
						eliminaciones: eliminaciones
					};

					/*
					Por método GET no se pueden enviar muchos  registros.
					Se enviarán de dos en dos.
					*/
					syncIntentos = Math.ceil(registros.length / 2);
					for(var i = 0; i < registros.length; i++)
					{
						dataAjax.registros = [];
						dataAjax.registros.push(registros[i]);
						dataAjax.registros.push(registros[i + 1]);
						
						var eliminadoHecho = false; //Indicador para saber si ya se eliminaron del trashcan
						$.ajax({
							url: host + 'app/add',
							contentType: "application/json",
							dataType: 'jsonp',
							data: { data: JSON.stringify(dataAjax), user: uuid },
							eliminaciones: eliminaciones,
							success: function(data){
								syncIntento++;
								
								//Agregar nuevos registros
								var isSync = false;
								if(data.nuevos.length > 0)
								{
									var s = [];
									for(var i in data.nuevos)
									{
										var v = data.nuevos[i];
										s.push("INSERT OR IGNORE INTO " + dbTableName + " VALUES ('" + v.id + "', '" + v.titulo + "', '" + v.volumen + "', '" + v.precio + "', '" + v.fecha + "', '" + v.fecha_registro + "', '" + v.variante + "', '" + v.adquirido + "')");
									}

									//Registrar en la BDD
									db.query(s).fail(function (tx, err) {
										throw new Error(err.message);
									}).done(function () {
										$scope.syncEnd(data.syncFecha, background);
									});
									
									isSync = true;
								}
								
								//Remover las eliminaciones
								if(dataAjax.eliminaciones.length > 0 && !eliminadoHecho)
								{
									var s = [];
									for(var i = 0; i < dataAjax.eliminaciones.length; i++) s.push('DELETE FROM ' + dbDeleteTableName + ' WHERE id = ' + dataAjax.eliminaciones[i].id);
									db.query(s);
									eliminadoHecho = true;
									isSync = true;
								}
								
								if(isSync) $scope.syncEnd(data.syncFecha, background);
							},
							error: function(e){
								if(!background)
									alert('Algo salió mal y no se alcanzó al servidor...');
								else
									c(e);
									c('NO Sync');
							}
						});
						i++;
					}
				} catch(e){		
					c(e);
					if(!background)
						alert('Algo salió mal y no se alcanzó al servidor...');
					else
						c('NO Sync because of error :(');
				}
			});
		});
	};
	
	/*Al finalizar una sincronización*/
	$scope.syncEnd = function(syncFecha, background){
		c(syncIntento+' >= '+syncIntentos)
		if(syncIntento >= syncIntentos)
		{
			$scope.alertSync = false;
			if(!background) $scope.$apply();

			//Actualizar la fecha de Sync
			ls.setItem('syncDate', syncFecha);
			$scope.syncFechaSet();
			
			c('!Sync Zalabinc¡');
		}
	}
	
	//Obterner fecha actual
	$scope.getFechaActual = function(){ return $filter('date')(new Date(), 'yyyy-MM-dd HH:mm:ss'); };
	
	//OPCIONES
	//Guardar opciones
	$scope.actualizarOpciones = function(){
		/*var nuevoDbName = $.trim($('#opcionDbName').val());
		var nuevoDbTableName = $.trim($('#opcionDbTableName').val());
		var nuevoDbDeleteTableName = $.trim($('#opcionDbDeleteTableName').val());
		var nuevoDbDeleteTableName = $.trim($('#opcionDbDeleteTableName').val());
		var nuevoSyncDate = $.trim($('#opcionUltimaActualizacionFecha').val()) + ' ' + $.trim($('#opcionUltimaActualizacionHora').val()) + ':00';
		
		//Crear / eliminar bases de datos
		var s = [];
		var callback = '';
		
		if($scope._dbName != nuevoDbName) //Base de datos nueva
		{
			s.push('DROP TABLE IF EXISTS "' + nuevoDbTableName + '"');
			s.push('DROP TABLE IF EXISTS "' + nuevoDbDeleteTableName + '"');
			callback = 'var db = WebSQL("' + nuevoDbName + '");';
		}
		else if($scope._dbTableName != nuevoDbTableName || $scope._dbDeleteTableName != nuevoDbDeleteTableName)
		{
			if($scope._dbTableName != nuevoDbTableName) //Tabla de registros nueva
			{
				s.push('DROP TABLE IF EXISTS "' + $scope._dbName + '"');
				s.push('DROP TABLE IF EXISTS "' + nuevoDbTableName + '"');
				s.push('CREATE TABLE "' + nuevoDbTableName + '" ( "id"  TEXT(255) NOT NULL, "titulo"  TEXT(255), "volumen"  INTEGER(11), "precio"  REAL(10,2), "fecha"  TEXT, "fecha_registro"  TEXT, "adquirido"  INTEGER(1), PRIMARY KEY ("id") )');
				s.push('DROP INDEX IF EXISTS "k"');
				s.push('CREATE UNIQUE INDEX "k" ON "' + nuevoDbTableName + '" ("titulo" ASC, "volumen" ASC)');
			}
			
			if($scope._dbTableName != nuevoDbTableName) //Tabla de eliminaciones nueva
			{
				s.push('DROP TABLE IF EXISTS "' + $scope._dbDeleteTableName + '"');
				s.push('DROP TABLE IF EXISTS "' + nuevoDbDeleteTableName + '"');
				s.push('CREATE TABLE "' + nuevoDbDeleteTableName + '" ( "id"  INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, "fecha"  TEXT )');
			}
		}
		
		if(s.length > 0)
		{
			if(confirm('Todos los registros actuales serán eliminados.\n¿Deseas continuar?'))
			{
				db.query(s).fail(function(tx, err){
					alert('Ha ocurrido un error y la base de datos no pudo ser creada.');
					for(var i in s) alert(s[i]);
					throw new Error(err.message);
				}).done(function(){
					ls.setItem('dbTableName', nuevoDbTableName);
					ls.setItem('dbDeleteTableName', nuevoDbDeleteTableName);
					ls.setItem('host', $.trim($('#opcionHost').val()));
					ls.setItem('syncDate', $scope._syncFecha = $.trim($('#opcionUltimaActualizacionFecha').val()) + ' ' + $.trim($('#opcionUltimaActualizacionHora').val()) + ':00');
					
					$scope.dbGetVariables();
					eval(callback);
					getDbVariables();
					dbCrear($scope.dbInitiate());
					window.alert('Las opciones han sido guardadas.');
				});
			}
		}
		else alert('No se identificaron cambios en la configuración.');*/
		
		ls.setItem('host', $.trim($('#opcionHost').val()));
		ls.setItem('syncDate', $scope._syncFecha = $.trim($('#opcionUltimaActualizacionFecha').val()) + ' ' + $.trim($('#opcionUltimaActualizacionHora').val()) + ':00');
		window.alert('Las opciones han sido guardadas.');
	};
	
	//Dumpear SQL
	$scope.dumped = false;
	$scope.dump = function(){
		var s = "SELECT * FROM " + $scope._dbTableName;
		db.query(s).fail(function (tx, err) {
			throw new Error(err.message);
		}).done(function (results) {
			if(results.length > 0)
			{
				var _exportSql = [];
				for(var i in results)
				{
					var row = results[i];
					if($(row).size() > 0)
					{
						var _fields = [];
						var _values = [];
						for(var col in row)
						{
							_fields.push(col);
							_values.push('"' + row[col] + '"');
						}
						_exportSql.push("INSERT INTO " + $scope._dbTableName + "(" + _fields.join(",") + ") VALUES (" + _values.join(",") + ")");
					}
				}
				$scope.dumped = true;
				$('#dumpText').val(_exportSql.join(';\n'));
				$scope.$apply();
			} else alert('No hay registros actualmente.');
		});
	};

	//Opciones del TypeAhead
	//Indexador de títulos
	$scope.typeAheadGenerateOptions = function(){
		$scope.typeOptions = [];
		var s = "SELECT DISTINCT titulo FROM " + dbTableName + ' ORDER BY titulo';
		db.query(s).fail(function(tx, err){
			throw new Error(err.message);
		}).done(function(r){ //Ejecutar algo si es correcto
			for(var i in r) if(r[i] !== null) if($scope.typeOptions.indexOf(r[i].titulo) == -1) $scope.typeOptions.push(r[i].titulo);
		});
	};
	
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
		}).blur(function(){ $(this).val($.trim($(this).val().toUpperCase())); });
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

	//Info de ejemplo
	$scope.ejemplo = function(){
		var s = [
			'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("28DIASDESPUES12","28 DIAS DESPUES","12","30","2014-04-10","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("28DIASDESPUES10","28 DIAS DESPUES","10","30","2014-02-14","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("28DIASDESPUES6","28 DIAS DESPUES","6","30","2013-09-11","2015-01-08 09:32:42","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("28DIASDESPUES8","28 DIAS DESPUES","8","30","2014-02-25","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("28DIASDESPUES11","28 DIS DESPUES","11","30","2014-03-15","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("28DIASDESPUES13","28 DIS DESPUES","13","30","2014-06-11","2015-01-08 09:32:47","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("28DIASDESPUES14","28 DIS DESPUES","14","30","2014-07-02","2015-01-08 09:32:47","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("28DIASDESPUES15","28 DIS DESPUES","15","30","2014-07-22","2015-01-08 09:32:48","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("28DIASDESPUES7","28 DIS DESPUES","7","30","2013-10-08","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("3DBIZARRO1","3D: BIZARRO","1","159","2014-11-11","2015-01-08 09:32:52","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("3DJOKER1","3D: JOKER","1","159","2014-11-11","2015-01-08 09:32:52","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AMAZING SPIDERMAN5","AMAZING SPIDERMAN","5","33","2015-01-27","2015-01-29 13:22:55","0")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AMAZINGSPIDERMAN1","AMAZING SPIDERMAN","1","49","2014-09-23","2015-01-08 09:32:50","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AMAZINGSPIDERMAN2","AMAZING SPIDERMAN","2","33","2014-10-29","2015-01-08 09:32:51","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AMAZINGSPIDERMAN3","AMAZING SPIDERMAN","3","35","2014-11-25","2015-01-08 09:32:53","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AMAZINGSPIDERMAN4","AMAZING SPIDERMAN","4","35","2014-12-29","2015-01-08 09:32:54","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AMAZINGXMEN1","AMAZING X-MEN","1","27","2014-05-07","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AMAZINGXMEN2","AMAZING X-MEN","2","24","2014-06-10","2015-01-08 09:32:47","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AMAZINGXMEN3","AMAZING X-MEN","3","24","2014-07-08","2015-01-08 09:32:48","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AMAZINGXMEN4","AMAZING X-MEN","4","24","2014-08-05","2015-01-08 09:32:49","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AMAZINGXMEN6","AMAZING X-MEN","6","24","2014-10-09","2015-01-08 09:32:51","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AMAZINGXMEN7","AMAZING X-MEN","7","24","2014-11-11","2015-01-08 09:32:52","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AMAZINGXMEN8","AMAZING X-MEN","8","26","2014-12-09","2015-01-08 09:32:53","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AMAZINGXMEN9","AMAZING X-MEN","9","26","2015-01-06","2015-01-13 12:22:12","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AQUAMAN14","AQUAMAN","14","30","2013-09-17","2015-01-08 09:32:42","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AQUAMAN15","AQUAMAN","15","23","2013-10-22","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AQUAMAN16","AQUAMAN","16","23","2013-11-19","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AVENGERS1","AVENGERS","1","37","2014-04-08","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AVENGERS11","AVENGERS","11","33","2014-03-11","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AVENGERS13","AVENGERS","13","33","2014-05-07","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AVENGERS14","AVENGERS","14","33","2014-06-10","2015-01-08 09:32:47","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AVENGERS15","AVENGERS","15","37","2014-07-15","2015-01-08 09:32:48","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AVENGERS16","AVENGERS","16","33","2014-08-05","2015-01-08 09:32:49","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AVENGERS17","AVENGERS","17","33","2014-09-16","2015-01-08 09:32:50","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AVENGERS20","AVENGERS","20","35","2014-12-09","2015-01-08 09:32:53","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AVENGERS21","AVENGERS","21","35","2015-01-06","2015-01-13 12:22:12","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AVENGERS5","AVENGERS","5","32","2013-09-11","2015-01-08 09:32:42","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AVENGERS6","AVENGERS","6","32","2013-10-08","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AVENGERS7","AVENGERS","7","32","2013-11-05","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AVENGERS8","AVENGERS","8","32","2013-12-10","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AVENGERS9","AVENGERS","9","33","2014-01-06","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("AVENGERSWARTIMEENDLESS1","AVENGERS: WAR TIME ENDLESS","1","99","2013-10-01","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("BATMAN15","BATMAN","15","36","2013-10-01","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("BATMAN16","BATMAN","16","36","2013-11-05","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("BATMAN17","BATMAN","17","36","2013-12-10","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("BATMAN18","BATMAN","18","37","2013-12-31","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("BATMAN19","BATMAN","19","37","2014-02-04","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("BATMAN20","BATMAN","20","37","2014-03-11","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("BATMAN21","BATMAN","21","49","2014-04-08","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("BATMAN22","BATMAN","22","37","2014-05-07","2015-01-08 09:32:46","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("BATMAN23","BATMAN","23","37","2014-06-03","2015-01-08 09:32:46","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("BATMAN24","BATMAN","24","49","2014-07-02","2015-01-08 09:32:47","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("BATMAN25","BATMAN","25","37","2014-08-05","2015-01-08 09:32:48","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("BATMAN28","BATMAN","28","39","2014-11-11","2015-01-08 09:32:52","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("BATMAN29","BATMAN","29","41","2014-12-02","2015-01-08 09:32:53","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("BATMAN30","BATMAN","30","81","2015-01-06","2015-01-13 12:21:59","0")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("BATMANELREGRESODEBRUCEWAYNE1","BATMAN EL REGRESO DE BRUCE WAYNE","1","129","2014-09-23","2015-01-08 09:32:50","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("BATMANHUSHALDESCUBIERTO1","BATMAN HUSH AL DESCUBIERTO","1","299","2014-11-25","2015-01-08 09:32:53","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("BATMANINCORPORATED1","BATMAN INCORPORATED","1","249","2014-03-18","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("BATMANSUPERMAN1","BATMAN-SUPERMAN","1","27","2014-01-14","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("BATMANSUPERMAN2","BATMAN-SUPERMAN","2","24","2014-02-10","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("BEFOREWATCHMEN2","BEFORE WATCHMEN","2","239","2013-09-24","2015-01-08 09:32:42","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("BEFOREWATCHMEN3","BEFORE WATCHMEN","3","299","2013-12-17","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("CHEW2","CHEW","2","30","2014-02-04","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("CHEW3","CHEW","3","30","2014-03-18","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("CHEW4","CHEW","4","30","2014-04-24","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("CHEW5","CHEW","5","30","2014-06-18","2015-01-08 09:32:47","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("CHEW6","CHEW","6","30","2014-08-27","2015-01-08 09:32:49","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("CHEW7","CHEW","7","30","2014-08-27","2015-01-08 09:32:49","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("CHEW8","CHEW","8","30","2014-10-29","2015-01-08 09:32:51","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("CHEW9","CHEW","9","30","2014-10-29","2015-01-08 09:32:51","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("CONAN3","CONAN","3","30","2014-02-25","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("CONAN4","CONAN","4","30","2013-12-05","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("CONAN5","CONAN","5","30","2014-02-18","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("CONAN6","CONAN","6","30","2014-07-22","2015-01-08 09:32:48","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("CONAN7","CONAN","7","30","2014-08-27","2015-01-08 09:32:50","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("CONAN8","CONAN","8","30","2014-08-27","2015-01-08 09:32:50","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("DANGERGIRL2","DANGER GIRL","2","30","2013-12-05","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("DANGERGIRL3","DANGER GIRL","3","30","2014-04-01","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("DANGERGIRL5","DANGER GIRL","5","30","2014-07-21","2015-01-08 09:32:48","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("DANGERGIRL6","DANGER GIRL","6","30","2014-08-27","2015-01-08 09:32:50","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("DANGERGIRL7","DANGER GIRL","7","30","2014-11-25","2015-01-08 09:32:53","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("DANGERGIRL8","DANGER GIRL","8","30","2014-11-25","2015-01-08 09:32:53","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("DCDEFINITIVEEDITIONTRINITYWAR1","DC DEFINITIVE EDITION: TRINITY WAR","1","129","2014-06-16","2015-01-08 09:32:47","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("FATALATRACTIONS1","FATAL ATRACTIONS","1","46","2013-10-15","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("FATALATRACTIONS3","FATAL ATRACTIONS","3","49","2013-10-31","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("FATALATRACTIONS4","FATAL ATRACTIONS","4","46","2013-11-05","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("FATALATRACTIONS5","FATAL ATRACTIONS","5","46","2013-11-19","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("FATALATRACTIONS6","FATAL ATRACTIONS","6","46","2013-11-19","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("FOREVEREVIL1","FOREVER EVIL","1","33","2014-06-18","2015-01-08 09:32:47","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("FOREVEREVIL2","FOREVER EVIL","2","27","2014-07-15","2015-01-08 09:32:48","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("FOREVEREVIL3","FOREVER EVIL","3","27","2014-08-13","2015-01-08 09:32:49","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("FOREVEREVIL4","FOREVER EVIL","4","27","2014-09-16","2015-01-08 09:32:50","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("FOREVEREVIL5","FOREVER EVIL","5","27","2014-10-15","2015-01-08 09:32:51","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("FOREVEREVIL6","FOREVER EVIL","6","27","2014-11-11","2015-01-08 09:32:52","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("FOREVEREVIL7","FOREVER EVIL","7","35","2014-12-23","2015-01-08 09:32:53","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("FOREVEREVIL8","FOREVER EVIL","8","27","2014-12-29","2015-01-08 09:32:54","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GREEN LANTERN25","GREEN LANTERN","25","35","2015-01-20","2015-01-29 13:22:55","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GREENLANTERN13","GREEN LANTERN","13","30","2013-09-17","2015-01-08 09:32:42","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GREENLANTERN14","GREEN LANTERN","14","30","2013-10-22","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GREENLANTERN15","GREEN LANTERN","15","30","2013-11-19","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GREENLANTERN16","GREEN LANTERN","16","30","2013-12-17","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GREENLANTERN17","GREEN LANTERN","17","33","2014-01-23","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GREENLANTERN18","GREEN LANTERN","18","33","2014-02-18","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GREENLANTERN19","GREEN LANTERN","19","33","2014-03-18","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GREENLANTERN20","GREEN LANTERN","20","37","2014-04-23","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GREENLANTERN21","GREEN LANTERN","21","33","2014-05-21","2015-01-08 09:32:46","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GREENLANTERN22","GREEN LANTERN","22","33","2014-06-18","2015-01-08 09:32:47","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GREENLANTERN23","GREEN LANTERN","23","59","2014-07-22","2015-01-08 09:32:48","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GREENLANTERN24","GREEN LANTERN","24","33","2014-08-19","2015-01-08 09:32:49","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GREENLANTERN26","GREEN LANTERN","26","33","2014-10-21","2015-01-08 09:32:51","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GREENLANTERN27","GREEN LANTERN","27","24","2014-11-19","2015-01-08 09:32:52","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GREENLANTERNREBIRTH1","GREEN LANTERN: REBIRTH","1","99","2014-09-16","2015-01-08 09:32:50","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GUARDIANESDELAGALAXIA011","GUARDIANES DE LA GALAXIA 0.1","1","27","2014-07-15","2015-01-08 09:32:48","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GUARDIANESDELAGALAXIA10","GUARDIANES DE LA GALAXIA","10","24","2014-02-10","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GUARDIANESDELAGALAXIA11","GUARDIANES DE LA GALAXIA","11","24","2014-03-18","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GUARDIANESDELAGALAXIA12","GUARDIANES DE LA GALAXIA","12","24","2014-08-13","2015-01-08 09:32:49","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GUARDIANESDELAGALAXIA13","GUARDIANES DE LA GALAXIA","13","24","2014-10-15","2015-01-08 09:32:51","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GUARDIANESDELAGALAXIA15","GUARDIANES DE LA GALAXIA","15","26","2014-12-09","2015-01-08 09:32:53","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GUARDIANESDELAGALAXIA16","GUARDIANES DE LA GALAXIA","16","26","2015-01-13","2015-01-13 12:22:12","0")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GUARDIANESDELAGALAXIA5","GUARDIANES DE LA GALAXIA","5","23","2013-09-11","2015-01-08 09:32:42","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GUARDIANESDELAGALAXIA6","GUARDIANES DE LA GALAXIA","6","23","2013-10-08","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GUARDIANESDELAGALAXIA7","GUARDIANES DE LA GALAXIA","7","23","2013-11-12","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GUARDIANESDELAGALAXIA8","GUARDIANES DE LA GALAXIA","8","23","2013-12-10","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GUARDIANESDELAGALAXIA9","GUARDIANES DE LA GALAXIA","9","24","2014-01-14","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("GUARDIANSOFTHEGALAXY14","GUARDIANES DE LA GALAXIA","14","33","2014-11-11","2015-01-08 09:32:52","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HALOINITIATION1","HALO INITIATION","1","30","2014-03-15","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HALOINITIATION2","HALO INITIATION","2","30","2014-04-24","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HALOINITIATION3","HALO INITIATION","3","30","2014-06-11","2015-01-08 09:32:47","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HELLBOY2","HELLBOY","2","30","2013-10-22","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HELLBOY3","HELLBOY","3","30","2013-11-12","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HELLRAISER10","HELLRAISER","10","25","2014-02-14","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HELLRAISER11","HELLRAISER","11","30","2014-03-15","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HELLRAISER12","HELLRAISER","12","30","2014-04-10","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HELLRAISER6","HELLRAISER","6","30","2013-09-11","2015-01-08 09:32:42","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HELLRAISER7","HELLRAISER","7","30","2013-10-08","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HELLRAISER8","HELLRAISER","8","30","2014-02-25","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HELLRAISER9","HELLRAISER","9","30","2014-01-14","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HULK1","HULK","1","26","2015-01-13","2015-01-13 12:22:12","0")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HULK10","HULK","10","24","2014-02-10","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HULK12","HULK","12","24","2014-04-15","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HULK13","HULK","13","24","2014-05-13","2015-01-08 09:32:46","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HULK14","HULK","14","24","2014-06-10","2015-01-08 09:32:46","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HULK15","HULK","15","24","2014-07-15","2015-01-08 09:32:48","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HULK16","HULK","16","24","2014-08-13","2015-01-08 09:32:49","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HULK18","HULK","18","24","2014-10-15","2015-01-08 09:32:51","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HULK20","HULK","20","26","2014-12-23","2015-01-08 09:32:53","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HULK6","HULK","6","23","2013-10-15","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HULK7","HULK","7","23","2013-11-12","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HULK8","HULK","8","23","2013-12-10","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HULK9","HULK","9","24","2014-01-14","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HULKVSIRONMAN1","HULK VS IRON MAN","1","24","2014-08-27","2015-01-08 09:32:50","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HULKVSIRONMAN2","HULK VS IRON MAN","2","24","2014-09-16","2015-01-08 09:32:50","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HULKVSIRONMAN3","HULK VS IRON MAN","3","24","2014-10-09","2015-01-08 09:32:51","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("HULKVSIRONMAN4","HULK VS IRON MAN","4","24","2014-10-29","2015-01-08 09:32:51","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INCORRUPTIBLE3","INCORRUPTIBLE","3","30","2013-10-22","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INCORRUPTIBLE4","INCORRUPTIBLE","4","30","2013-12-05","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INCORRUPTIBLE5","INCORRUPTIBLE","5","30","2014-02-25","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INCORRUPTIBLE6","INCORRUPTIBLE","6","30","2014-05-21","2015-01-08 09:32:46","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INCORRUPTIBLE7","INCORRUPTIBLE","7","30","2014-07-21","2015-01-08 09:32:48","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INCREDIBLEHULK11","INCREDIBLE HULK","11","24","2014-03-11","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INDESTRUCTIBLEHULK17","INDESTRUCTIBLE HULK","17","24","2014-09-16","2015-01-08 09:32:50","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INDESTRUCTIBLEHULK19","INDESTRUCTIBLE HULK","19","24","2014-11-11","2015-01-08 09:32:52","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INDESTRUCTIBLEHULK5","INDESTRUCTIBLE HULK","5","23","2013-09-11","2015-01-08 09:32:42","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INFINITY1","INFINITY","1","39","2014-01-06","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INFINITY2","INFINITY","2","24","2014-01-28","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INFINITY3","INFINITY","3","27","2014-02-18","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INFINITY4","INFINITY","4","27","2014-03-04","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INFINITY5","INFINITY","5","27","2014-03-11","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INFINITY6","INFINITY","6","39","2014-03-18","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INFINITYAVENGERSASSEMBLE1","INFINITY: AVENGERS ASSEMBLE","1","24","2014-01-14","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INFINITYAVENGERSASSEMBLE2","INFINITY: AVENGERS ASSEMBLE","2","24","2014-02-04","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INFINITYAVENGERSASSEMBLE3","INFINITY: AVENGERS ASSEMBLE","3","24","2014-02-25","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INFINITYCAPTAINMARVEL1","INFINITY: CAPTAIN MARVEL","1","24","2014-01-23","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INFINITYCAPTAINMARVEL2","INFINITY: CAPTAIN MARVEL","2","24","2014-02-10","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INHUMANITY2","INHUMANITY","2","24","2014-04-15","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INHUMANITYAVENGERSASSEMBLE1","INHUMANITY: AVENGERS ASSEMBLE","1","24","2014-04-01","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INJUSTICE10","INJUSTICE","10","27","2014-03-11","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INJUSTICE11","INJUSTICE","11","27","2014-04-15","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INJUSTICE12","INJUSTICE","12","27","2014-05-13","2015-01-08 09:32:46","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INJUSTICE4","INJUSTICE","4","26","2013-09-17","2015-01-08 09:32:42","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INJUSTICE5","INJUSTICE","5","26","2013-10-15","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INJUSTICE6","INJUSTICE","6","26","2013-11-12","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INJUSTICE7","INJUSTICE","7","0","2013-12-17","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INJUSTICE8","INJUSTICE","8","27","2014-01-14","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INJUSTICE9","INJUSTICE","9","27","2014-02-10","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INVINCIBLE1","INVINCIBLE","1","30","2013-09-11","2015-01-08 09:32:42","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INVINCIBLE4","INVINCIBLE","4","130","2014-05-21","2015-01-08 09:32:46","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("INVINCIBLE5","INVINCIBLE","5","130","2014-06-09","2015-01-08 09:32:46","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("IRON MAN22","IRON MAN","22","26","2015-01-27","2015-01-29 13:22:55","0")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("IRONMAN10","IRON MAN","10","24","2014-01-28","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("IRONMAN11","IRON MAN","11","24","2014-02-25","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("IRONMAN12","IRON MAN","12","24","2014-04-01","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("IRONMAN13","IRON MAN","13","24","2014-04-29","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("IRONMAN14","IRON MAN","14","24","2014-05-27","2015-01-08 09:32:46","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("IRONMAN15","IRON MAN","15","24","2014-07-29","2015-01-08 09:32:48","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("IRONMAN17","IRON MAN","17","37","2014-09-23","2015-01-08 09:32:50","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("IRONMAN18","IRON MAN","18","24","2014-10-29","2015-01-08 09:32:52","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("IRONMAN19","IRON MAN","19","26","2014-11-25","2015-01-08 09:32:53","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("IRONMAN20","IRON MAN","20","33","2014-08-27","2015-01-08 09:32:50","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("IRONMAN6","IRON MAN","6","23","2013-09-24","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("IRONMAN7","IRON MAN","7","23","2013-10-31","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("IRONMAN8","IRON MAN","8","23","2013-11-26","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("IRONMAN9","IRON MAN","9","24","2013-12-31","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("IRREDEEMABLE10","IRREDEEMABLE","10","30","2013-10-31","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("IRREDEEMABLE12","IRREDEEMABLE","12","30","2014-02-25","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("IRREDEEMABLE13","IRREDEEMABLE","13","30","2014-06-16","2015-01-08 09:32:47","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("IRREDEEMABLE14","IRREDEEMABLE","14","30","2014-08-27","2015-01-08 09:32:50","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("IRREDEEMABLE15","IRREDEEMABLE","15","30","2014-08-27","2015-01-08 09:32:50","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("IRREDEEMABLE9","IRREDEEMABLE","9","30","2013-10-22","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("IRREDEEMABLESPECIAL1","IRREDEEMABLE SPECIAL","1","30","2014-05-21","2015-01-08 09:32:46","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("IRREDIMIBLE11","IRREDIMIBLE","11","30","2013-12-24","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("JL14","JL","14","30","2013-09-11","2015-01-08 09:32:42","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("JL15","JL","15","30","2013-10-15","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("JL16","JL","16","26","2013-11-12","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("JL17","JL","17","26","2013-12-17","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("JL18","JL","18","27","2014-01-14","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("JL19","JL","19","27","2014-02-10","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("JL20","JL","20","27","2014-03-11","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("JL21","JL","21","33","2014-04-15","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("JL22","JL","22","33","2014-05-13","2015-01-08 09:32:46","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("JL23","JL","23","33","2014-06-10","2015-01-08 09:32:47","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("JL24","JL","24","27","2014-07-15","2015-01-08 09:32:48","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("JL25","JL","25","27","2014-08-13","2015-01-08 09:32:49","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("JL27","JL","27","27","2014-10-15","2015-01-08 09:32:51","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("JL29","JL","29","29","2014-12-23","2015-01-08 09:32:53","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("JL30","JL","30","29","2015-01-13","2015-01-13 12:22:12","0")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("JLA1","JLA","1","39","2014-01-14","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("JLA10","JLA","10","27","2014-10-15","2015-01-08 09:32:51","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("JLA11","JLA","11","27","2014-11-11","2015-01-08 09:32:52","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("JLA13","JLA","13","29","2015-01-13","2015-01-13 12:22:12","0")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("JLA5","JLA","5","39","2014-05-13","2015-01-08 09:32:46","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("JLA6","JLA","6","39","2014-06-18","2015-01-08 09:32:47","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("JLA8","JLA","8","27","2014-08-13","2015-01-08 09:32:49","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("JLA9","JLA","9","27","2014-09-16","2015-01-08 09:32:50","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("JLAEARTH21","JLA EARTH 2","1","129","2014-03-25","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("JUSTICELEAGUE28","JUSTICE LEAGUE","28","27","2014-11-11","2015-01-08 09:32:52","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("KICKASS1","KICK ASS","1","39","2013-11-19","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("KICKASS2","KICK ASS","2","39","2014-01-23","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("LOCKE&KEY1","LOCKE & KEY","1","30","2013-11-05","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("LOMEJORDEDCBATMANTHEDARKNIGHTRETURNS1","LO MEJOR DE DC: BATMAN THE DARK NIGHT RETURNS","1","99","2014-02-25","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("MARVELSDELUXE1","MARVELS DELUXE","1","299","2013-09-24","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("MONSTERFAMILYBUSINESS1","MONSTER: FAMILY BUSINESS","1","129","2014-04-01","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("NEWAVENGERS10","NEW AVENGERS","10","27","2014-02-25","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("NEWAVENGERS11","NEW AVENGERS","11","24","2014-03-11","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("NEWAVENGERS13","NEW AVENGERS","13","24","2014-05-13","2015-01-08 09:32:46","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("NEWAVENGERS14","NEW AVENGERS","14","24","2014-06-10","2015-01-08 09:32:47","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("NEWAVENGERS15","NEW AVENGERS","15","24","2014-07-08","2015-01-08 09:32:47","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("NEWAVENGERS16","NEW AVENGERS","16","24","2014-08-13","2015-01-08 09:32:49","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("NEWAVENGERS17","NEW AVENGERS","17","24","2014-09-16","2015-01-08 09:32:50","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("NEWAVENGERS18","NEW AVENGERS","18","24","2014-10-15","2015-01-08 09:32:51","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("NEWAVENGERS19","NEW AVENGERS","19","24","2014-11-11","2015-01-08 09:32:52","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("NEWAVENGERS20","NEW AVENGERS","20","26","2014-12-23","2015-01-08 09:32:53","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("NEWAVENGERS21","NEW AVENGERS","21","26","2015-01-06","2015-01-13 12:22:12","0")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("NEWAVENGERS5","NEW AVENGERS","5","23","2013-09-11","2015-01-08 09:32:42","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("NEWAVENGERS6","NEW AVENGERS","6","23","2013-10-08","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("NEWAVENGERS8","NEW AVENGERS","8","23","2013-12-10","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("NEWAVENGERS9","NEW AVENGERS","9","23","2014-01-23","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("OMNIBUSBATALLADELATOMO1","OMNIBUS: BATALLA DEL ATOMO","1","249","2014-04-01","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("ORIGINALSIN0","ORIGINAL SIN","0","33","2014-07-15","2015-01-08 09:32:48","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("ORIGINALSIN1","ORIGINAL SIN","1","27","2014-07-15","2015-01-08 09:32:48","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("ORIGINALSIN4","ORIGINAL SIN","4","24","2014-08-19","2015-01-08 09:32:49","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("OriginalSin5","ORIGINAL SIN","5","24","2014-09-16","2015-01-08 09:32:50","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("ORIGINALSIN7","ORIGINAL SIN","7","24","2014-10-21","2015-01-08 09:32:51","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("ORIGINALSIN8","ORIGINAL SIN","8","33","2014-10-29","2015-01-08 09:32:51","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("ORIGINALSIN9","ORIGINAL SIN","9","24","2014-11-19","2015-01-08 09:32:52","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("ORIGINALSINDEADPOOL2","ORIGINAL SIN DEADPOOL","2","24","2014-08-13","2015-01-08 09:32:49","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("ORIGINALSINDEADPOOL4","ORIGINAL SIN DEADPOOL","4","24","2014-09-23","2015-01-08 09:32:50","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("ORIGINALSINDEADPOOL5","ORIGINAL SIN DEADPOOL","5","24","2014-11-11","2015-01-08 09:32:52","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("ORIGINALSINTHORYLOKI4","ORIGINAL SIN THOR & LOKI","4","26","2014-12-02","2015-01-08 09:32:53","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("ORIGINALSINTIEINDEADPOOL1","ORIGINAL SIN DEADPOOL","1","24","2014-07-29","2015-01-08 09:32:48","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("PECADOORIGINAL2","ORIGINAL SIN","2","24","2014-07-22","2015-01-08 09:32:48","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("PECADOORIGINAL3","ORIGINAL SIN","3","24","2014-08-05","2015-01-08 09:32:49","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SAGADELCLON1","SAGA DEL CLON","1","23","2013-12-05","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SAGADELCLON2","SAGA DEL CLON","2","23","2013-12-05","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SAGADELCLON3","SAGA DEL CLON","3","23","2013-12-10","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SAGADELCLON4","SAGA DEL CLON","4","23","2013-12-24","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SAGADELCLON5","SAGA DEL CLON","5","23","2013-12-31","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SPIDER VERSE1","SPIDER VERSE","1","26","2015-01-27","2015-01-29 13:22:55","0")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SPIDERVERSE  SUPERIOR SPIDERMAN1","SPIDERVERSE: SUPERIOR SPIDERMAN","1","29","2015-01-20","2015-01-28 16:02:23","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("STARTREK1","STAR TREK","1","30","2013-11-05","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("STARTREK2","STAR TREK","2","30","2013-12-10","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("STARTREK3","STAR TREK","3","30","2014-05-21","2015-01-08 09:32:46","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("STARTREK4","STAR TREK","4","30","2014-07-21","2015-01-08 09:32:48","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("STARTREK5","STAR TREK","5","30","2014-08-27","2015-01-08 09:32:49","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("STARTREK6","STAR TREK","6","30","2014-08-27","2015-01-08 09:32:49","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("STARTREK7","STAR TREK","7","30","2014-08-27","2015-01-08 09:32:49","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("STARWARSTHELIGHTSIDE1","STAR WARS THE LIGHT SIDE","1","39","2014-08-27","2015-01-08 09:32:49","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("STARWARSTHELIGHTSIDE2","STAR WARS THE LIGHT SIDE","2","32","2014-09-16","2015-01-08 09:32:50","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("STARWARSTHELIGHTSIDE3","STAR WARS THE LIGHT SIDE","3","32","2014-11-25","2015-01-08 09:32:53","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("STARWARSTHELIGHTSIDE4","STAR WARS THE LIGHT SIDE","4","32","2014-11-25","2015-01-08 09:32:53","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("STARWARSTHELIGHTSIDE5","STAR WARS THE LIGHT SIDE","5","32","2014-12-23","2015-01-08 09:32:53","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SUPERIORSPIDERMAN10","SUPERIOR SPIDERMAN","10","33","2014-02-25","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SUPERIORSPIDERMAN11","SUPERIOR SPIDERMAN","11","33","2014-03-25","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SUPERIORSPIDERMAN12","SUPERIOR SPIDERMAN","12","33","2014-04-29","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SUPERIORSPIDERMAN13","SUPERIOR SPIDERMAN","13","33","2014-05-27","2015-01-08 09:32:46","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SUPERIORSPIDERMAN14","SUPERIOR SPIDERMAN","14","37","2014-07-08","2015-01-08 09:32:47","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SUPERIORSPIDERMAN15","SUPERIOR SPIDERMAN","15","45","2014-07-29","2015-01-08 09:32:48","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SUPERIORSPIDERMAN5","SUPERIOR SPIDERMAN","5","32","2013-09-24","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SUPERIORSPIDERMAN6","SUPERIOR SPIDERMAN","6","32","2013-10-31","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SUPERIORSPIDERMAN7","SUPERIOR SPIDERMAN","7","32","2013-11-26","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SUPERIORSPIDERMAN8","SUPERIOR SPIDERMAN","8","33","2013-12-31","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SUPERIORSPIDERMAN9","SUPERIOR SPIDERMAN","9","33","2014-01-28","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SUPERMAN15","SUPERMAN","15","36","2013-10-01","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SUPERMAN16","SUPERMAN","16","36","2013-11-05","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SUPERMAN17","SUPERMAN","17","36","2013-12-05","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SUPERMAN18","SUPERMAN","18","37","2013-12-31","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SUPERMAN19","SUPERMAN","19","37","2014-02-04","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SUPERMAN20","SUPERMAN","20","37","2014-03-04","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SUPERMAN21","SUPERMAN","21","41","2015-01-06","2015-01-13 12:21:59","0")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SUPERMANUNCHAINED1","SUPERMAN UNCHAINED","1","45","2014-04-08","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SUPERMANUNCHAINED2","SUPERMAN UNCHAINED","2","37","2014-05-07","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SUPERMANUNCHAINED3","SUPERMAN UNCHAINED","3","37","2014-06-03","2015-01-08 09:32:46","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SUPERMANUNCHAINED4","SUPERMAN UNCHAINED","4","39","2014-07-08","2015-01-08 09:32:47","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SUPERMANUNCHAINED5","SUPERMAN UNCHAINED","5","39","2014-08-05","2015-01-08 09:32:48","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SUPERMANUNCHAINED8","SUPERMAN UNCHAINED","8","39","2014-10-29","2015-01-08 09:32:51","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SUPERMANUNCHAINED9","SUPERMAN UNCHAINED","9","41","2014-12-02","2015-01-08 09:32:53","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("SWAMPTHINGVOL11","SWAMP THING VOL.1","1","199","2014-12-23","2015-01-08 09:32:53","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THANOSRISING5","THANOS RISING","5","23","2013-09-11","2015-01-08 09:32:42","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THEAVENGERS10","AVENGERS","10","33","2014-02-10","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THEAVENGERS18","AVENGERS","18","33","2014-10-09","2015-01-08 09:32:51","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THEAVENGERS19","AVENGERS","19","33","2014-11-11","2015-01-08 09:32:52","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THEDARKNESS1","THE DARKNESS","1","39","2013-11-07","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THEFLASHREBIRTH1","THE FLASH REBIRTH","1","99","2014-11-19","2015-01-08 09:32:52","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THESTARWARS2","THE STAR WARS","2","72","2013-10-22","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THETRAVELLER10","THE TRAVELLER","10","30","2014-05-21","2015-01-08 09:32:46","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THETRAVELLER12","THE TRAVELLER","12","30","2014-07-22","2015-01-08 09:32:48","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THETRAVELLER8","THE TRAVELLER","8","30","2014-02-25","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THETRAVELLER9","THE TRAVELLER","9","30","2014-07-22","2015-01-08 09:32:48","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THEWALKINGDEAD10","THE WALKING DEAD","10","150","2014-01-23","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THEWALKINGDEAD8","THE WALKING DEAD","8","150","2013-10-08","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THOR&LOKI1","ORIGINAL SIN THOR & LOKI","1","24","2014-10-15","2015-01-08 09:32:51","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THOR&LOKI2","ORIGINAL SIN THOR & LOKI","2","24","2014-11-19","2015-01-08 09:32:52","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THOR&LOKI3","ORIGINAL SIN THOR & LOKI","3","24","2014-11-25","2015-01-08 09:32:53","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THOR10","THOR","10","24","2014-02-04","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THOR11","THOR","11","24","2014-03-04","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THOR12","THOR","12","24","2014-04-08","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THOR13","THOR","13","24","2014-05-07","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THOR14","THOR","14","24","2014-06-03","2015-01-08 09:32:46","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THOR15","THOR","15","24","2014-07-08","2015-01-08 09:32:48","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THOR16","THOR","16","24","2014-08-05","2015-01-08 09:32:49","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THOR18","THOR","18","24","2014-10-09","2015-01-08 09:32:51","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THOR19","THOR","19","24","2014-11-11","2015-01-08 09:32:52","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THOR20","THOR","20","26","2014-12-09","2015-01-08 09:32:53","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THOR21","THOR","21","26","2015-01-06","2015-01-13 12:22:12","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THOR6","THOR","6","23","2013-10-08","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THOR7","THOR","7","23","2013-11-05","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THOR8","THOR","8","23","2013-12-05","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THOR9","THOR","9","24","2014-01-14","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THUNDEBOLTS14","THUNDEBOLTS","14","24","2014-05-21","2015-01-08 09:32:46","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THUNDERBOLTS10","THUNDERBOLTS","10","24","2014-01-23","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THUNDERBOLTS11","THUNDERBOLTS","11","24","2014-02-18","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THUNDERBOLTS12","THUNDERBOLTS","12","24","2014-03-18","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THUNDERBOLTS13","THUNDERBOLTS","13","24","2014-04-23","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THUNDERBOLTS15","THUNDERBOLTS","15","24","2014-06-18","2015-01-08 09:32:47","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THUNDERBOLTS16","THUNDERBOLTS","16","24","2014-07-22","2015-01-08 09:32:48","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THUNDERBOLTS17","THUNDERBOLTS","17","24","2014-08-19","2015-01-08 09:32:49","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THUNDERBOLTS18","THUNDERBOLTS","18","24","2014-09-23","2015-01-08 09:32:50","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THUNDERBOLTS19","THUNDERBOLTS","19","24","2014-10-21","2015-01-08 09:32:51","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THUNDERBOLTS6","THUNDERBOLTS","6","23","2013-09-17","2015-01-08 09:32:42","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THUNDERBOLTS7","THUNDERBOLTS","7","23","2013-10-22","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THUNDERBOLTS8","THUNDERBOLTS","8","23","2013-11-19","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("THUNDERBOLTS9","THUNDERBOLTS","9","23","2013-12-17","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("TWD11","TWD","11","150","2014-02-14","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("TWD12","TWD","12","150","2014-05-21","2015-01-08 09:32:46","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("TWD13","TWD","13","150","2014-06-16","2015-01-08 09:32:47","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("TWD15","TWD","15","150","2014-09-16","2015-01-08 09:32:50","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("TWD9","TWD","9","150","2014-01-14","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYAVENGERS10","UNCANNY AVENGERS","10","24","2014-02-10","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYAVENGERS11","UNCANNY AVENGERS","11","24","2014-03-11","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYAVENGERS12","UNCANNY AVENGERS","12","24","2014-04-15","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYAVENGERS13","UNCANNY AVENGERS","13","24","2014-05-13","2015-01-08 09:32:46","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYAVENGERS14","UNCANNY AVENGERS","14","24","2014-06-10","2015-01-08 09:32:47","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYAVENGERS15","UNCANNY AVENGERS","15","24","2014-07-15","2015-01-08 09:32:48","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYAVENGERS16","UNCANNY AVENGERS","16","24","2014-08-13","2015-01-08 09:32:49","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYAVENGERS17","UNCANNY AVENGERS","17","24","2014-09-16","2015-01-08 09:32:50","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYAVENGERS18","UNCANNY AVENGERS","18","24","2014-10-15","2015-01-08 09:32:51","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYAVENGERS19","UNCANNY AVENGERS","19","24","2014-11-11","2015-01-08 09:32:52","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYAVENGERS20","UNCANNY AVENGERS","20","26","2014-12-23","2015-01-08 09:32:53","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYAVENGERS21","UNCANNY AVENGERS","21","26","2015-01-13","2015-01-13 12:22:12","0")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYAVENGERS5","UNCANNY AVENGERS","5","23","2013-09-11","2015-01-08 09:32:42","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYAVENGERS6","UNCANNY AVENGERS","6","23","2013-10-15","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYAVENGERS8","UNCANNY AVENGERS","8","23","2013-12-10","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYAVENGERS9","UNCANNY AVENGERS","9","23","2014-01-23","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYXFORCE6","UNCANNY X-FORCE","6","32","2013-09-17","2015-01-08 09:32:42","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYXFORCE7","UNCANNY X-FORCE","7","32","2013-10-22","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYXFORCE8","UNCANNY X-FORCE","8","32","2013-11-19","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYXFORCE9","UNCANNY X-FORCE","9","0","2013-12-17","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYXMEN10","UNCANNY X-MEN","10","33","2014-02-04","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYXMEN11","UNCANNY X-MEN","11","33","2014-03-04","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYXMEN12","UNCANNY X-MEN","12","33","2014-04-08","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYXMEN13","UNCANNY X-MEN","13","33","2014-04-29","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYXMEN14","UNCANNY X-MEN","14","33","2014-06-03","2015-01-08 09:32:46","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYXMEN15","UNCANNY X-MEN","15","33","2014-07-02","2015-01-08 09:32:47","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYXMEN16","UNCANNY X-MEN","16","33","2014-08-05","2015-01-08 09:32:49","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYXMEN18","UNCANNY X-MEN","18","33","2014-10-09","2015-01-08 09:32:51","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYXMEN19","UNCANNY X-MEN","19","33","2014-11-11","2015-01-08 09:32:52","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYXMEN20","UNCANNY X-MEN","20","35","2014-12-02","2015-01-08 09:32:53","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYXMEN21","UNCANNY X-MEN","21","35","2014-12-29","2015-01-08 09:32:54","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYXMEN6","UNCANNY X-MEN","6","32","2013-10-01","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYXMEN7","UNCANNY X-MEN","7","32","2013-10-31","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYXMEN8","UNCANNY X-MEN","8","32","2013-12-05","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("UNCANNYXMEN9","UNCANNY X-MEN","9","33","2014-01-06","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("WE31","WE3","1","27","2014-06-16","2015-01-08 09:32:47","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("WE32","WE3","2","27","2014-07-22","2015-01-08 09:32:48","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("WE33","WE3","3","27","2014-08-19","2015-01-08 09:32:49","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("WHATIF1","WHAT IF","1","23","2013-09-17","2015-01-08 09:32:42","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("WHATIF2","WHAT IF","2","23","2013-09-24","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("WHATIF3","WHAT IF","3","23","2013-10-01","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("WHATIF4","WHAT IF","4","23","2013-10-08","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("WOLVERINE10","WOLVERINE","10","33","2014-05-07","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("WOLVERINE11","WOLVERINE","11","33","2014-06-10","2015-01-08 09:32:46","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("WOLVERINE12","WOLVERINE","12","33","2014-07-08","2015-01-08 09:32:47","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("WOLVERINE2","WOLVERINE","2","23","2013-09-11","2015-01-08 09:32:42","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("WOLVERINE20","WOLVERINE","20","40","2014-07-08","2015-01-08 09:32:47","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("WOLVERINE3","WOLVERINE","3","23","2013-10-08","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("WOLVERINE4","WOLVERINE","4","23","2013-11-12","2015-01-08 09:32:43","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("WOLVERINE5","WOLVERINE","5","23","2013-12-10","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("WOLVERINE6","WOLVERINE","6","33","2014-01-06","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("WOLVERINE7","WOLVERINE","7","33","2014-02-10","2015-01-08 09:32:44","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("WOLVERINE8","WOLVERINE","8","33","2014-03-18","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("WOLVERINE9","WOLVERINE","9","33","2014-04-08","2015-01-08 09:32:45","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("WOLVERINEVol21","WOLVERINE Vol. 2","1","33","2014-08-13","2015-01-08 09:32:49","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("WOLVERINEVol22","WOLVERINE Vol. 2","2","33","2014-10-06","2015-01-08 09:32:50","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("WOLVERINEVol23","WOLVERINE Vol. 2","3","33","2014-10-09","2015-01-08 09:32:51","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("WOLVERINEVol24","WOLVERINE Vol. 2","4","33","2014-11-11","2015-01-08 09:32:52","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("WOLVERINEVol25","WOLVERINE Vol. 2","5","35","2014-12-09","2015-01-08 09:32:53","1")', 'INSERT INTO registros(id,titulo,volumen,precio,fecha,fecha_registro,adquirido) VALUES ("YTHELASTMAN1","Y THE LAST MAN","1","129","2014-10-21","2015-01-08 09:32:51","1")'
		];
		db.query(s);
	};

	//MISCOMICS
	$scope.misComicsElegido = { titulo: '', cover: '' }; //Info que va al $scope.agregar
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
				$.ajax({
					url: host + 'mexicomics/listado/' + $scope.misComicsMes + '/' + $scope.misComicsAgno + '.html',
					crossDomain: true,
					dataType: 'json',
					timeout: 10000,
					cache : false,
					success: function(data){
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
			// c(obj);
			$scope.registrar(true);
			
			$('#mc-panel-' + $scope.misComicsPanelSeleccionado).animate({ opacity: .2 }, 1000);
			$scope.miscomicsModalCerrar();
		}
	};
	
	//Cerrar Modal de MisComics
	$scope.miscomicsModalCerrar = function(){
		$('.mc-modal').modal('hide').on('hidden.bs.modal', function (){
			$scope.misComicsAgregando = false;
		});
	};
	
	//Acciones por cambio de pestaña
	$scope.$watch('pestanaActiva', function(newVal, oldVal){
		//Mostrar pestaña de MisComics y cargar listado
		if(newVal == 'misComicsList') $scope.misComicsLoad();
		if(newVal == 'formulario') setTimeout(function(){ $('#nuevo_titulo').focus(); }, 300);
	});

	//Mostrar "Más opciones"
	$scope.masOpcionesIntento = 0;
	$scope.masOpcionesTry = function(){
		$scope.masOpcionesIntento++;
		if($scope.masOpcionesIntento > 5) $scope.pestanaActiva = 'opciones';
	};
	
	//Ejecutar SQL
	$scope.sqltext = "SELECT * FROM registros WHERE ";
	$scope.sqlexec = function(){
		if($.trim($scope.sqltext).length > 0)
		{
			$('#sqlexec').addClass('disabled');
			db.query($scope.sqltext).done(function(r){
				var r = JSON.stringify(r);
				c(r);
				if(r.length > 2)
					$scope.sqltext = $scope.sqltext + '\n' + r;
				else
					alert('Ejecución realizada exitosamente');
				$('#sqlexec').removeClass('disabled');
			}).fail(function(s,e){
				alert(e);
				$('#sqlexec').removeClass('disabled');
			});
		}
		
	}

	/*
	OPCIONES DE CORDOBA
	*/
	$scope.exitApp = function(){ navigator.app.exitApp(); }
}]);

//Longpress para eliminaciones
comicsApp.directive('onLongPress', function($timeout) {
	return {
		restrict: 'A',
		link: function($scope, $elm, $attrs) {
			$($elm).bind("taphold", function(event){
				$scope.$apply(function() {
					$scope.$eval($attrs.onLongPress);
				});
				event.preventDefault();
			})
			.bind("vmousedown", function(){
				$('.clicking').removeClass('clicking');
				$($elm).addClass('clicking');
			})
			.bind("vmousemove", function(){
				$('.clicking').removeClass('clicking');
			})
			.bind("vmousecancel", function(){
				$('.clicking').removeClass('clicking');
			})
			.bind("vmouseout", function(){
				$('.clicking').removeClass('clicking');
			});
		}
	};
})

/*Formar un item vacío*/
function vacio(){
	return { titulo: '', volumen: '', precio: '', fecha: new Date(), variante: '', adquirido: 0 };
	
	// var ff = [ '2015-01-31', '2015-02-01', '2015-02-02', '2015-02-03', '2015-02-04', '2015-02-05' ];
	// var rand = ff[Math.floor(Math.random() * ff.length)];
	// return { titulo: 'XX', volumen: parseInt(Math.random() * 1000), precio: parseInt(Math.random() * 1000), fecha: new Date(rand), adquirido: 0 };
}

//Mostrar eventos de carga
function p(s){
	// $('#alertCargandoDiv i').text(s);
	c(s);
}

function w(){
	var ff = [ '2015-01-31', '2015-02-01', '2015-02-02', '2015-02-03', '2015-02-04', '2015-02-05' ];
	// for(var i in ff)
	// {
		// setTimeout(function(){
			$('#nuevo_titulo').val('XX');
			$('#nuevo_volumen').val(parseInt(Math.random() * 1000));
			$('#nuevo_precio').val(parseInt(Math.random() * 1000));
			$('#nuevo_fecha').val(ff[0]);
			
			// $('#btn-registrar').click();
		
		// }, 1200);
	// }
}

function error(s){ alert(s); }