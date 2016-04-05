
var fs = require('fs'),
    express = require('express'),
    http = require('http');

require('./util');

var HttpServer = function(options) {
    this.options = options || {};
    this.rootPath = options.rootPath;
};

HttpServer.prototype.listen = function (port, finished) {
    var app = express();
    var server = http.Server(app);

    app.get('/status', function(req, resp) {
        var output = fs.readFileSync('templates/status.html', 'utf8');

        resp.writeHead(200, { 'Content-Type': 'text/html' });
        resp.end(output);
    });

    app.use(function(req, resp, next) {
        resp.writeHead(404, { 'Content-Type': 'text/plain' })
        resp.end('No content found - Invalid URL\n');
    });

    server.listen(port, finished);
};

exports.start = function (options, logger) {
    _logger = logger
    return new HttpServer(options);
};

