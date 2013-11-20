var TIRAGE_SERVICE_URL = "http://127.0.0.1:1337";

var tirageApp = angular.module('tirageApp', ['ngRoute', 'tirageService']);

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
	$scope.eventEndDate = new Date();

	var _getEventParticipation = function(eventId, userId) {
		var data = Event.getEventParticipation({ "event": eventId, "user": userId }, function() {
			switch(data.code) {
					case 0:
						$scope.currentParticipant = data.participant;
						$scope.currentEventName = data.eventName;
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
		if($scope.eventName) {

			var data = Event.create({ "new": $scope.eventName, "participants": $scope.participants, "endDateTicks": new Date($scope.eventEndDate).getTime() }, function(){
				$scope.eventName = undefined;
				$scope.participants = [];
				$scope.eventId = data.event;
			});
		}
	};

	$scope.addParticipant = function() {
		var newParticipant = {
			name: undefined,
			email: undefined
		}

		$scope.participants.push(newParticipant);
	}
}]);