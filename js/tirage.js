var TIRAGE_SERVICE_URL = "http://127.0.0.1:1337";

var tirageApp = angular.module('tirageApp', ['ngRoute']);

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

tirageApp.controller('TirageCtrl', ['$scope', '$http', '$templateCache', '$routeParams', function($scope, $http, $templateCache, $routeParams) {

	$scope.participants = [{ name: undefined, email: undefined }, { name: undefined, email: undefined }];
	$scope.eventEndDate = new Date();

	var _getEventParticipation = function(eventId, userId) {
		$http({method: "GET", 
			url: TIRAGE_SERVICE_URL,
			params: { "event": eventId, "user": userId },
			headers: {'Content-Type': 'application/json'}
		}).
		success(function(data, status) {
			if(data) {
				switch(data.code) {
					case 0:
						$scope.currentParticipant = data.participant;
						break;
				}
			}
		}).
		error(function(data, status) {
		});
	}

	if($routeParams.eventId && $routeParams.userId)
		_getEventParticipation($routeParams.eventId, $routeParams.userId);

	$scope.getGiftTarget = function() {
		if($scope.yourName) {
			$http({method: "GET", 
				url: TIRAGE_SERVICE_URL,
				params: {name: $scope.yourName}
			}).
			success(function(data, status) {
				$scope.target = data.name;
			}).
			error(function(data, status) {
			});

			$scope.yourName = undefined;
		}
	};

	$scope.newEvent = function() {
		if($scope.eventName) {
			$http({method: "POST", 
				url: TIRAGE_SERVICE_URL,
				params: { "new": $scope.eventName, "participants": $scope.participants, "endDateTicks": new Date($scope.eventEndDate).getTime() },
				headers: {'Content-Type': 'application/json'}
			}).
			success(function(data, status) {
				$scope.eventId = data.event;
			}).
			error(function(data, status) {
			});

			$scope.eventName = undefined;
			$scope.participants = [];
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