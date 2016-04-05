
var portfinder = require('portfinder'),
    httpServer = require('./lib/server'),
    opener = require('opener'),
    path = require('path'),
    minimist = require('minimist');

// This will add properties like ".cyan" to string
require('colors');
require('./lib/util');

function findOpenPort(callback) {

    portfinder.basePort = 8080;
    portfinder.getPort(function (err, port) {

        if (err) {
            throw err;
        }

        callback(port);
    });
}

function exitAllOnCtrlC() {
    if (process.platform === 'win32') {
        require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        }).on('SIGINT', function () {
            process.emit('SIGINT');
        });
    }

    process.on('SIGINT', function() {
        _logger('http-server stopped.'.red);
        process.exit();
    });
}

function startApp() {

    if (_options.desiredPort) {
        startServer(_options.desiredPort);
    }
    else {
        findOpenPort(function(port) {
            startServer(port);
        });
    }

    exitAllOnCtrlC()
}

function startServer(port) {

    var serverOptions = {
        rootPath: _options.rootPath,
    };

    var server = httpServer.start(serverOptions, _logger);

    server.listen(port, function () {

        _logger('Starting up yacis server at '.yellow
            + server.rootPath.cyan
            + ' with address '.yellow
            + ('http://localhost:' + port).cyan);

        _logger('Hit CTRL-C to stop the server');

        if (_options.openBrowser) {
            opener(
                'http://localhost:{0}/status'.fmt(port),
                { command: null }
            );
        }
    });
}

var argv = minimist(process.argv.slice(2));

if (argv.h || argv.help) {
    console.log([
        "usage: yacis [options]",
        "",
        "options:",
        "  -p                 Port to use [8080]",
        "  -s                 Suppress log messages from output",
        "  -d                 Do not open browser after starting the server",
        "",
        "  -h --help          Print this list and exit."
    ].join('\n'));
    process.exit();
}

_options = {
    desiredPort: argv.p,
    isSilent: argv.s,
    rootPath: path.dirname(process.argv[1]),
    openBrowser: !argv.d,
}

_logger = _options.isSilent ? (function () {}) : console.log;

startApp()

