
var _express = require('express'),
    _ecstatic = require('ecstatic'),
    _http = require('http'),
    _assert = require('assert'),
    _path = require('path'),
    _log = require('./log')
    _mustacheExpress = require('mustache-express')
    _socketIo = require('socket.io'),
    _repoWatcher = require('./repoWatcher');

require('./string-helpers')

var _hasInitialized = false;
var _options;
var _statusMessage = "Initializing...";
var _buildResult = "<div class=\"unknown\">PENDING</div>";
var _buildLog = "";
var _app;
var _server;
var _io;

module.exports.start = function (options, onFinished) {
    _assert(!_hasInitialized)

    _assert(options);
    _assert(options.yacisRootPath)
    _assert(options.port)
    _assert(options.repoPath)

    _hasInitialized = true;
    _options = options;

    _app = _express();
    _server = _http.Server(_app);
    _io = _socketIo(_server);

    _addHttpHandlers(onFinished);
    _addIoReceivers();
};

module.exports.setBuildResult = function (buildResult) {
    if (!_hasInitialized) {
        return;
    }

    _buildResult = buildResult;
    _io.emit('buildResultUpdated', buildResult);
}

module.exports.setBuildLog = function (buildLog) {
    if (!_hasInitialized) {
        return;
    }

    _buildLog = buildLog;
    _io.emit('buildLogUpdated', buildLog);
}

module.exports.setStatus = function (statusMessage) {
    if (!_hasInitialized) {
        return;
    }

    _statusMessage = statusMessage;
    _io.emit('statusUpdated', statusMessage);
}

var _getSourcePath = function(relativePath) {
    return _path.join(_options.yacisRootPath, relativePath)
}

var _addIoReceivers = function() {

    _io.on('connection', function(socket){
        socket.on('forceBuild', function() {
            _log.info("Received request to force trigger build");
            _repoWatcher.forceTriggerBuild();
        });

        socket.on('forcePoll', function() {
            _log.info("Received request to force poll repo");
            _repoWatcher.forcePollRepo();
        });
    });
};

var _addHttpHandlers = function(onFinished) {

    _app.engine('html', _mustacheExpress());
    _app.set('view engine', 'html');
    _app.set('views', _getSourcePath('templates'));

    // TODO - remove this for release builds
    _app.disable('view cache');

    _app.get('/status', function(req, res) {
        res.render('status', {
            status: _statusMessage,
            buildResult: _buildResult,
            buildLog: _buildLog,
            gitRepoUrl: _repoWatcher.repoUrl,
            repoPath: _options.repoPath
        });
    });

    _app.use(_express.static(_getSourcePath('public')));
    _app.use(_express.static(_getSourcePath('node_modules')));

    _app.use(_ecstatic({
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

