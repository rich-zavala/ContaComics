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
var scrolled = false;
comicsApp.directive('onLongPress', function($timeout) {
	return {
		restrict: 'A',
		link: function($scope, $elm, $attrs) {
			$elm.bind('touchstart', function(evt) {
				scrolled = false;
				$($elm).addClass('clicking');
				$scope.longPress = true;

				// We'll set a timeout for 600 ms for a long press
				$timeout(function() {
					if (!scrolled && $scope.longPress) {
						$scope.$apply(function() {
							$($elm).removeClass('clicking');
							$scope.$eval($attrs.onLongPress)
						});
					}
					else $($elm).removeClass('clicking');
				}, 600);
			});

			$elm.bind('touchend', function(evt) {
				$($elm).removeClass('clicking');
				$scope.longPress = false;
				if ($attrs.onTouchEnd) {
					$scope.$apply(function() {
						$scope.$eval($attrs.onTouchEnd)
					});
				}
			});
			
			window.onscroll = function (e)
			{
				scrolled = true;
				$('.clicking').removeClass('clicking');
			}
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