var comicsApp = angular.module('comicsApp', ['ngStorage']);

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

comicsApp.directive("tablaDia", ['$timeout', function($timeout) {
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
			}

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
		},
    restrict: 'E',
    templateUrl: 'templates/tabla_dia.html'
  };
}]);

/*Formar un item vacío*/
function vacio(){
	$('#nuevo_titulo').val('')
	// return { titulo: 'UNCANNY X-MEN', volumen: 7, precio: 10, fecha: new Date(), variante: '', adquirido: 0 };
	return { titulo: '', fecha: new Date(), variante: '', adquirido: 0 };
}

function error(s){ alert(s); }