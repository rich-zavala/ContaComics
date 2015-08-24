var comicsApp = angular.module('comicsApp', ['ngStorage']);

//Filtro especial
comicsApp.filter('filtroObjetos', function() {
  return function(items, args) {
		var result = {};
		angular.forEach(items, function(item, key){
			var valid = true;
			for(var i in args) if(valid && item[i] != args[i]) valid = false;
			if(valid) result[key] = item;
		});
		return result;
  };
});

//Longpress para eliminaciones
comicsApp.directive('onLongPress', function($timeout) {
	return {
		restrict: 'A',
		link: function($scope, $elm, $attrs) {
			$elm.bind('touchstart', function(evt) {
				$($elm).addClass('clicking');
				// Locally scoped variable that will keep track of the long press
				$scope.longPress = true;

				// We'll set a timeout for 600 ms for a long press
				$timeout(function() {
					if ($scope.longPress) {
						// If the touchend event hasn't fired,
						// apply the function given in on the element's on-long-press attribute
						$scope.$apply(function() {
							$($elm).removeClass('clicking');
							$scope.$eval($attrs.onLongPress)
						});
					}
				}, 600);
			});

			$elm.bind('touchend', function(evt) {
				$($elm).removeClass('clicking');
				// Prevent the onLongPress event from firing
				$scope.longPress = false;
				// If there is an on-touch-end function attached to this element, apply it
				if ($attrs.onTouchEnd) {
					$scope.$apply(function() {
						$scope.$eval($attrs.onTouchEnd)
					});
				}
			});
		}
	};
})

//Doble click para más información
comicsApp.directive('onDoubleClick', function($timeout) {
	return {
		restrict: 'A',
		link: function($scope, $elm, $attrs) {
			$($elm).bind("dblclick", function(event){
				$scope.$apply(function() {
					$scope.$eval($attrs.onDoubleClick);
				});
				event.preventDefault();
			});
		}
	};
});

/*Formar un item vacío*/
function vacio(){
	return { titulo: '', volumen: '', precio: '', fecha: new Date(), variante: '', adquirido: 0 };
}

//Mostrar eventos de carga
function p(s){
	// $('#alertCargandoDiv i').text(s);
	c(s);
}

function error(s){ alert(s); }