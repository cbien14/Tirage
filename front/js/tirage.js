var tirageApp = angular.module('tirageApp', ['ngRoute', 'tirageService']);

tirageApp.directive('datePicker', function () {
    return {
        link: function postLink(scope, element, attrs) {
            scope.$watch(attrs.datePicker, function () {
                if (attrs.datePicker === 'start') {
                    element.pickadate({
                    	min: new Date(),
                    	formatSubmit: 'yyyy/mm/dd',
                    	onSet: function(e) { scope.eventEndDate = this.get();}
                    });
                }
            });
        }
    };
});

tirageApp.config(['$routeProvider',
	function($routeProvider) {
		$routeProvider.when('/', {
			templateUrl: 'partials/newEvent.html',
			controller: 'TirageCtrl'
		}).when('/:eventId/:userId', {
			templateUrl: 'partials/pick.html',
			controller: 'TirageCtrl'
		}).otherwise({
			redirectTo: '/'
	});
}]);

tirageApp.controller('TirageCtrl', ['$scope', '$http', '$templateCache', '$routeParams', 'Event', function($scope, $http, $templateCache, $routeParams, Event) {

	$scope.participants = [{ name: undefined, email: undefined }, { name: undefined, email: undefined }];
	$scope.eventEndDate = undefined;
	$scope.reEmail = /\S+@\S+\.\S+/

	var _getEventParticipation = function(eventId, userId) {
		var data = Event.getEventParticipation({ "eventId": eventId, "user": userId }, function() {
			switch(data.code) {
					case 0:
						$scope.currentParticipant = data.participant;
						$scope.currentEventName = data.eventName;
						break;
					case 1:
					case 2:
						$scope.error = data.error;
						break;
					default:
						$scope.error = 'something goes wrong !';
						break;
				}
		});
	}

	if($routeParams.eventId && $routeParams.userId) {
		_getEventParticipation($routeParams.eventId, $routeParams.userId);
		$scope.currentEventId = $routeParams.eventId;
	}

	$scope.getGiftTarget = function() {
		if($scope.currentParticipant) {
			var data = Event.getGiftTarget({'userId': $scope.currentParticipant.id, 'eventId': $scope.currentEventId}, function() {
				$scope.target = data.name;
			});
		}
	};

	$scope.newEvent = function() {
		var data = Event.create({
			'eventName':  $scope.eventName,
			'participants': $scope.participants,
			'eventEndDate': new Date($scope.eventEndDate).getTime()
		}, function(){
			$scope.participants = [];
			$scope.eventId = data.event;
		});
	};

	$scope.addParticipant = function() {
		var newParticipant = {
			name: undefined,
			email: undefined
		}

		$scope.participants.push(newParticipant);
	}
}]);