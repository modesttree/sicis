
var _express = require('express'),
    _ecstatic = require('ecstatic'),
    _http = require('http'),
    _assert = require('assert'),
    _path = require('path'),
    _log = require('./log')
    _mustacheExpress = require('mustache-express')
    _socketIo = require('socket.io'),
    _repoWatcher = require('./repoWatcher'),
    _auth = require('http-auth');

require('./string-helpers')

var _hasInitialized = false;
var _options;
var _statusMessage = "Initializing...";
var _buildResult = "<div class=\"unknown\">PENDING</div>";
var _elapsedTime = null;
var _currentBuildLog = "";
var _previousBuildLog = "";
var _app;
var _server;
var _io;
var _autoBuild = true;
var _authFilePath;
var _previousLogPath;
var _currentLogPath;

module.exports.start = function (options, onFinished) {
    _assert(!_hasInitialized)

    _assert(options);
    _assert(options.sicisRootPath)
    _assert(options.port)
    _assert(options.repoPath)

    _hasInitialized = true;
    _options = options;
    _autoBuild = options.autoBuild;
    _authFilePath = options.authFilePath;
    _currentLogPath = options.currentLogPath;
    _previousLogPath = options.previousLogPath;

    _app = _express();
    _server = _http.Server(_app);
    _io = _socketIo(_server);

    _addHttpHandlers(onFinished);
    _addIoReceivers();
};

module.exports.elapsedTimeChanged = function (elapsedTime) {
    if (!_hasInitialized) {
        return;
    }

    _elapsedTime = elapsedTime;
    _io.emit('elapsedTimeChanged', elapsedTime);
}

module.exports.buildResultChanged = function (buildResult) {
    if (!_hasInitialized) {
        return;
    }

    _buildResult = buildResult;
    _io.emit('buildResultChanged', buildResult);
}

module.exports.currentBuildLogChanged = function (buildLog) {
    if (!_hasInitialized) {
        return;
    }

    _currentBuildLog = buildLog;
    _io.emit('currentBuildLogChanged', buildLog);
}

module.exports.previousBuildLogChanged = function (buildLog) {
    if (!_hasInitialized) {
        return;
    }

    _previousBuildLog = buildLog;
    _io.emit('previousBuildLogChanged', _previousBuildLog);
}

module.exports.statusChanged = function (statusMessage) {
    if (!_hasInitialized) {
        return;
    }

    _statusMessage = statusMessage;
    _io.emit('statusChanged', statusMessage);
}

module.exports.autoBuildChanged = function (autoBuild) {
    if (!_hasInitialized) {
        return;
    }

    _autoBuild = autoBuild;
    _io.emit('autoBuildChanged', autoBuild);
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

        socket.on('setAutoBuild', function(autoBuild) {
            _log.info("Received request to change auto build to {0}", autoBuild);
            _repoWatcher.setAutoBuild(autoBuild);
        });

        _io.emit('statusChanged', _statusMessage);
        _io.emit('previousBuildLogChanged', _previousBuildLog);
        _io.emit('currentBuildLogChanged', _currentBuildLog);
        _io.emit('buildResultChanged', _buildResult);
        _io.emit('elapsedTimeChanged', _elapsedTime);
        _io.emit('autoBuildChanged', _autoBuild);
    });
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
            elapsedTime: _elapsedTime,
            autoBuild: _autoBuild,
        });
    });

    if (_currentLogPath) {
        _app.get('/detailedCurrentLog.txt', function(req, res) {
            res.sendFile(_path.join(_options.repoPath, _currentLogPath));
        });
    }

    if (_previousLogPath) {
        _app.get('/detailedPreviousLog.txt', function(req, res) {
            res.sendFile(_path.join(_options.repoPath, _previousLogPath));
        });
    }

    if (_authFilePath) {
        var basic = _auth.basic({
            realm: "Sicis",
            file: _authFilePath
        });

        _app.use(_auth.connect(basic));

        _log.info("Set up basic authentication");
    }
    else {
        _log.warn("Warning: No authentication configured");
    }

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

