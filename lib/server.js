
var fs = require('fs'),
    express = require('express'),
    ecstatic = require('ecstatic'),
    http = require('http'),
    assert = require('assert'),
    path = require('path'),
    log = require('./log')
    mustacheExpress = require('mustache-express');

require('./string-helpers')

var _addHttpHandlers = function(onFinished) {

    var app = express();
    var server = http.Server(app);

    app.engine('html', mustacheExpress());
    app.set('view engine', 'html');
    app.set('views', path.join(_options.yacisRootPath, 'templates'));

    app.get('/status', function(req, res) {

        res.render('status', {
            status: _statusMessage
        });
    });

    app.use(ecstatic({
        root: _options.repoPath,
        handleError: false,
        autoIndex: false
    }));

    app.use(function(req, res, next) {
        res.render('404');
    });

    server.listen(_options.port, onFinished);
};

var _hasInitialized = false;
var _options;
var _statusMessage = "Initializing...";

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


module.exports.setStatus = function (statusMessage) {
    _statusMessage = statusMessage;
}

