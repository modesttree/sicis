
var fs = require('fs'),
    express = require('express'),
    ecstatic = require('ecstatic'),
    http = require('http'),
    assert = require('assert'),
    path = require('path'),
    log = require('./log')
    mustacheExpress = require('mustache-express')
    socketIo = require('socket.io');

require('./string-helpers')

var _hasInitialized = false;
var _options;
var _statusMessage = "Initializing...";
var _buildResult = "Unknown";
var _buildLog = "";
var _app;
var _server;
var _io;

module.exports.start = function (options, onFinished) {
    assert(!_hasInitialized)

    assert(options);
    assert(options.yacisRootPath)
    assert(options.port)
    assert(options.repoPath)

    _hasInitialized = true;
    _options = options;

    _app = express();
    _server = http.Server(_app);
    _io = socketIo(_server);

    _addHttpHandlers(onFinished);
    _addIoReceivers();
};

module.exports.setBuildResult = function (buildResult) {
    _buildResult = buildResult;
    _io.emit('buildResultUpdated', buildResult);
}

module.exports.setBuildLog = function (buildLog) {
    _buildLog = buildLog;
    _io.emit('buildLogUpdated', buildLog);
}

module.exports.setStatus = function (statusMessage) {
    _statusMessage = statusMessage;
    _io.emit('statusUpdated', statusMessage);
}

var _getSourcePath = function(relativePath) {
    return path.join(_options.yacisRootPath, relativePath)
}

var _addIoReceivers = function() {
    _io.on('forceBuild', function(socket) {
        log.info("todo - force build");
    });
};

var _addHttpHandlers = function(onFinished) {

    _app.engine('html', mustacheExpress());
    _app.set('view engine', 'html');
    _app.set('views', _getSourcePath('templates'));

    // TODO - remove this for release builds
    _app.disable('view cache');

    _app.get('/status', function(req, res) {
        res.render('status', {
            status: _statusMessage,
            buildResult: _buildResult,
            buildLog: _buildLog
        });
    });

    _app.use(express.static(_getSourcePath('public')));
    _app.use(express.static(_getSourcePath('node_modules')));

    _app.use(ecstatic({
        baseDir: 'build/',
        root: _options.repoPath,
        handleError: false,
        autoIndex: false
    }));

    _app.use(function(req, res, next) {
        res.render('404');
    });

    _server.listen(_options.port, onFinished);
};

