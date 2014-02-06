var http = require("http")
  , https = require("https")
  , url = require("url")
  , fs = require("fs")
  , querystring = require("querystring")
  , jsonselect = require("JSONSelect");

var port = process.argv && process.argv.length > 2 ? process.argv[2] : 3008;

http.createServer(function(request, response) {

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
  
    // Handle successful post
    request.on('end', function(){

      // Suport JSONP
      var queries = querystring.parse(request.url.split('?')[1])
        , name = queries.callback || null;

      new Sieve(data, finish);

      function finish(results){
          
        var string = JSON.stringify(results)
          , type = "text/plain";

        if (name){
          type = "application/x-javascript"
          string = name + '(' + string + ')';
        }

        response.writeHead(200, { "Content-Type" : type });
        response.write(string);
        response.end();
      }

    });
  } else { 
    explain(request, response);
  }

}).listen(port, function(){
  console.log('Server running on port ' + port);
});

// Manpage  
function explain(request, response){
  
  fs.readFile('README.md', 'utf8', function (err,data) {
    if (err) {
      return console.log(err);
    }

    response.writeHead(200, {"Content-Type": "text/plain"});
    response.write(data);
    response.end();
  });
}

Sieve = function(data, cb){

  // TODO: Authentication
 
  this.json = this.parse(data);
  this.callback = cb;
  this.results = [];

  var arr = this.json
    , fetch = this.fetch.bind(this);

  // TODO: Something more clever than forEach
  if (arr && arr.length){
    arr.forEach(fetch);
  }
}

Sieve.prototype.defaults = {
  headers : {
    "User-Agent" : "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0)"
  }
}

Sieve.prototype.parse = function(data){
  try {
    var json = JSON.parse(data);

    if (this.validate(json)){
      return json;
    }
  } catch(e){
    this.error(e);
  }
}

Sieve.prototype.validate = function(json){

  if (!json.length){
    throw new Error('No URLs given.');
    return false;
  }

  return true;
}

Sieve.prototype.fetch = function(entry, pos){
  
  var self = this;

  var a = url.parse(entry.url);

  // Override default headers with user-specified headers
  var headers = JSON.parse(JSON.stringify(this.defaults.headers));

  for (var key in entry.headers){
    headers[key] = entry.headers[key]; 
  }

  var options = {
    host : a.hostname,
    port : a.port,
    path : a.pathname,
    headers : headers 
  };

  var method = a.protocol == "https:" ? https : http; 

  try {
    var request = method.request(options, function(response){
      var result = '';
      response.on('data', function(d){
        result += d;
      });

      response.on('end', function(){
        self.accumulate.call(self, entry, result, pos);
      });

    }).on("error", function(e){
      throw e; 
    });

  request.end();

  } catch(e){
    this.error(e);
  }

  return;
};

Sieve.prototype.accumulate = function (entry, result, pos){

  // Attempt to apply selector 
  if (entry.selector){

    try {
      var json = JSON.parse(result);
      result = jsonselect.match(entry.selector, json);
    } catch(e){
      this.error(e);
    }
  }

  // Run "then" instruction on each result
  // TODO: Should this be breadth first?
  if (entry.then){

    if (result.length){

      var newResults = []
        , fetch = this.fetch.bind(this)
        , cb = this.accumulate.bind(this);

      result.forEach(function(d,i){
         
        // TODO: Better cloning
        var entry = JSON.parse(JSON.stringify(entry.then));
        
        // TODO: Support $1, $2, etc.
        entry.url = entry.url.replace('$1', d);

        // Fetch & accumulate
        fetch(cb, entry, i);

      });

    }
  
  } else {
    add.call(this);
  }

  // Add result to array
  function add(){
  
    var results = this.results;

    results.push([result, pos]);
  
    // Check to see if we've accumulated all the results we need
    if (results.length === this.json.length){

      // Re-order results array to match original request
      results.sort(function(a, b){
        return a[1] > b[1] ? 1 : -1;
      });
    
      this.callback(results);
    }
  }
};


Sieve.prototype.error = function(error){

  var response = this.response;

  response.writeHead(500, {"Content-Type": "text/plain"});
  response.write(error.toString());
  response.end();
}
