var http   = require("http")
  , https  = require("https")
  , url    = require("url")
  , fs     = require("fs")
  , qs     = require("querystring")
  , Sieve  = require("sievejs");

var args   = process.argv || [];

var ports = {
  http   : args[2] || 3000,
  socket : args[3] || 8080
};

var WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({port: ports.socket});

wss.on('connection', function(ws) {
  ws.send('Sieve websocket connected.');
});

http.createServer(function(request, response) {

  var queries = qs.parse(request.url.split('?')[1]);

  var options = {};

  if (queries.streaming){
    options.hooks = {
      onStart:     sendID,
      onIncrement: stream
    };
  } else {
    options.hooks = {
      onFinish : finish
    };
  }

  if (request.method == 'POST'){

    // Prevent overflow
    var data = '';
    request.on('data', function(d) {
      data += d;
      if(data.length > 1e6) {
        data = "";
        respond(response, "", null, 413);
        request.connection.destroy();
      }
    });

    // Handle successful post
    request.on('end', function(){

      new Sieve(data, options);

    });
  } else {

    // TODO: Support normal query strings?
    var string;

    // Support GET base64 failover
    if (queries.json){
      try {

        // via https://groups.google.com/forum/#!topic/nodejs/m6MQDXJNx7w
        string = new Buffer(queries.json, 'base64').toString('binary');
      } catch(e){

        //error('Could not convert query from Base64 to string.  Are you sure it\'s encoded properly?');
        error(e.toString());
        return;
      }

      new Sieve(string, options);
    } else {
      explain(request, response);
    }
  }

  function error(string){
    respond(response, string, "text", 500);
  }

  // Respond with ID of given request.  This will allow the client to connect via socket.
  function sendID(result){
    respond('hey there');
  }

  // Append a result to the outgoing stream
  function stream(result){
    console.log('increment');
  }

  // End the response
  function end(results){

    var string = JSON.stringify(results)
      , type = "text/plain";

    // Support JSONP
    if (queries.callback){
      type = "application/x-javascript";
      string = queries.callback + '(' + string + ')';
    }

    respond(response, string, type);
  }
}).listen(ports.http, function(){
  console.log('Server running on port ' + ports.http);
});

function explain(request, response){

  // Load HTML template
  try{
    fs.readFile('index.html', 'utf8', function(err, html){
      respond(response, html);
    });
  } catch(e){
    respond(response, 'Could not find Sieve library.  Did you run npm install?');
  }
}

function respond(response, string, type, code){

  var origin = "http://alexose.github.io";

  type = type || "text/html";
  code = code || 200;

  response.writeHead(code, {
    "Content-Type": type,
    "Access-Control-Allow-Origin": origin
  });
  response.write(string);
  response.end();
}
