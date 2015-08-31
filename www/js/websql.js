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
	});
}

/*
Ejecutar una transacción
Recibe el parámetro [params] con:
success: función de ejecución al registrar correctamente
error: función de ejecución si sucede un error
query: cadena de ejecución
*/
var dbTransactions = [];
var dbCompletes = 0;
var notificationOn = false;
var executeTransaction = function(params)
{
	db.transaction(function(t){
		w('Transaction...');
		t.executeSql(params.query, []);
		params.success();
	}, function(e){
		var error = e.message;
		if(error.indexOf('constraint') >= 0 && typeof params.repetido == 'function')
			params.repetido();
		else
			params.error(e);
	});
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
		// c(campos);
		// c(values);
		for(var i in campos)
		{
			// c(values[i]);
			sets.push(campos[i] + " = '" + values[i].toString().replace("\'", "\\\'") + "'")
		}
		params.query = 'UPDATE registros SET ' + sets.join(',') + ' WHERE id = "' + params.data.id + '"';
	}
	c(params.query);
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
	//Mostrar notificación
	if(!notificationOn)
	{
		if(typeof navigator.notification != 'undefined') navigator.notification.activityStart('', 'Cargando información...');
		notificationOn = true;
	}
	
	var where = [];
	if(typeof params.data != 'undefined') for(var campo in params.data) where.push(campo + '="' + params.data[campo] + '"');
	
	params.query = 'SELECT * FROM registros';
	if(where.length > 0) params.query += ' WHERE ' + where.join(' AND ');
	
	var transaction = db.transaction(function (t) {
		w("Creando tabla...");
		t.executeSql(params.query, [], function(tx, results){
			
			c(results);
			var resultados = [];
			var len = results.rows.length, i;
			for (i = 0; i < len; i++) resultados.push(results.rows.item(i));
			params.success(resultados);
			
			trc();
		}, errorHandler);
	});
	
	/*var transaction = db.transaction(function(t){
		w('Transaction SELECT...');
		w(params.query);
		t.executeSql(params.query, [], function(tx, results){
			var resultados = [];
			var len = results.rows.length, i;
			for (i = 0; i < len; i++) resultados.push(results.rows[i]);
			params.success(resultados);
			
			trc();
		});
	}, function(e){
		trc();
		c(e);
		
		var error = e.message;
		if(error.indexOf('constraint') >= 0 && typeof params.repetido == 'function')
			params.repetido();
		else
			params.error(e);
	});*/
	c(transaction);
	
	dbTransactions.push(transaction);
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
var trc = function(){
	dbCompletes++;
	
	//Ocultar notificación
	if(dbTransactions.length == dbCompletes)
	{
		if(typeof navigator.notification != 'undefined') navigator.notification.activityStop();
		notificationOn = false;
		w('Fin! :D');
	}
}

function errorHandler(transaction, error)
{
    // error.message is a human-readable string.
    // error.code is a numeric error code
    alert('Oops.  Error was '+error.message+' (Code '+error.code+')');
 
    // Handle errors here
    var we_think_this_error_is_fatal = true;
    if (we_think_this_error_is_fatal) return true;
    return false;
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