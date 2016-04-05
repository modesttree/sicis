
var log = require('./log'),
    assert = require('assert'),
    cprocess = require('child_process');

require('./string-helpers');

var RepoPollTimeSeconds = 5;

var execBuildCommand = function(command, args, callback) {
    var child = cprocess.spawn(command, args);

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', function(output) {
        log.info(output.trim());
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', function(output) {
        log.error(output.trim());
    });

    child.on('close', function(code) {
        callback(code);
    });
};

var execCommand = function(command, callback) {
    cprocess.exec(command, function(error, stdout, stderr) {
        if (error != null) {
            throw error;
        }

        callback(stdout);
    });
};

var getCurrentRemote = function(callback) {
    execCommand('git remote show', function(stdout) {
        remotes = stdout.trim().split("\n");

        assert(remotes.length > 0, "No remotes found when checking git repo");
        assert(remotes.length == 1, "Found multiple remotes when checking git repo - not sure which to use");

        callback(remotes[0]);
    })
};

var fetchRemote = function(callback) {
    execCommand('git fetch ' + _remoteName, callback);
};

var getCurrentBranch = function(callback) {
    execCommand('git rev-parse --abbrev-ref HEAD', function(stdout) {
        callback(stdout.trim());
    })
};

var checkRepoForChanges = function(callback) {
    // Need to do a fetch of the remote before doing a diff
    fetchRemote(function() {
        cprocess.exec(
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
var _buildCommand;
var _buildCommandArgs;

var pollRepoAndInvokeBuilds = function() {
    checkRepoForChanges(function(hasChanges) {
        if (hasChanges) {
            log.info("Changes detected in '{0}'!  Updating repo to latest...", _remoteName);

            cprocess.exec('git pull', function() {
                log.info("Completed 'git pull'.  Invoking build...");

                execBuildCommand(_buildCommand, _buildCommandArgs, function(code) {
                    log.info("Build complete!  Polling of repo resumed.");
                    delayThenPollAgain();
                });
            });
        }
        else {
            log.info("No changes detected in '{0}'", _remoteName);
            delayThenPollAgain();
        }
    })
};

var delayThenPollAgain = function() {
    // Wait a bit before polling the repo again
    setTimeout(function() {
        pollRepoAndInvokeBuilds();
    }, RepoPollTimeSeconds * 1000);
};

module.exports.monitorCurrentRepoForChanges = function(buildCommand, buildCommandArgs) {
    _buildCommand = buildCommand;
    _buildCommandArgs = buildCommandArgs;

    getCurrentBranch(function(branchName) {
        _branchName = branchName;
        log.info("Detected branch '{0}'", _branchName);

        getCurrentRemote(function(remoteName) {
            _remoteName = remoteName;
            log.info("Detected remote '{0}'", _remoteName);

            pollRepoAndInvokeBuilds();
        })
    });
}

