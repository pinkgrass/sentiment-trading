var vertx = require('vertx');
var console = require('vertx/console');
var container = require('vertx/container');

var eb = vertx.eventBus;
var config = container.config;

console.log('starting web server');

var server = vertx.createHttpServer();

var routeMatcher = new vertx.RouteMatcher();

routeMatcher.get('/postSentiment', function(req) {
  console.log('post sentiment');
});

routeMatcher.noMatch(function(req) {
  var file = '';
  if (req.path() == '/') {
    file = 'index.html';
  } else {
    file = req.path();
  }
  req.response.sendFile('webroot/' + file);
});

server.websocketHandler(function(socket) {

  var ebHandler = function(tick) {
    var tickStr = JSON.stringify(tick);
    console.log('ws: ' + tickStr);
    socket.writeTextFrame(tickStr);
  }

  eb.registerHandler('fx.tick', ebHandler);

  socket.closeHandler(function() {
    eb.unregisterHandler('fx.tick',ebHandler);
  });

});

server.requestHandler(routeMatcher).listen(config.port, config.host, function(err) {
  if (err) {
    console.log(err);
  } else {
    console.log('listening on '+ config.host + ':' + config.port);
  }
});
