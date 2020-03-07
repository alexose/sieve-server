Sieve Server
============

Sieve Server is the HTTP-facing part of Sieve. It handles:

* Sieve requests made from client-side applications
* Streaming results
* The Sieve documentation and tutorial

And, in the future, will handle:

* Access control

Sieve is provided as a node module and has very minimal dependencies.  It's probably not something you want to use in production, though.  Not yet.

Usage
-----

    npm install sieve-server
    cd sieve-server
    nodejs app.js

Or, use Docker:

    docker build .
    docker run <container id>
