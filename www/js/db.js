//Inicialización de variables de opciones
var host = 'http://service-contacomics.rhcloud.com/';
var ls = localStorage;
var dbName = ls.getItem('dbName');
var dbTableName = '';
var dbDeleteTableName = '';
var db = '';
var syncDate = dateFormat(new Date());

/*Query de creación. Última versión.*/
var createQuery = [];

function getDbVariables()
{
	if(ls.getItem('dbName') == null) ls.setItem('dbName', 'mydb');
	if(ls.getItem('dbTableName') == null) ls.setItem('dbTableName', 'registros');
	if(ls.getItem('dbDeleteTableName') == null) ls.setItem('dbDeleteTableName', 'eliminaciones');
	if(ls.getItem('host') == null) ls.setItem('host', host);
	if(ls.getItem('syncDate') == null) ls.setItem('syncDate', syncDate);
	
	//Variables fijas
	dbTableName = ls.getItem('dbTableName');
	dbDeleteTableName = ls.getItem('dbDeleteTableName');
	host = ls.getItem('host');
	db = WebSQL(dbName);
	
	/*Asignar query de creación. Última versión.*/
	createQuery = [
		'CREATE TABLE "' + dbTableName + '" ("id" TEXT NOT NULL, "titulo" TEXT, "volumen"  INTEGER, "precio"  REAL(10,2), "fecha" TEXT, "fecha_registro" TEXT, "variante" TEXT DEFAULT \'\', "adquirido" INTEGER, PRIMARY KEY ("id" ASC) )',
		'DROP INDEX IF EXISTS k',
		'CREATE UNIQUE INDEX k ON "' + dbTableName + '" ("titulo" ASC, "volumen" ASC, "variante" ASC)'
	];
	
	/*
	30 Marzo
	Actualizar base de datos actual si no tiene "variante"
	*/
	var s = "SELECT variante FROM registros LIMIT 1";
	db.query(s).fail(function(){
		var s = [ 'ALTER TABLE ' + dbTableName + ' RENAME TO "_registros_old_"' ];
		s = $.merge(s, createQuery);
		s.push('INSERT INTO ' + dbTableName + ' ("id", "titulo", "volumen", "precio", "fecha", "fecha_registro", "adquirido") SELECT "id", "titulo", "volumen", "precio", "fecha", "fecha_registro", "adquirido" FROM "_registros_old_"');
		s.push('DROP TABLE _registros_old_');
		db.query(s).fail(function(t,e){ c(t); c(e); });
	});
}

getDbVariables();
var dbIntento = 0;
function dbCrear(callback){
	var s = "SELECT COUNT(id) r FROM " + dbTableName;
	db.query(s).fail(function(tx, err){
		//¡No hay base de datos! ¡Crea una!
		db.query(createQuery).fail(function(tx, err){
			if(dbIntento == 0)
				dbIntento++;
			else
			{
				alert('Ha ocurrido un error y la base de datos no pudo ser creada.');			
				c(err.message);
			}
		}).done(function(registros){ //Ejecutar algo si es correcto
			if(typeof callback == "function") callback(registros);
		});
		
	}).done(function(){
		//Sí existe la tabla y todo
		if(typeof callback == "function") callback();
	});
}

//Actualizar registro
function dbUpdate(tabla, campo, valor, id, callback, parametros){
	var s = "UPDATE " + tabla + " SET " + campo + " = '" + valor + "' WHERE id = '" + id + "'";
	dbQuery(s, callback, parametros);
}

//Eliminar registro
function dbDelete(tabla, id, callback, parametros){
	var s = "DELETE FROM " + tabla + " WHERE id = '" + id + "'";
	dbQuery(s, callback, parametros);
}

//Ejecutar query
function dbQuery(s, callback){
	c(s);
	db.query(s).fail(function(tx, err){
		throw new Error(err.message);
	}).done(function(registros){ //Ejecutar algo si es correcto
		if(typeof callback == "function")
			callback(registros);
		else eval(callback);
	});
}

/*Funciones de la aplicación*/
/*function obtener(){
	var fecha = localStorage.getItem('fechaUltimaObtencion');
	$.ajax({
		url: host + 'data',
		dataType: 'jsonp',
		data: { fecha: fecha },
		success: function(data){
			for(var i in data) dbAddObject(data[i]);
		},
		error: function(err){
			_e(err);
		}
	});
}*/

//Insertar objeto
/*function dbAddObject(o){
	if(typeof o.fecha_registro == "undefined" || o.fecha_registro == '') o.fecha_registro = new Date();
	if(typeof o.id == "undefined" || $.trim(o.id).length == 0) c(typeof o.id); // o.id = code(o);
	var s = "INSERT INTO " + dbTableName + " (id, titulo, volumen, precio, fecha, fecha_registro, adquirido) VALUES ('" + o.id + "', '" + o.titulo + "', '" + o.volumen + "', '" + o.precio + "', '" + o.fecha + "', '" + o.fecha_registro + "', '" + o.adquirido + "')";
	var callback = function(o){
		c('Objeto insertado:');
		c(o);
		c('=================');
	}
	
	dbQuery(s, callback, o);
}
*/

//Variables de sistema
var _agnos = [];
var _fechas = [];
var _registros = [];
var _totales = 0; //Cantidad de registros
var _totalesRegistrados = 0; //Cantidad de registros ya indezados

var uuid = (typeof intel === 'undefined') ? 'local' : intel.xdk.device.uuid;

function c(s){ try{console.log(s)}catch(e){c(e);} }
function _e(s){ c(s); }
function _r(data){};
function z(n) {
  var s = n+"";
  while (s.length < 2) s = "0" + s;
  return s;
}

/*Código único de registro*/
function code(rr){ return (rr.titulo + rr.volumen + rr.variante).replace(/[^a-zA-Z0-9]/g, ' '); }

//Formatear fecha
function dateFormat(sd)
{
	return sd.getFullYear() + '-' + z(sd.getMonth() + 1) + '-' + z(sd.getDate());
}

//Formatear hora
function hourFormat(sd)
{
	return z(sd.getHours()) + ':' + z(sd.getMinutes()) + ':' + z(sd.getSeconds());
}

//¡¡¡TEMPORAL!!!!
//Registrar fecha de última actualización
/*setTimeout(function(){
	var xs = "SELECT fecha_registro FROM " + dbTableName + " ORDER BY fecha_registro DESC LIMIT 1";
	db.query(xs).fail(function(tx, err){
		throw new Error(err.message);
	}).done(function(registros){ //Ejecutar algo si es correcto
		// ls.setItem('syncDate', registros[0].fecha_registro);
	});
}, 5000);*/
