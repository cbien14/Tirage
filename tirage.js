FILE_NAME = "data.db"

var tirage = (function() {
	var fs = require('fs');
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

	return {
		select: _select,
		add: _add
	}
})();


var http = require('http');
var url = require('url');

http.createServer(function (req, res) {
  var request = url.parse(req.url, true);

  if(request.query.hasOwnProperty("name")) {
  	var selectedPlayer = tirage.select(request.query.name, function(result) {
  		res.writeHead(200, {'Content-Type': 'application/json'});
  		res.end(result);
  	});
  } else if(request.query.hasOwnProperty("add")) {
  	var selectedPlayer = tirage.add(request.query.add, function(result) {
  		res.writeHead(200, {'Content-Type': 'application/json'});
  		res.end(result);
  	});
  } else {
  	res.writeHead(404, {'Content-Type': 'plain/text'});
  	res.end();
  }

}).listen(1337);
console.log('Server running at http://127.0.0.1:1337/');