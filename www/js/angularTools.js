var comicsApp = angular.module('comicsApp', ['ngStorage', 'vs-repeat']);

//Longpress para eliminaciones
var _scrolled_ = false;
comicsApp.directive('onLongPress', function($timeout) {
	return {
		restrict: 'A',
		link: function($scope, $elm, $attrs) {
			_scrolled_ = false;
			$elm.bind('touchstart', function(evt) {
				$($elm).addClass('clicking');
				// Locally scoped variable that will keep track of the long press
				$scope.longPress = true;

				// We'll set a timeout for 600 ms for a long press
				$timeout(function() {
					if (!_scrolled_ && $scope.longPress) {
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
		
			//Evitar click > scroll
			$(window).scroll(function(){
				_scrolled_ = true;
				$('.clicking').removeClass('clicking');
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