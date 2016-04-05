
var fs = require('fs'),
    express = require('express'),
    ecstatic = require('ecstatic'),
    http = require('http'),
    assert = require('assert'),
    path = require('path'),
    log = require('./log');

require('./string-helpers')

var _addHttpHandlers = function(onFinished) {

    var app = express();
    var server = http.Server(app);

    app.get('/status', function(req, resp) {
        var output = fs.readFileSync(
            path.join(_options.yacisRootPath, 'templates/status.html'), 'utf8');

        resp.writeHead(200, { 'Content-Type': 'text/html' });
        resp.end(output);
    });

    app.use(ecstatic({
        root: _options.repoPath,
        handleError: false,
        autoIndex: false
    }));

    app.use(function(req, resp, next) {
        resp.writeHead(404, { 'Content-Type': 'text/plain' })
        resp.end('No content found - Invalid URL\n');
    });

    server.listen(_options.port, onFinished);
};

var _hasInitialized = false;
var _options;

module.exports.start = function (options, onFinished) {
    assert(!_hasInitialized)

    assert(options);
    assert(options.yacisRootPath)
    assert(options.port)
    assert(options.repoPath)

    _hasInitialized = true;
    _options = options;

    _addHttpHandlers(onFinished);
};

