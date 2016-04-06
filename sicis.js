#!/usr/bin/env node

var _portfinder = require('portfinder'),
    _httpServer = require('./lib/server'),
    _opener = require('opener'),
    _path = require('path'),
    _minimist = require('minimist'),
    _log = require('./lib/log'),
    _repoWatcher = require('./lib/repoWatcher');

// Add .format method to strings
require('./lib/string-helpers')

var _findOpenPort = function(callback) {

    _portfinder.basePort = 8080;
    _portfinder.getPort(function (err, port) {

        if (err) {
            throw err;
        }

        callback(port);
    });
}

var _exitAllOnCtrlC = function() {
    if (process.platform === 'win32') {
        require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        }).on('SIGINT', function () {
            process.emit('SIGINT');
        });
    }

    process.on('SIGINT', function() {
        _log.error('http-server stopped.');
        process.exit();
    });
}

var _startApp = function() {

    _exitAllOnCtrlC()

    // Now that the server is started, start monitoring the repo
    _repoWatcher.monitorCurrentRepoForChanges(_options.buildCommand, function() {
        if (_options.desiredPort) {
            _startServer(_options.desiredPort);
        }
        else {
            _findOpenPort(function(port) {
                _startServer(port);
            });
        }
    });
}

var _startServer = function(port) {

    var serverOptions = {
        port: port,
        repoPath: _options.repoPath,
        sicisRootPath: _path.dirname(process.argv[1]),
    };

    _httpServer.start(serverOptions, function () {

        _log.info('Starting up sicis server for repo at "{0}"', _options.repoPath)
        _log.info('Web Interface at http://localhost:{0}', port)
        _log.info('Hit CTRL-C to stop the server');

        if (_options.openBrowser) {
            _opener(
                'http://localhost:{0}/status'.format(port),
                { command: null }
            );
        }
    });
}

var _argv = _minimist(process.argv.slice(2));

if (_argv.h || _argv.help) {
    _log.info([
        "usage: sicis [options]",
        "",
        "options:",
        "  -c                 Build command to trigger every time the repository is modified",
        "  -d                 Directory to use for this sicis instance.  If not given, current directory is used. Note: Must be the root of a git repository.",
        "  -p                 Port to use (defaults to 8080)",
        "  -s                 Do not open browser automatically after server starts",
        "",
        "  -h --help          Print this list and exit."
    ].join('\n'));
    process.exit();
}

var _options = {
    desiredPort: _argv.p,
    repoPath: _argv.d,
    openBrowser: !_argv.s,
    buildCommand: _argv.c,
};

if (!_options.repoPath) {
    _options.repoPath = _path.resolve('./');
}

if (!_options.buildCommand) {
    _log.error("Error:  Missing build command parameter");
    process.exit();
}

_startApp()

