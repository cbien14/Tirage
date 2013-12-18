(function() {
	var fs = require('fs');
	var idgen = require('idgen');
	var redis = require('redis');
	var nodemailer = require("nodemailer");
	var config = require("config");

	var transport = nodemailer.createTransport("SMTP", {
	    service: config.Emailing.service,
	    auth: {
	        user: config.Emailing.user,
	        pass: config.Emailing.pass
	    }
	});
    
	var _domainName = config.Domain.fullName;

    var _redisClient = redis.createClient(config.Database.port, config.Database.host);
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

					var ttl = Math.floor((endDateTicks - now.getTime()) / 1000);
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
		    from: config.Emailing.user,
		    to: participant.email,
		    subject: "Cadeau !",
		    text: "D&eacute;couvre vite &agrave; qui tu dois offrir un cadeau ! " + _domainName + "#/" + eventId + "/" + participant.id
		}

		transport.sendMail(mailOptions, function (error, response) {
			if(error){
		        console.log(error);
		    }else{
		        console.log("Message sent: " + response.message);
		    }
		});
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

	var result = {
		select: _select,
		createEvent: _createEvent,
		getParticipant: _getParticipant
	}

	module.exports = result;
})();