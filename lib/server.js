
var fs = require('fs'),
    express = require('express'),
    http = require('http');

String.prototype.fmt = function() {
    var s = this,
        i = arguments.length;

    while (i--) {
        var arg = arguments[i];
        if (typeof arg === 'object') {
            arg = JSON.stringify(arg);
        }
        s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arg);
    }
    return s;
};

var HttpServer = exports.HttpServer = function(options) {
    this.options = options || {};
    this.root = './public';
    this.cache = options.cache || 3600; // in seconds.
    this.logger = options.logger || (function () {});
};

HttpServer.prototype.listen = function (port, finished) {
    var app = express();
    var server = http.Server(app);
    var options = this.options;
    var logger = this.logger;

    app.get('/', function(req, resp) {
        var output = fs.readFileSync('templates/index.html', 'utf8');

        resp.writeHead(200, { 'Content-Type': 'text/html' });
        resp.end(output);
    });

    app.use(function(req, resp, next) {
        resp.writeHead(404, { 'Content-Type': 'text/plain' })
        resp.end('No content found - Invalid URL\n');
    });

    server.listen(port, finished);
};

exports.createServer = function (options) {
    return new HttpServer(options);
};

