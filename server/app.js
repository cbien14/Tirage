var tirage = require('./tirage_server.js');
var http = require('http');
var url = require('url');
var director = require('director');
var config = require("config");

var router = new director.http.Router({
});

function newEvent() {
	try	{
		this.res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
		var _this = this;
		tirage.createEvent(this.req.body.eventName, this.req.body.participants, this.req.body.eventEndDate, function(result){
	  		_this.res.end(result);
	  	});
  	} catch(err) {
		console.log(err);
	}
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
	try	{
		this.res.writeHead(200, {'Content-Type': 'application/json', "Access-Control-Allow-Origin": "*"});
		var _this = this;
	  	tirage.select(eventId, userId, function(result) {
	  		_this.res.end(result);
		});
	} catch(err) {
		console.log(err);
	}
}

function getParticipant(eventId, user) {
	try	{
		this.res.writeHead(200, {'Content-Type': 'application/json', "Access-Control-Allow-Origin": "*"});
		var _this = this;
	  	tirage.getParticipant(eventId, user, function(result) {
	  		_this.res.end(result);
	  	});
  	} catch(err) {
		console.log(err);
	}
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
}).listen(config.Server.port);

console.log('Server running listening to port ' + config.Server.port);