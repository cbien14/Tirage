MAX_ID_TRY = 200;

var tirage = (function() {
	var fs = require('fs');
	var idgen = require('idgen');
	var redis = require('redis');
	var nodemailer = require("nodemailer");

	var transport = nodemailer.createTransport("SMTP", {
	    service: "Gmail",
	    auth: {
	        user: "EMAIL",
	        pass: "PASSWORD"
	    }
	});
    
	var _domainName = "http://192.168.0.20/tirage/";

    var _redisClient = redis.createClient();
	var _config = undefined;

	var _select = function(eventId, userId, callback) {
		_redisClient.get(eventId, function (err, eventData) {
			if(eventData) {
				eventObject = JSON.parse(eventData);
				eventObject.id = eventId;
				var target = _pick(userId, eventObject);

				callback(JSON.stringify({"name":target}));

			} else {
				callback(JSON.stringify({"code": 2, "error": "event not found", "info": err}));
			}
		});
	}

	var _pick = function(userId, eventObject) {
		var result = undefined;
		if(eventObject && eventObject.participants) {
			for(var i in eventObject.participants) {
				var currentParticipant = eventObject.participants[i];

				if(currentParticipant.id == userId) {
					var selectedParticipant = currentParticipant;

					if(selectedParticipant.target)
						return _getParticipantName(selectedParticipant.target, eventObject.participants);

					for(var j = 0; j < eventObject.pool.length * 3; j++) {
						var rand = Math.floor(Math.random() * eventObject.pool.length);

						if(eventObject.pool[rand] != selectedParticipant.id) {
							selectedParticipant.target = eventObject.pool[rand];
							eventObject.pool.splice(rand, 1);
							var endDate = new Date(eventObject.endDateTicks);
							var now = new Date();
							var ttl = Math.floor((endDate.getTime() - now.getTime()) / 1000);
							_redisClient.setex(eventObject.id, ttl, JSON.stringify(eventObject), redis.print);
							
							return _getParticipantName(selectedParticipant.target, eventObject.participants);
						}
					}
					return undefined;
				}
			}
		}
	}

	var _getParticipantName = function(id, participants) {
		for(var k in participants) {
			var pickedParticipant = eventObject.participants[k];

			if(pickedParticipant.id == id)
				return pickedParticipant.name;
		}

		return undefined;
	}

	var _createEvent = function(name, participants, endDateTicks, callback) {
		var now = new Date();
		var endDate = new Date(endDateTicks);

		if(endDate > now) {

			var newEvent = {
				name: name,
				participants: [],
				endDateTicks: endDateTicks,
				pool: []
			}

			var newEventId = idgen(25);

			if(participants.constructor && participants.constructor === Array) {
				for(var i in participants) {
					var participant = participants[i];
					participant.id = idgen(10);
					newEvent.participants.push(participant);
					newEvent.pool.push(participant.id);

					_sendEmail(participant, newEventId);
				}
			}

			_redisClient.exists(newEventId, function (err, exists) {
				if(!exists) {
					idNotFound = false;

					var ttl = Math.floor((endDate.getTime() - now.getTime()) / 1000);
					_redisClient.setex(newEventId, ttl, JSON.stringify(newEvent), redis.print);

					callback(JSON.stringify({"code":0,"event":newEventId}));
				}
			});				
		} else {
			callback(JSON.stringify({"code":2,"error":"event date incorrect", "data": {"now": now, "endDate": endDate}}));
		}
	}

	var _sendEmail = function(participant, eventId) {

		var mailOptions = {
		    from: "EMAIL",
		    to: participant.email,
		    subject: "Cadeau !",
		    text: "Découvre vite à qui tu dois offrir un cadeau ! " + _domainName + "#/" + eventId + "/" + participant.id
		}

		transport.sendMail(mailOptions);
	}

	var _getParticipant = function(eventId, userId, callback) {
		_redisClient.get(eventId, function (err, eventData) {
			if(eventData) {
				eventObject = JSON.parse(eventData);

				if(eventObject.participants) {
					for(var i in eventObject.participants) {
						var participant = eventObject.participants[i];

						if(participant.id == userId) {
							callback(JSON.stringify({"code": 0, "participant": participant, "eventName": eventObject.name}));
							return;
						}
					}
				}
				callback(JSON.stringify({"code": 1, "error": "user not found"}));
			} else {
				callback(JSON.stringify({"code": 2, "error": "event not found"}));
			}
		});
	}

	return {
		select: _select,
		createEvent: _createEvent,
		getParticipant: _getParticipant
	}
})();


var http = require('http');
var url = require('url');
var Router = require('node-simple-router');
var atob = require('atob');
var router = Router();

router.get('/select/:eventId/select/:userId', function (request, response) {
	response.writeHead(200, {'Content-Type': 'application/json', "Access-Control-Allow-Origin": "*"});
  	tirage.select(request.params.eventId, request.params.userId, function(result) {
  		response.end(result);
	});
});

router.get('/create/:data', function (request, response) {
	var parameters = JSON.parse(atob(request.params.data));

	response.writeHead(200, {'Content-Type': 'application/json', "Access-Control-Allow-Origin": "*"});
  	tirage.createEvent(parameters.eventName, parameters.participants, parameters.eventEndDate, function(result){
  		response.end(result);
  	});
});

router.get('/event/:eventId/:user', function (request, response) {
	response.writeHead(200, {'Content-Type': 'application/json', "Access-Control-Allow-Origin": "*"});
  	tirage.getParticipant(request.params.eventId, request.params.user, function(result) {
  		response.end(result);
  	});
});

router.get('/', function (request, response) {
	response.writeHead(404, {'Content-Type': 'application/json', "Access-Control-Allow-Origin": "*"});
 	response.end();
});

http.createServer(router).listen(1337);

console.log('Server running at http://127.0.0.1:1337/');