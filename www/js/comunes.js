//Variables de sistema
var dbug = true; //Modo de debugueo
var nofoto = 'images/no_photo.png';

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

//Array unique
function unique(array){
	return array.filter(function(el, index, arr) {
		return index === arr.indexOf(el);
	});
}

// Function to disable "pull-to-refresh" effect present in some webviews.
window.addEventListener('load', function() {
    var lastTouchY = 0 ;
    var maybePreventPullToRefresh = false ;
    var touchstartHandler = function(e) {
        if( e.touches.length != 1 ) {
            return ;
        }
        lastTouchY = e.touches[0].clientY ;
        maybePreventPullToRefresh = (window.pageYOffset == 0) ;
    }

    var touchmoveHandler = function(e) {
        var touchY = e.touches[0].clientY ;
        var touchYDelta = touchY - lastTouchY ;
        lastTouchY = touchY ;

        if (maybePreventPullToRefresh) {
            maybePreventPullToRefresh = false ;
            if (touchYDelta > 0) {
                e.preventDefault() ;
                return ;
            }
        }
    }

    document.addEventListener('touchstart', touchstartHandler, false) ;
    document.addEventListener('touchmove', touchmoveHandler, false) ;
}) ;

//Inicializar app
var inicializarApp = function(){
	//Modal de "más detalles"
	$('.comic-modal').modal('hide').on('shown.bs.modal', function(){
		var t = $(this);
		var header = t.find('.modal-header').outerHeight();
		var detalles = t.find('#comicDetalles').outerHeight();
		var win = $(window).height();
		var h = win - header - detalles - 80;
		$('#coverImageContainer').height(h);
	});

	//Dimensiones del TypeAhead
	$(document).on('typeahead:opened', function(event, datum) {
		var width = $(event.target).parents('.tab-pane:first').width();
		$('.tt-dropdown-menu').width(width);
	});
	
	//Idioma de moment
	moment.locale('es');
}

$(document).ready(function(){
	inicializarApp();
});