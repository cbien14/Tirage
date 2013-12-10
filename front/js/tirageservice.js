var TIRAGE_SERVICE_URL = 'http://192.168.0.20:1337';
var tirageService = angular.module('tirageService', ['ngResource']);

tirageService.factory('Event', ['$resource',
function($resource){
    return $resource(TIRAGE_SERVICE_URL, {}, {
     	create: {
	      	method:'POST',
	      	url: TIRAGE_SERVICE_URL + '/create'
	 	},
	 	getEventParticipation: {
	      	method:'GET',
	      	params: { 'eventId': '@eventId', 'user': '@userId' },
	      	url: TIRAGE_SERVICE_URL + '/event/:eventId/:user'
	 	},
	 	getGiftTarget: {
	      	method:'GET',
	      	params: {'userId': '@userId', 'eventId': '@eventId'},
	      	url: TIRAGE_SERVICE_URL + '/select/:eventId/select/:userId'
	 	},
	 	getNewEvent: {
	      	method:'GET',
	      	url: TIRAGE_SERVICE_URL + '/new'
	 	}
    });
}]);