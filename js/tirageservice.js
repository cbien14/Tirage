var TIRAGE_SERVICE_URL = "http://127.0.0.1:1337";
var tirageService = angular.module('tirageService', ['ngResource']);

tirageService.factory('Event', ['$resource',
function($resource){
    return $resource(TIRAGE_SERVICE_URL, { }, {
     	create: {
	      	method:'GET',
	      	params: { "new": '@eventId', "participants": '@participants', "endDateTicks": '@endDateTicks' }
	 	}
    });
}]);