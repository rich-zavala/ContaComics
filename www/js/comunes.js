//Variables de sistema
// var _agnos = [];
// var _fechas = [];
// var _registros = [];
var host = 'http://service-contacomics.rhcloud.com/';
var nofoto = 'images/no_photo.jpg';
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
function code(rr){ return (rr.titulo + rr.volumen + rr.variante).replace(/[^a-zA-Z0-9]/g, ''); }

//Formatear fecha
function dateFormat(sd){ return sd.getFullYear() + '-' + z(sd.getMonth() + 1) + '-' + z(sd.getDate()); }

//Formatear hora
function hourFormat(sd){ return z(sd.getHours()) + ':' + z(sd.getMinutes()) + ':' + z(sd.getSeconds()); }