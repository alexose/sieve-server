var http = require("http")
  , https = require("https")
  , url = require("url")
  , fs = require("fs")
  , querystring = require("querystring")
  , Sieve = require("sieve");

var port = process.argv && process.argv.length > 2 ? process.argv[2] : 3000;

http.createServer(function(request, response) {

  var queries = querystring.parse(request.url.split('?')[1]);

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

      // Suport JSONP
      new Sieve(data, finish);

    });
  } else {

    // TODO: Support normal query strings?

    // Support GET base64 failover
    if (queries.json){
      try {

        // via https://groups.google.com/forum/#!topic/nodejs/m6MQDXJNx7w
        var string = new Buffer(queries, 'base64').toString('binary') 
      } catch(e){

        //error('Could not convert query from Base64 to string.  Are you sure it\'s encoded properly?');
        error(e.toString());
        return;
      }
      new Sieve(string, finish);
    } else {
      explain(request, response);
    }
  }

  function error(string){
    respond(response, string, "text", 500);
  }
      
  function finish(results){
      
    var string = JSON.stringify(results)
      , type = "text/plain";

    if (queries.callback){
      type = "application/x-javascript"
      string = queries.callback + '(' + string + ')';
    }

    respond(response, string, type);
  }
}).listen(port, function(){
  console.log('Server running on port ' + port);
});

function explain(request, response){

  // Load HTML template
  fs.readFile('index.html', 'utf8', template)

  function template(err, html){
    try{
      fs.readFile('node_modules/sieve/README.md', 'utf8', function(err, markdown){
        
        // Render README.md
        var marked = require('marked')
          , docs = marked(markdown);

        // Insert into template
        html = html.replace('{{docs}}', docs);

        respond(response, html);
      });
    } catch(e){
      respond(response, 'Could not find Sieve library.  Did you run npm install?');
    }
  }
}

function respond(response, string, type, code){

  type = type || "text/html";
  code = code || 200;

  response.writeHead(code, {"Content-Type" : type });
  response.write(string);
  response.end();
}
