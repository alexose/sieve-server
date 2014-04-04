var http   = require("http")
  , https  = require("https")
  , url    = require("url")
  , path   = require("path")
  , fs     = require("fs")
  , qs     = require("querystring")
  , Sieve  = require("sievejs");

var args   = process.argv || [];

var ports = {
  http   : args[2] || 3000,
  socket : args[3] || 8080
};

// Websocket interface
var WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({port: ports.socket});

wss.on('connection', function(ws){

  send('connect');

  var options = {
    hooks : {
      onStart:     start,
      onIncrement: increment,
      onFinish:    finish
    }
  };

  ws.on('message', function(data){

    send('Recieved Sieve request.  Processing... ');

    new Sieve(data, options);
  });

  function start(){
  }

  function increment(result){
    send('result', result);
  }

  function finish(results){
    send('complete');
  }

  function send(type, data){
    ws.send(JSON.stringify({
      message : type,
      data : data
    }));
  }
});

// Load HTML template
var template = fs.readFileSync('index.tmpl', 'utf8');

// HTTP interface
http.createServer(function(request, response) {

  var queries = qs.parse(request.url.split('?')[1]);

  var options = {
    hooks : {
      onFinish : finish
    }
  };

  if (request.method == 'POST'){

    // Prevent overflow
    var data = '';
    request.on('data', function(d) {
      data += d;
      if(data.length > 1e6) {
        data = "";
        respond("", null, 413);
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
      explain();
    }
  }

  function error(string){
    respond(string, "text", 500);
  }

  // TODO: authentication
  function start(result){
    respond(result.hash);
  }

  // Append a result to the outgoing stream
  function increment(result){
    console.log('increment');
  }

  // End the response
  function finish(results){

    var string = JSON.stringify(results)
      , type = "text/plain";

    // Support JSONP
    if (queries.callback){
      type = "application/x-javascript";
      string = queries.callback + '(' + string + ')';
    }

    respond(string, type);
  }

  function explain(){

    var uri = url.parse(request.url).pathname
      , filename = path.join(process.cwd(), uri);

    fs.exists(filename, function(exists) {
      if(!exists) {
        respond('Resource not found.', 'text/plain', 404);
        return;
      }

      if (fs.statSync(filename).isDirectory()) filename += '/index.html';

      fs.readFile(filename, "binary", function(err, file) {
        if(err) {
          respond('Error: ' + err + '.', 'text/plain', 500);
          return;
        }

        // Add template for html files
        var ext = filename.split('.').pop();
        if (ext.substring(0, 4) === 'html' && !request.headers['x-pjax']){
          file = template.replace('{{body}}', file);
        }

        respond(file, 'text/html', 200);
      });
    });
  }

  function respond(string, type, code){

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

}).listen(ports.http, function(){
  console.log('Server running on port ' + ports.http);
});

