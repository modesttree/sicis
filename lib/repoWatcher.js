
var _log = require('./log'),
    _assert = require('assert'),
    _cprocess = require('child_process')
    _httpServer = require('./server');

require('./string-helpers');

var RepoPollTimeSeconds = 60;

var _execBuildCommand = function(command, args, callback) {
    _log.info("Executing '{0}' with args '{1}'", command, args);
    var child = _cprocess.spawn(command, args);

    var buildLog = '';

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', function(output) {
        buildLog += output.trim() + "\n";
        _httpServer.setBuildLog(buildLog);
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', function(output) {
        buildLog += output.trim() + "\n";
        _httpServer.setBuildLog(buildLog);
    });

    child.on('close', function(code) {
        callback(code);
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
                    callback(0);
                }
                else {
                    callback(error.code == 1);
                }
            });
    });
};

var _branchName;
var _remoteName;
var _remoteUrl;
var _buildCommand;
var _buildCommandArgs;
var _hasBuiltOnce = false;
var _hasReportedIdleState = false;
var _pollTimer;
var _buildInProgress = false;

var _runBuild = function() {
    _hasReportedIdleState = false;
    _hasBuiltOnce = true;

    _httpServer.setStatus('Updating git...')

    _cprocess.exec('git pull', function() {
        _httpServer.setStatus('Build in progress...')

        _log.info("Completed 'git pull'.  Invoking build...");

        _execBuildCommand(_buildCommand, _buildCommandArgs, function(code) {
            _log.info("Build complete!  Polling of repo resumed.");
            var succeeded = code == 0;
            _httpServer.setBuildResult(succeeded ? '<div class="success">SUCCESS</div>' : '<div class="failed">FAILED</div>')
            _buildInProgress = false;
            _delayThenPollAgain();
        });
    });
};

var _pollRepoAndInvokeBuilds = function() {

    _assert(!_buildInProgress);
    _buildInProgress = true;

    _httpServer.setStatus('Polling git repo...')
    _checkRepoForChanges(function(hasChanges) {
        if (hasChanges || !_hasBuiltOnce) {
            _log.info("Changes detected in '{0}'!  Updating repo to latest...", _remoteName);
            _runBuild();
        }
        else {
            if (!_hasReportedIdleState) {
                _hasReportedIdleState = true;
                _log.info("No changes detected in '{0}'. Returning to idle state.", _remoteName);
            }
            _buildInProgress = false;
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

    _assert(!_buildInProgress);
    _httpServer.setStatus('Idle')

    _assert(_pollTimer == null);
    // Wait a bit before polling the repo again
    _pollTimer = setTimeout(function() {
        _pollRepoAndInvokeBuilds();
        _pollTimer = null;
    }, RepoPollTimeSeconds * 1000);
};

module.exports.forceTriggerBuild = function() {
    if (_buildInProgress) {
        return;
    }

    _cancelPollTimer();
    _runBuild();
};

module.exports.repoUrl = function() {
    return _remoteUrl;
};

module.exports.forcePollRepo = function() {
    if (_buildInProgress) {
        return;
    }

    _cancelPollTimer();
    _pollRepoAndInvokeBuilds();
};

module.exports.monitorCurrentRepoForChanges = function(buildCommand, buildCommandArgs, onStarted) {
    _buildCommand = buildCommand;
    _buildCommandArgs = buildCommandArgs;

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

