
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
var _startTime = null;
var _endTime = null;
var _currentBuildLog = "";
var _previousBuildLog = "";
var _app;
var _server;
var _io;

module.exports.start = function (options, onFinished) {
    _assert(!_hasInitialized)

    _assert(options);
    _assert(options.sicisRootPath)
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

module.exports.setStartTime = function (startTime) {
    if (!_hasInitialized) {
        return;
    }

    _startTime = startTime;
    _io.emit('setStartTime', startTime);
}

module.exports.setEndTime = function (endTime) {
    if (!_hasInitialized) {
        return;
    }

    _endTime = endTime;
    _io.emit('setEndTime', endTime);
}

module.exports.setBuildResult = function (buildResult) {
    if (!_hasInitialized) {
        return;
    }

    _buildResult = buildResult;
    _io.emit('setBuildResult', buildResult);
}

module.exports.setCurrentBuildLog = function (buildLog) {
    if (!_hasInitialized) {
        return;
    }

    _currentBuildLog = buildLog;
    _io.emit('setCurrentBuildLog', buildLog);
}

module.exports.setPreviousBuildLog = function (buildLog) {
    if (!_hasInitialized) {
        return;
    }

    _previousBuildLog = buildLog;
    _io.emit('setPreviousBuildLog', buildLog, _previousBuildLog);
}

module.exports.setStatus = function (statusMessage) {
    if (!_hasInitialized) {
        return;
    }

    _statusMessage = statusMessage;
    _io.emit('setStatus', statusMessage);
}

var _getSourcePath = function(relativePath) {
    return _path.join(_options.sicisRootPath, relativePath)
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

        socket.on('stopBuild', function() {
            _log.info("Received request to stop build");
            _repoWatcher.stopBuild();
        });

        socket.emit('setStatus', _statusMessage);
        socket.emit('setCurrentBuildLog', _currentBuildLog);
        socket.emit('setPreviousBuildLog', _previousBuildLog);
        socket.emit('setBuildResult', _buildResult);
        socket.emit('setStartTime', _startTime);
        socket.emit('setEndTime', _endTime);
    });
};

var _getElapsedTime = function() {
    // TODO
    return '';
};

var _addHttpHandlers = function(onFinished) {

    _app.engine('html', _mustacheExpress());
    _app.set('view engine', 'html');
    _app.set('views', _getSourcePath('templates'));

    // TODO - remove this for release builds
    _app.disable('view cache');

    _app.get('/', function(req, res) {
        res.render('index', {
            status: _statusMessage,
            buildResult: _buildResult,
            currentBuildLog: _currentBuildLog,
            previousBuildLog: _previousBuildLog,
            gitRepoUrl: _repoWatcher.repoUrl,
            gitRepoBranch: _repoWatcher.repoBranch,
            title: _options.title,
            elapsedTime: _getElapsedTime(),
        });
    });

    _app.get('/BuildLog.txt', function(req, res) {
        res.sendFile(_path.join(_options.repoPath, "BuildLog.txt"));
    });

    _app.use(_express.static(_getSourcePath('public')));
    _app.use(_express.static(_getSourcePath('node_modules')));

    // Do we care about this?
    //_app.use(_ecstatic({
        //baseDir: 'build/',
        //root: _options.repoPath,
        //handleError: false,
        //autoIndex: false
    //}));

    _app.use(function(req, res, next) {
        res.render('404');
    });

    _server.listen(_options.port, onFinished);
};

