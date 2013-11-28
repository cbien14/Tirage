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

					return eventObject.participants[selectedParticipant.target].name;
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

					var targetFound = false;
					while(!targetFound) {
						var rand = Math.floor(Math.random() * (participants.length + 1));

						if(rand >= participants.length)
							rand = participants.length -1;

						if(rand != +i && (participants.length % 2 == 0 || !newEvent.participants[rand] || newEvent.participants[rand].target != i)) {
							participant.target = rand;
							targetFound = true;
						}
					}
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
var director = require('director');

var router = new director.http.Router({
});

function newEvent() {
	this.res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
	var _this = this;
	tirage.createEvent(this.req.body.eventName, this.req.body.participants, this.req.body.eventEndDate, function(result){
  		_this.res.end(result);
  	});
}

function acceptEventPost() {
	this.res.writeHead(200, { 
		'Content-Type': 'application/json', 
		'Access-Control-Allow-Origin': '*', 
		'Access-Control-Allow-Methods': 'POST',
		'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept' })
	this.res.end();
}

function pickParticipantTarget(eventId, userId) {
	this.res.writeHead(200, {'Content-Type': 'application/json', "Access-Control-Allow-Origin": "*"});
	var _this = this;
  	tirage.select(eventId, userId, function(result) {
  		_this.res.end(result);
	});
}

function getParticipant(eventId, user) {
	this.res.writeHead(200, {'Content-Type': 'application/json', "Access-Control-Allow-Origin": "*"});
	var _this = this;
  	tirage.getParticipant(eventId, user, function(result) {
  		_this.res.end(result);
  	});
}

router.get('/select/:eventId/select/:userId', pickParticipantTarget);
router.get('/event/:eventId/:user', getParticipant);
router.post('/create', newEvent);
router.options('/create', acceptEventPost);

var server = http.createServer(function (req, res) {
	req.chunks = [];
	req.on('data', function (chunk) {
		req.chunks.push(chunk.toString());
	});

	router.dispatch(req, res, function (err) {
		if (err) {
			res.writeHead(404);
			res.end();
		}
	});
}).listen(1337);

console.log('Server running at http://127.0.0.1:1337/');