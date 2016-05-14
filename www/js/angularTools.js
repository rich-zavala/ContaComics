var comicsApp = angular.module('comicsApp', ['ngStorage']);
var infoShow = false; //Indicador de notificación abierta

//Filtro especial
comicsApp.filter('filtroObjetos', function() {
  return function(items, args) {
		var result = [];
		angular.forEach(items, function(item, key){
			var valid = true;
			for(var i in args) if(valid && item[i] != args[i]) valid = false;
			if(valid) result.push(item);
		});
		// c('filtrado');
		return result;
  };
});

comicsApp.directive("tablaDia", ['$filter', '$timeout', function($filter, $timeout) {
	return {
		// scope: true,
		controller: function($scope, $element, $attrs) {			
			$scope.registros = [];
			$scope.show = false;
			
			var obtener = function(){
				$scope.registros = [];
				$scope.show = false;
				$scope.tablaAgno = angular.copy($scope.agnoActivo);
				var filtro = {
					agno: parseInt($scope.agnoActivo),
					mes: parseInt($attrs.tablaMes),
					dia: parseInt($attrs.tablaDia)
				};
				if($scope.filtroActivo >= 0) filtro.adquirido = parseInt($scope.filtroActivo);
				getRegistro({
					data: filtro,
					success: function(data){
						$scope.registros = data;
						$scope.show = data.length > 0;
						$scope.$apply();
					},
					error: function(){ er('Error no definido en [obtener] > ' + filtro.agno + '/' + filtro.mes); }
				});
			};

			if ($scope.$last) {
				$timeout(function() {
					obtener();
				});
			}
			
			//Cambios por filtros
			$scope.$watch('filtroActivo', function(){
				obtener();
			});
			
			//Detectar cambios
			$scope.$on('registrosAlterados', function(event, args){
				if(args.mes == $attrs.tablaMes && args.dia == $attrs.tablaDia) obtener();
			});
			
			/* 14 May 2016 > Reemplazo de pantalla de más información. */
			$scope.informacion = function(registro){
				if(!infoShow)
				{
					var continuar = function(btnIndex){
						if(btnIndex == 1)
							$scope.eliminar(registro); //Función en scope principal
					
						infoShow = false;
					};
					
					infoShow = true;
					var msg = 'Vol. #' + registro.volumen + ' - ' + $filter('currency')(registro.precio) + '\n\n'
							+	'Fecha de registro:\n' + moment(registro.fecha_registro).format('MMMM MM, YYYY - h:mm a') + '\n\n'
							+	'Fecha de adquisición:\n' +	((registro.fecha_adquisicion != 'Invalid Date') ? moment(registro.fecha_adquisicion).format('MMMM MM, YYYY - h:mm a') : 'No disponible');
					navigator.notification.confirm(msg, continuar, registro.titulo, ['Eliminar', 'Cerrar']);
				}
			};
		},
    restrict: 'E',
    templateUrl: 'templates/tabla_dia.html'
  };
}]);

/*Formar un item vacío*/
function vacio(){
	$('#nuevo_titulo').val('');
	return { titulo: '', fecha: new Date(), variante: '', adquirido: 0 };
}

function error(s){ alert(s); }