
var _log = require('./log'),
    _assert = require('assert'),
    _cprocess = require('child_process'),
    _httpServer = require('./server'),
    _spawnargs = require('spawn-args'),
    _escapeHtml = require('escape-html'),
    _processKill = require('tree-kill');

require('./string-helpers');

var RepoPollTimeSeconds = 60;

var _buildLog = "";
var _buildProcess = null;

var _clearBuildLog = function() {
    _httpServer.setPreviousBuildLog(_buildLog);
    _buildLog = "";
    _httpServer.setCurrentBuildLog(_buildLog);
};

var LogTypes = {
    Info: 0,
    Error: 1,
    Good: 2
};

var _appendToBuildLog = function(value, logType) {
    value = _escapeHtml(value);

    if (!logType || logType == LogTypes.Info) {
        _buildLog += value;
    }
    else if (logType == LogTypes.Error) {
        _buildLog += "<span class=\"error\">{0}</span>".format(value);
    }
    else {
        _assert(logType == LogTypes.Good);
        _buildLog += "<span class=\"good\">{0}</span>".format(value);
    }

    _httpServer.setCurrentBuildLog(_buildLog);
};

var _execBuildCommand = function(command, callback) {

    _assert(_buildProcess == null);

    _appendToBuildLog('\nExecuting: ' + command + '\n');

    var commandSplit = _spawnargs(command);

    var commandPath = commandSplit[0];
    var commandArgs = commandSplit.slice(1);

    _buildProcess = _cprocess.spawn(commandPath, commandArgs);

    _buildProcess.stdout.setEncoding('utf8');
    _buildProcess.stdout.on('data', function(output) {
        _appendToBuildLog(output);
    });

    _buildProcess.stderr.setEncoding('utf8');
    _buildProcess.stderr.on('data', function(output) {
        _appendToBuildLog(output, LogTypes.Error);
    });

    _buildProcess.on('close', function(code) {
        callback(code == 0);
        _buildProcess = null;
    });

    _buildProcess.on('error', function(err) {
        _appendToBuildLog("\nError while running '{0}': {1}\n".format(command, err.message), LogTypes.Error);
    });
};

var _execCommand = function(command, callback) {
    _cprocess.exec(command, function(error, stdout, stderr) {
        if (error != null) {
            throw error;
        }

        callback(stdout);
    });
};

var _getCurrentRemote = function(callback) {
    _execCommand('git remote show', function(stdout) {
        remotes = stdout.trim().split("\n");

        _assert(remotes.length > 0, "No remotes found when checking git repo");
        _assert(remotes.length == 1, "Found multiple remotes when checking git repo - not sure which to use");

        callback(remotes[0]);
    })
};

var _getRemoteUrl = function(callback) {
    _execCommand('git config --get remote.{0}.url'.format(_remoteName), function(stdout) {
        callback(stdout.trim());
    });
};

var _fetchRemote = function(callback) {
    _execCommand('git fetch ' + _remoteName, callback);
};

var _getCurrentBranch = function(callback) {
    _execCommand('git rev-parse --abbrev-ref HEAD', function(stdout) {
        callback(stdout.trim());
    })
};

var _checkRepoForChanges = function(callback) {
    // Need to do a fetch of the remote before doing a diff
    _fetchRemote(function() {
        _cprocess.exec(
            'git diff {0}/{1} --quiet'.format(_remoteName, _branchName),
            function(error, stdout, stderr) {
                if (error == null) {
                    callback(false);
                }
                else {
                    _assert(error.code == 1);
                    callback(true);
                }
            });
    });
};

var _branchName;
var _remoteName;
var _remoteUrl;
var _buildCommand;
var _hasBuiltOnce = false;
var _hasReportedIdleState = false;
var _pollTimer;
var _pollingOrBuildInProgress = false;

var _runBuild = function() {
    _hasReportedIdleState = false;
    _hasBuiltOnce = true;

    _log.info("Starting build...");

    _httpServer.setStatus('running')

    _clearBuildLog();

    _log.info("Invoking build command...");
    _appendToBuildLog("\nInvoking build command...\n");

    _execBuildCommand(_buildCommand, function(succeeded) {
        _onBuildComplete(succeeded);
    });
};

var _onBuildComplete = function(succeeded) {

    _log.info("Build complete!  Polling of repo resumed.");

    if (succeeded) {
        _appendToBuildLog('\nBuild completed successfully\n', LogTypes.Good);
    }
    else {
        _appendToBuildLog('\nBuild completed with errors\n', LogTypes.Error);
    }

    _httpServer.setBuildResult(succeeded ? '<div class="success">OK</div>' : '<div class="failed">BROKEN</div>')
    _pollingOrBuildInProgress = false;
    _delayThenPollAgain();
};

var _pollRepoAndInvokeBuilds = function() {

    _assert(!_pollingOrBuildInProgress);
    _pollingOrBuildInProgress = true;

    _httpServer.setStatus('polling')

    _checkRepoForChanges(function(hasChanges) {
        //if (!_hasBuiltOnce || hasChanges) {
        if (hasChanges) {
            _runBuild();
        }
        else {
            if (!_hasReportedIdleState) {
                _hasReportedIdleState = true;
                _log.info("No changes detected in '{0}'. Returning to idle state.", _remoteName);
            }
            _pollingOrBuildInProgress = false;
            _delayThenPollAgain();
        }
    })
};

var _cancelPollTimer = function() {
    if (_pollTimer != null) {
        clearTimeout(_pollTimer);
        _pollTimer = null;
    }
};

var _delayThenPollAgain = function() {

    _assert(!_pollingOrBuildInProgress);
    _httpServer.setStatus('idle')

    _assert(_pollTimer == null);
    // Wait a bit before polling the repo again
    _pollTimer = setTimeout(function() {
        _pollRepoAndInvokeBuilds();
        _pollTimer = null;
    }, RepoPollTimeSeconds * 1000);
};

module.exports.stopBuild = function(callback) {
    if (_buildProcess != null) {
        _log.info("Attempting to kill build process");
        _appendToBuildLog('\nBuild was cancelled\n', LogTypes.Error);
        _processKill(_buildProcess.pid, 'SIGTERM', callback);
    }
    else {
        callback();
    }
};

module.exports.forceTriggerBuild = function() {
    if (_pollingOrBuildInProgress) {
        return;
    }

    _cancelPollTimer();
    _runBuild();
};

module.exports.repoBranch = function() {
    return _branchName;
};

module.exports.repoUrl = function() {
    return _remoteUrl;
};

module.exports.forcePollRepo = function() {
    if (_pollingOrBuildInProgress) {
        return;
    }

    _hasReportedIdleState = false;
    _cancelPollTimer();
    _pollRepoAndInvokeBuilds();
};

module.exports.monitorCurrentRepoForChanges = function(buildCommand, onStarted) {
    _buildCommand = buildCommand;

    _getCurrentBranch(function(branchName) {
        _branchName = branchName;
        _log.info("Detected branch '{0}'", _branchName);

        _getCurrentRemote(function(remoteName) {
            _remoteName = remoteName;
            _log.info("Detected remote '{0}'", _remoteName);

            _getRemoteUrl(function(remoteUrl) {
                _remoteUrl = remoteUrl;
                _log.info("Detected remote url '{0}'", _remoteUrl);

                onStarted();
                _pollRepoAndInvokeBuilds();
            });
        });
    });
}

