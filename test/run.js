// Sieve test suite
var http = require("http")
  , https = require("https")
  , url = require("url")
  , fs = require("fs")
  , querystring = require("querystring")
  , Sieve = require("sievejs");

var port = process.argv && process.argv.length > 2 ? process.argv[2] : 24816;

server = http
  .createServer(handler)
  .listen(port, start);

// Begin running tests
function start(){
  console.log('Test server running on port ' + port + '.');

  var folder = require('path').dirname(require.main.filename)
    , files = require("fs").readdirSync(folder + "/tests")
    , success = true;

  // Execute tests one at a time
  (function go(files, pos){
    if (pos < files.length){
      var test = require("./tests/" + files[pos]);
      run(test, go.bind(this, files, pos + 1));
    } else {
      console.log('Tests completed.');
      stop();
    }
  })(files, 0);
}

function run(test, callback){

  var string = JSON.stringify(test.json)
    , options = {
      hooks : {
        onFinish : onFinish
      },
      port : port
    }
    , success = true;

  new Sieve(string, options);

  function onFinish(result){

    if (result == test.expected){
      console.log(test.name + ' succeeded.');
    } else {
      console.log(test.name + ' failed:  Expected "' + test.expected + '" and got "' + result + '".');
      success = false;
    }

    callback(success);
  }
}

// Close server and return results
function stop(success){
  server.close();

  console.log('Test server closed.');

  process.exit(success ? 0 : 1);
}

// Request handler
function handler(request, response){

  var url = request.url
    , arr = url.split('?')
    , string = 'GET Request';

  if (request.method == 'POST'){

    // Prevent overflow
    var data = '';
    request.on('data', function(d) {
      data += d;
      if(data.length > 1e6) {
        data = "";
        response.writeHead(413, {'Content-Type': 'text/plain'}).end();
        request.connection.destroy();
      }
    });

    string = 'POST Request';
  } else {

  }

  if (arr.length > 1){
    var queries = querystring.parse(arr[1]);
    respond(response, queries);
  } else {
    respond(response, string);
  }
}

function respond(response, message){
  response.writeHead(200, { "Content-Type" : 'text' });
  response.write(message);
  response.end();
}
