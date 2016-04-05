
var argv = require('minimist')(process.argv.slice(2));

if (argv.h || argv.help) {
    console.log([
        "usage: yacis [options]",
        "",
        "options:",
        "  -p                 Port to use [8080]",
        "  -s                 Suppress log messages from output",
        "  -d                 Do not open browser after starting the server",
        "  -c                 Cache time (max-age) in seconds [3600], e.g. -c10 for 10 seconds.",
        "                     To disable caching, use -c-1.",
        "",
        "  -h --help          Print this list and exit."
    ].join('\n'));
    process.exit();
}

var portfinder = require('portfinder'),
    httpServer = require('./lib/server'),
    opener = require('opener'),
    path = require('path');

// This will add properties like ".cyan" to string
require('colors');

var port = argv.p;

var isSilent = argv.s || argv.silent;
var logger = isSilent ? (function () {}) : console.log;

if (!port) {
    portfinder.basePort = 8080;
    portfinder.getPort(function (err, port) {

        if (err) {
            throw err;
        }

        startServer(port);
    });
} else {
    startServer(port);
}

process.on('SIGINT', function() {
    logger('http-server stopped.'.red);
    process.exit();
});

function startServer(port) {

    var options = {
        root: path.dirname(process.argv[0]),
        cache: argv.c,
        logger: logger,
    };

    if (!isSilent) {
        options.onRequest = function(req, res) {
            //var date = (new Date).toUTCString();
            //logger('[%s] "%s %s" "%s"', date, req.method.cyan, req.url.cyan, req.headers['user-agent']);
        };
    };

    var server = httpServer.createServer(options);

    server.listen(port, function () {

        logger('Starting up yacis server, serving '.yellow
            + server.root.cyan
            + ' on: '.yellow
            + ('http://localhost:' + port).cyan);

        logger('Hit CTRL-C to stop the server');

        if (!argv.d) {
            opener(
                'http://localhost:' + port,
                { command: null }
            );
        }
    });
}

