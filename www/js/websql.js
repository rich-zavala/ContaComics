/*
Objetos de la BDD
*/
var db;
var dbName = 'ContaComics';
var dbSupported = false;
if("openDatabase" in window) { dbSupported = true; }
document.addEventListener("DOMContentLoaded", function(){
	if(dbSupported) //Continuar
		dbOpen();
	else //No hay soporte de BDD
		$('body').html('El sistema no soporta IndexedDB.');
},false);

/*
Inicialización de BDD
Recibe el parámetro [params] con:
success: función de ejecución al registrar correctamente
error: función de ejecución si sucede un error
*/
var dbOpen = function(params)
{
	if(typeof params == 'undefined') params = {};
	
	db = openDatabase(dbName, '1.0', 'Almacén de registros', 5 * 1024 * 1024);
	db.transaction(function (t) {
		w("Creando tabla...");
		t.executeSql('CREATE TABLE IF NOT EXISTS registros ( "id" TEXT NOT NULL, "titulo" TEXT, "variante" TEXT, "volumen" INTEGER, "precio" INTEGER, "adquirido" INTEGER, "agno" INTEGER, "mes" INTEGER, "dia" INTEGER, "fecha" TEXT, "fecha_adquisicion" TEXT, "fecha_registro" TEXT, PRIMARY KEY ("id") )');
		if(typeof params.success == 'function') params.success();
	},
	function(e){
		if(typeof params.error == 'function') params.error(e);
	});
}

/*
Ejecutar una transacción
Recibe el parámetro [params] con:
success: función de ejecución al registrar correctamente
error: función de ejecución si sucede un error
query: cadena de ejecución
*/
var executeTransaction = function(params)
{
	var ejecutar = function()
	{
		db.transaction(function(t){
			w('Transaction...');
			t.executeSql(params.query);
			params.success();
		}, function(e){
			var error = e.message;
			if(error.indexOf('constraint') >= 0 && typeof params.repetido == 'function')
				params.repetido();
			else
				er(params.query);
				params.error(e);
		});
	}
	
	if(typeof db == 'undefined' || !db.transaction) //Inicializar si es necesario
		dbOpen({
			success: ejecutar,
			error: params.error
		});
	else
		ejecutar();
}


/*
Agregar un registro
Recibe el parámetro [params] con:
success: función de ejecución al registrar correctamente
error: función de ejecución si sucede un error
repetido: función de ejecución si existe un elemento repetido
data: objeto que se agregará
put: true para actualizar (opcional)
*/
var addRegistro = function(params) {
	//Preparar sentencia
	var campos = Object.keys(params.data);
	var values = $.map(params.data, function(value, index) { return [value]; });
	
	if(typeof params.put == 'undefined' || !params.put) //Inserción
		params.query = 'INSERT INTO registros (' + campos.join(',') + ') VALUES ("' + values.join('","') + '")';
	else //Actualización
	{
		var sets = [];
		for(var i in campos) if(campos[i] != '$$hashKey') sets.push(campos[i] + " = '" + values[i].toString().replace("\'", "\\\'") + "'")
		params.query = 'UPDATE registros SET ' + sets.join(',') + ' WHERE id = "' + params.data.id + '"';
	}
	executeTransaction(params);
}

/*
Solicitud de información
Recibe el parámetro [params] con:
success: función de ejecución al registrar correctamente
error: función de ejecución si sucede un error
data: parámetros que debe tener el registro
*/
var getRegistro = function(params) {
	var where = [];
	if(typeof params.data != 'undefined') for(var campo in params.data) where.push(campo + '="' + params.data[campo] + '"');
	
	params.query = 'SELECT * FROM registros';
	if(where.length > 0) params.query += ' WHERE ' + where.join(' AND ');
	
	//Preparar transacción
	var ejecutar = function()
	{
		var transaction = db.transaction(function(t){
			w('Transaction SELECT...');
			// w(params.query);
			t.executeSql(params.query, [], function(tx, results){
				var resultados = [];
				var len = results.rows.length, i;
				for (i = 0; i < len; i++) resultados.push(angular.copy(results.rows.item(i)));
				params.success(resultados);
				
				ccNotifEnd();
			});
		}, function(e){
			ccNotifEnd();
			
			var error = e.message;
			if(error.indexOf('constraint') >= 0 && typeof params.repetido == 'function')
				params.repetido();
			else
				params.error(e);
		});
		
		//Mostrar notificación
		dbTransactions.push(transaction);
		ccNotifInit();
	}
	
	if(typeof db == 'undefined' || !db.transaction) //Inicializar si es necesario
		dbOpen({
			success: ejecutar,
			error: params.error
		});
	else
		ejecutar();
}

/*
Eliminar un registro
Recibe el parámetro [params] con:
success: función de ejecución al registrar correctamente
error: función de ejecución si sucede un error
id: id del objeto que se removerá
*/
var removeRegistro = function(params){
	//Preparar sentencia
	params.query = 'DELETE FROM registros WHERE id = "' + params.id + '"';
	executeTransaction(params);
}

//Contabilizador de transacciones
var notificationOn = false;
var dbCompletes = 0;
var dbTransactions = [];
var ccNotifInit = function(){
	if(!notificationOn && typeof navigator.notification != 'undefined') navigator.notification.progressStart('', 'Cargando información...');
	notificationOn = true;
}

var ccNotifEnd = function(){
	dbCompletes++;
	w(dbTransactions.length+' == '+dbCompletes);
	if(dbTransactions.length == dbCompletes) //Ocultar notificación
	{
		if(typeof navigator.notification != 'undefined') navigator.notification.progressStop();
		w('Fin! :D');

		ccNotifReset();
	}
	else //Progreso
	{
		var v = Math.ceil((dbCompletes / dbTransactions.length) * 100);
		if(typeof navigator.notification != 'undefined') navigator.notification.progressValue(v);
	}
}

var ccNotifReset = function(){
	//Reseteo
	notificationOn = false;
	dbTransactions = [];
	dbCompletes = 0;
}

/*Herramientas*/
function w(s){
	if(dbug)
	{
		try{ console.warn('BDD > ' + s) }
		catch(e){ c('Error en [w]'); }
	}
}
function er(s){
	if(dbug)
	{
		try{ console.error(s) }
		catch(e){ c('Error en [er]'); }
	}
}