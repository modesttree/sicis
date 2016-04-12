#!/usr/bin/env node

var _httpServer = require('./lib/server'),
    _opener = require('opener'),
    _path = require('path'),
    _log = require('./lib/log'),
    _repoWatcher = require('./lib/repoWatcher');

// Add .format method to strings
require('./lib/string-helpers')

var _sicisRootPath = _path.dirname(process.argv[1]);

var _cleanupAndExit = function() {
    _repoWatcher.stopBuild(function() {
        _log.info('Build stopped successfully');
        process.exit();
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
        _log.error('CTRL+C detected.  Exitting...');
        _cleanupAndExit();
    });
    process.on('uncaughtException', function(err) {
        _log.error('Uncaught Exception!  Exitting...');
        _log.error(err.stack);
        _cleanupAndExit();
    });
}

var _startApp = function() {

    _exitAllOnCtrlC()

    // Now that the server is started, start monitoring the repo
    _repoWatcher.start(_options.buildCommand, _options.autoBuild, _options.singleBuildOnly, _options.pollInterval, _sicisRootPath, function() {
        _startServer();
    });
}

var _startServer = function() {
    var serverOptions = {
        port: _options.desiredPort,
        repoPath: _options.repoPath,
        sicisRootPath: _sicisRootPath,
        title: _options.title,
        autoBuild: _options.autoBuild,
    };

    _httpServer.start(serverOptions, function () {

        _log.info('Starting up sicis server for repo at "{0}"', _options.repoPath)
        _log.info('Web Interface at http://localhost:{0}', serverOptions.port)
        _log.info('Hit CTRL-C to stop the server');

        if (_options.openBrowser) {
            _opener(
                'http://localhost:{0}/'.format(serverOptions.port),
                { command: null }
            );
        }
    });
}
var _argv = require('yargs')
    .usage('Usage: sicis [command] [options]')
    .example('sicis "RunBuild.bat -foo" --port 9000')

    .command('command', 'Build command to trigger every time the repository is modified')
    .demand(1)

    .describe('d', 'Directory to use for this sicis instance.  Note: Must be the root of a git repository.  Default: current directory')
    .alias('d', 'dir')

    .describe('p', 'Port to use for web interface.  Default: 8080')
    .alias('p', 'port')

    .describe('m', 'If given, do not automatically trigger builds.  Wait for explicit trigger through web interface')
    .alias('m', 'manual')

    .describe('b', 'If given, do not automatically open browser after server starts')
    .alias('b', 'browser')

    .describe('t', 'Title to use for this build on the web interface')
    .alias('t', 'title')

    .describe('s', 'If set, Sicis will only run one build job at a time.  Note: This is only relevant if you are running multiple Sicis instances on the same machine')
    .alias('s', 'singleBuildOnly')

    .describe('i', 'The amount of seconds to wait before polling the git repository again. Default: 60')
    .alias('i', 'pollInterval')

    .argv;

if (!_argv.p) {
    _argv.p = 8080;
}

if (!_argv.i) {
    _argv.i = 60;
}

if (!_argv.d) {
    _argv.d = _path.resolve('./');
}

if (!_argv.t) {
    _argv.t = "Build Server";
}

_options = {
    buildCommand: _argv._[0],
    repoPath: _argv.d,
    desiredPort: _argv.p,
    openBrowser: !_argv.b,
    title: _argv.t,
    autoBuild: !_argv.m,
    singleBuildOnly: _argv.s,
    pollInterval: _argv.i,
};

_startApp()

