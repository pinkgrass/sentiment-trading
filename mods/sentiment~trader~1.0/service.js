var vertx = require('vertx');
var console = require('vertx/console');
var container = require('vertx/container');
var moment = require('./lib/moment.js');

var eb = vertx.eventBus;
var config = container.config;

// just going to work historically for the moment - need a global

console.log('starting sentiment trader...');

var leverage = config.confidenceMultiplier;
var gbp = 100000;
var usd = 100000;
var originalPositionNotInitialised = true;
var originalPosition = 0;

function reinitialise() {
  gbp = 100000;
  usd = 100000;
  originalPositionNotInitialised = true;
  originalPosition = 0;
  console.log('reinitialised trading service');
}

eb.registerHandler('sentiment.event', function(message) {

  var date = moment(message.timestamp);

  // console.log('trade: '+ message.type + ' confidence: ' + message.confidence);

  var req = {
    instrument: "GBP_USD",
    date: date
  };

  eb.send('historic.tick.request', req, function(reply) {
    if (message.type === 'buy') {
      console.log('buy: '+message.confidence * leverage + ' at ' + reply.bid);
    } else {
      console.log('sell: ' + message.confidence * leverage + ' at ' + reply.ask);
    }

    var dollarFactor = (message.type === 'buy') ? 1 : -1;
    var usdChange = dollarFactor * message.confidence * leverage;
    console.log('usd: '+usdChange);


    var gbpFactor = (message.type === 'buy') ? reply.bid : reply.ask;
    var gbpChange = (usdChange / reply.ask) * -1;
    console.log('gbp: '+ gbpChange);

    console.log('usd: '+usd + ' -> ' + (usd + usdChange));
    console.log('gbp: '+gbp + ' -> ' + (gbp + gbpChange));

    usd += usdChange;
    gbp += gbpChange;

  });

});

eb.registerHandler('timer.tick', function(event) {
  var req = {
    instrument: "GBP_USD",
    date: event
  };
  eb.send('historic.tick.request', req, function(reply) {
    var newTotal = gbp + (usd / reply.ask);

    if (originalPositionNotInitialised) {
      originalPosition = newTotal;
      originalPositionNotInitialised = false;
    }

    var response = {
      gbp: gbp,
      usd: usd,
      total: newTotal,
      pnl: (newTotal - originalPosition),
      when: event
    };
    console.log('historic pos:' + JSON.stringify(response));
    eb.publish('fx.historic.position', response);
  });

});

eb.registerHandler('reset.everything', function(message) {
  reinitialise();
});
