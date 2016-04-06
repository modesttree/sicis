
var _log = require('./log'),
    _assert = require('assert'),
    _cprocess = require('child_process'),
    _httpServer = require('./server'),
    _spawnargs = require('spawn-args');

require('./string-helpers');

var RepoPollTimeSeconds = 60;

var _buildLog = "";

var _clearBuildLog = function() {
    _buildLog = "";
};

var _appendToBuildLog = function(value, isError) {

    if (isError) {
        _buildLog += "<span class=\"error\">{0}</span>".format(value);
    }
    else {
        _buildLog += value;
    }

    _buildLog += "\n";

    _httpServer.setBuildLog(_buildLog);
};

var _execBuildCommand = function(command, callback) {

    var commandSplit = _spawnargs(command);

    var commandPath = commandSplit[0];
    var commandArgs = commandSplit.slice(1);

    _log.info("Executing '{0}' with args '{1}'", commandPath, commandArgs);

    var child = _cprocess.spawn(commandPath, commandArgs);

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', function(output) {
        _appendToBuildLog(output.trim(), false);
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', function(output) {
        _appendToBuildLog(output.trim(), true);
    });

    child.on('close', function(code) {
        callback(code == 0);
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

    _log.info("Invoking build command...");
    _appendToBuildLog("Invoking build command...");

    _execBuildCommand(_buildCommand, function(succeeded) {
        if (succeeded) {
            _appendToBuildLog('Build completed successfully!');
        }
        else {
            _appendToBuildLog('Build completed with errors', true);
        }
        _log.info("Build complete!  Polling of repo resumed.");

        _onBuildComplete(succeeded);
    });
};

var _updateThenRunBuild = function() {
    _hasReportedIdleState = false;
    _hasBuiltOnce = true;

    _httpServer.setStatus('Build running...')

    _clearBuildLog();
    _appendToBuildLog('Updating git...');
    _log.info('Updating git...');

    _execBuildCommand('git pull --ff-only', function(succeeded) {

        if (!succeeded) {
            _onBuildComplete(false);
            return;
        }

        _runBuild();
    });
};

var _onBuildComplete = function(succeeded) {
    _httpServer.setBuildResult(succeeded ? '<div class="success">SUCCESS</div>' : '<div class="failed">FAILED</div>')
    _pollingOrBuildInProgress = false;
    _delayThenPollAgain();
};

var _pollRepoAndInvokeBuilds = function() {

    _assert(!_pollingOrBuildInProgress);
    _pollingOrBuildInProgress = true;

    _httpServer.setStatus('Polling git repo...')

    _checkRepoForChanges(function(hasChanges) {
        if (!_hasBuiltOnce || hasChanges) {
            _updateThenRunBuild();
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
    _httpServer.setStatus('Idle')

    _assert(_pollTimer == null);
    // Wait a bit before polling the repo again
    _pollTimer = setTimeout(function() {
        _pollRepoAndInvokeBuilds();
        _pollTimer = null;
    }, RepoPollTimeSeconds * 1000);
};

module.exports.forceTriggerBuild = function() {
    if (_pollingOrBuildInProgress) {
        return;
    }

    _cancelPollTimer();
    _updateThenRunBuild();
};

module.exports.repoUrl = function() {
    return _remoteUrl;
};

module.exports.forcePollRepo = function() {
    if (_pollingOrBuildInProgress) {
        return;
    }

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

