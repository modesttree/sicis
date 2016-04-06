
var portfinder = require('portfinder'),
    httpServer = require('./lib/server'),
    opener = require('opener'),
    path = require('path'),
    minimist = require('minimist'),
    log = require('./lib/log'),
    repoWatcher = require('./lib/repoWatcher');

// Add .format method to strings
require('./lib/string-helpers')

var _findOpenPort = function(callback) {

    portfinder.basePort = 8080;
    portfinder.getPort(function (err, port) {

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
        log.error('http-server stopped.');
        process.exit();
    });
}

var _startApp = function() {

    _exitAllOnCtrlC()

    // Now that the server is started, start monitoring the repo
    repoWatcher.monitorCurrentRepoForChanges("build.bat", ["-bf"], function() {
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
        yacisRootPath: path.dirname(process.argv[1]),
    };

    httpServer.start(serverOptions, function () {

        log.info('Starting up yacis server for repo at "{0}"', _options.repoPath)
        log.info('Web Interface at http://localhost:{0}', port)
        log.info('Hit CTRL-C to stop the server');

        if (_options.openBrowser) {
            opener(
                'http://localhost:{0}/status'.format(port),
                { command: null }
            );
        }
    });
}

var _argv = minimist(process.argv.slice(2));

if (_argv.h || _argv.help) {
    log.info([
        "usage: yacis [options]",
        "",
        "options:",
        "  -d                 Directory to use for this yacis instance.  If not given, current directory is used. Note: Must be the root of a git repository.",
        "  -p                 Port to use [8080]",
        "  -s                 Suppress browser from auto-opening",
        "",
        "  -h --help          Print this list and exit."
    ].join('\n'));
    process.exit();
}

var _options = {
    desiredPort: _argv.p,
    repoPath: _argv.d,
    openBrowser: !_argv.s,
};

if (!_options.repoPath) {
    _options.repoPath = path.resolve('./');
}

_startApp()

