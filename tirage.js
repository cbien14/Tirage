FILE_NAME = "data.db"
MAX_ID_TRY = 200;

var tirage = (function() {
	var fs = require('fs');
	var idgen = require('idgen');
	var redis = require('redis');
    
    var _redisClient = redis.createClient();
	var _config = undefined;

	var _select = function(userName, callback) {
		fs.readFile(FILE_NAME, function(err, data) {
		    if(err) {
		        callback(JSON.stringify({"code":3,"error": err}));
		    } else {
		        var raw_data = data.toString();
		        var config = JSON.parse(raw_data);
		        _config = config;

		        return _play(userName, callback);
		    }
		});
	}

	var _add = function(userName, callback) {
		fs.readFile(FILE_NAME, function(err, data) {
		    if(err) {
		        callback(JSON.stringify({"code":2,"error": err}));
		    } else {
		        var raw_data = data.toString();
		        var config = JSON.parse(raw_data);
		        _config = config;
		        if(_config.users.hasOwnProperty(userName) && _config.users[userName] != "" && _config.pool.indexOf(_config.users[userName]) == -1)
		        	_config.pool.push(_config.users[userName]);
		        _config.users[userName] = "";
		        if(_config.pool.indexOf(userName) == -1)
		        	_config.pool.push(userName);
		        _save();

		        callback(JSON.stringify({"code":0,"message":"ok"}));
		    }
		});
	}

	var _play = function(userName, callback) {
		var result = undefined;
		if(_config && _config.users && _config.users.hasOwnProperty(userName)) {
			result = _config.users[userName];

			if(result == "") {
				var notFound = true;

				while(notFound) {
					var rand = Math.floor(Math.random() * _config.pool.length);

					for(var i in _config.pool) {
						selectedUser = _config.pool[i];
		        		if(rand == i) {
		        			if(selectedUser != userName) {
		        				_config.users[userName] = selectedUser;
		        				result = selectedUser;
		        				_config.pool.splice(i, 1);
		        				notFound = false;
		        				break;
		        			}
		        		}
		        	}
				}
				_save();
			}
			callback(JSON.stringify({"name":result}));
		} else {
			callback(JSON.stringify({"code":1,"error":"user unknown"}));
		}

	}

	var _save = function() {
		var serializedConfig = JSON.stringify(_config);

		fs.writeFile(FILE_NAME, serializedConfig, function(err) {
		    if(err) {
		        console.log(err);
		    }
		}); 
	}

	var _createEvent = function(name, participants, endDateTicks, callback) {
		var now = new Date();
		var endDate = new Date(endDateTicks);

		if(endDate > now) {

			var newEvent = {
				name: name,
				participants: [],
				pool: []
			}
			if(participants.constructor === Array) {
				for(var i in participants) {
					var participant = JSON.parse(participants[i]);
					participant.id = idgen(10);
					newEvent.participants.push(participant);
					newEvent.pool.push(participant.name);
				}
			}
			var newEventId = idgen(25);

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

	var _getParticipant = function(eventId, userId, callback) {
		_redisClient.get(eventId, function (err, eventData) {
			if(eventData) {
				eventObject = JSON.parse(eventData);

				if(eventObject.participants) {
					for(var i in eventObject.participants) {
						var participant = eventObject.participants[i];

						if(participant.id == userId) {
							callback(JSON.stringify({"code": 0, "participant": participant}));
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
		add: _add,
		createEvent: _createEvent,
		getParticipant: _getParticipant
	}
})();


var http = require('http');
var url = require('url');

http.createServer(function (req, res) {
  var request = url.parse(req.url, true);

  res.writeHead(200, {'Content-Type': 'application/json', "Access-Control-Allow-Origin": "*"});
  if(request.query.hasOwnProperty("name")) {
  	tirage.select(request.query.name, function(result) {
  		res.end(result);
  	});
  } else if(request.query.hasOwnProperty("add")) {
  	tirage.add(request.query.add, function(result) {
  		res.end(result);
  	});
  } else if(request.query.hasOwnProperty("new")) {
  	var eventName = request.query.new;
  	var participants = request.query.participants;
  	var endDateTicks = +request.query.endDateTicks;

  	tirage.createEvent(eventName, participants, endDateTicks, function(result){
  		res.end(result);
  	});
  } else if(request.query.hasOwnProperty("event")) {
  	tirage.getParticipant(request.query.event, request.query.user, function(result) {
  		res.end(result);
  	});
  } else {
  	res.writeHead(404, {'Content-Type': 'plain/text', "Access-Control-Allow-Origin": "*"});
  	res.end();
  }

}).listen(1337);
console.log('Server running at http://127.0.0.1:1337/');