/*
Objetos de la BDD
*/
var db, openRequest;
var dbTransactions = [];
var dbName = 'ContaComics';
var idbSupported = false;
if("indexedDB" in window) { idbSupported = true; }

document.addEventListener("DOMContentLoaded", function(){
	if(idbSupported) //Continuar
	{
		dbOpen();
	}
	else //No hay soporte de BDD
	{
		$('body').html('El sistema no soporta IndexedDB.');
	}
},false);

/*
Recibe el parámetro [params] con:
success: función de ejecución al registrar correctamente
error: función de ejecución si sucede un error
*/
// try{indexedDB.deleteDatabase('test_v2')}catch(e){}
// try{indexedDB.deleteDatabase('ContaComics')}catch(e){}
var dbOpen = function(params)
{
	if(typeof params == 'undefined') params = {};
	openRequest = indexedDB.open(dbName, 3);
	// c(openRequest.result.version);
 
	//Inicialización de BDD
	openRequest.onupgradeneeded = function(e) {
		w("Ejecutando onupgradeneeded...");
		db = e.target.result;

		//Crear store
		if(!db.objectStoreNames.contains("registros")) {
			db.createObjectStore("registros", { keyPath: "id" });
			objectStore.createIndex("id", "id", { unique: true });
			objectStore.createIndex("adquirido", "adquirido", { unique: false });
			objectStore.createIndex("agno", "agno", { unique: false });
			objectStore.createIndex("mes", "mes", { unique: false });
			objectStore.createIndex("dia", "dia", { unique: false });
			w('[registros] creado exitosamente.');
		}
	}
	
	//Store correctamente creado
	openRequest.onsuccess = function(e) {
		db = e.target.result;
		w("Apertuda exitosa.");
		
		if(typeof params.success == 'function') params.success();
	}
	
	//Error de inicialización
	openRequest.onerror = function(e) {
		w("Error", e.target.error.name);
		if(typeof params.error == 'function') params.success();
	}
}
	
//Agregar un registro
/*
Recibe el parámetro [params] con:
success: función de ejecución al registrar correctamente
error: función de ejecución si sucede un error
repetido: función de ejecución si existe un elemento repetido
data: objeto que se agregará
put: true para actualizar (opcional)
*/
var addRegistro = function(params) {
	var ejecutar = function()
	{
		var transaction = db.transaction(["registros"], "readwrite");
		var store = transaction.objectStore("registros");
		
		//Ejecutar el add
		if(typeof params.put == 'undefined' || !params.put)
			var request = store.add(params.data);
		else
			var request = store.put(params.data);

		request.onerror = function(e) {
			w("Error en [add]:");
			if(e.target.error.name != 'ConstraintError' && typeof params.error == 'function') params.error();
			else if(e.target.error.name == 'ConstraintError' && typeof params.repetido == 'function') params.repetido();
		}

		request.onsuccess = function(e) {
			w("[add] ejecutado exitosamente");
			if(typeof params.success == 'function') params.success();
		}
	}
	
	if(typeof db == 'undefined' || !db.transaction) //Inicializar si es necesario
		dbOpen({
			success: ejecutar,
			error: params.error
		});
	else
		ejecutar();
}

//Eliminar un registro
/*
Recibe el parámetro [params] con:
success: función de ejecución al registrar correctamente
error: función de ejecución si sucede un error
id: id del objeto que se removerá
*/
var removeRegistro = function(params){
	var ejecutar = function()
	{
		var transaction = db.transaction(["registros"], "readwrite");
		var store = transaction.objectStore("registros");
		
		//Ejecutar el delete
		var request = store.delete(params.id);

		request.onerror = function(e) {
			w("Error en [delete]:");
			c(e);
		}

		request.onsuccess = function(e) {
			w("[delete] ejecutado exitosamente");
			if(typeof params.success == 'function') params.success();
		}
	}
	
	if(typeof db == 'undefined' || !db.transaction) //Inicializar si es necesario
		dbOpen({
			success: ejecutar,
			error: params.error
		});
	else
		ejecutar();
}

//Solicitud de información
/*
Recibe el parámetro [params] con:
success: función de ejecución al registrar correctamente
error: función de ejecución si sucede un error
data: parámetros que debe tener el registro
*/
var dbCompletes = 0;
var notificationOn = false;
var getRegistro = function(params) {
	var ejecutar = function()
	{
		//Mostrar notificación
		if(!notificationOn && typeof navigator.notification != 'undefined')
		{
			navigator.notification.activityStart('', 'Cargando información...');
			notificationOn = true;
		}
		
		var registros = [];
		var transaction = db.transaction(["registros"], "readonly");
		
		// var store = transaction.objectStore("registros");
		// c(store);
		
		transaction.objectStore("registros").openCursor().onsuccess = function(e) {
			var cursor = e.target.result;
			if(cursor)
			{
				var coincidencia = true;
				if(typeof params.data != 'undefined')
				{
					for(var field in params.data)
					{
						if(cursor.value[field] != params.data[field])
						{
							coincidencia = false;
							break;
						}
					}
				}
				
				// if(coincidencia) registros[cursor.value.id] = cursor.value;				
				if(coincidencia) registros.push(cursor.value);
				cursor.continue();
			}
			else
			{
				if(typeof params.success != 'undefined') params.success(registros);
			}
		}
		
		//Contar finalizaciones
		transaction.oncomplete = function(){
			dbCompletes++;
			
			//Ocultar notificación
			if(dbTransactions.length == dbCompletes && typeof navigator.notification != 'undefined')
			{
				navigator.notification.activityStop();
				notificationOn = false;
			}
		}
		
		dbTransactions.push(transaction);
	}
	
	if(typeof db == 'undefined' || !db.transaction) //Inicializar si es necesario
		dbOpen({
			success: ejecutar,
			error: params.error
		});
	else
		ejecutar();
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