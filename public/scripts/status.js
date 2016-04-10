
var socket = io();

$(function() {
    $('#stopBuildButton').prop('disabled', true);

    var _startTime = null;
    var _endTime = null;

    socket.on('setStartTime', function(value) {
        _startTime = value;
        _endTime = null;
    });

    socket.on('setEndTime', function(value) {
        _endTime = value;
    });

    var _timeDeltaToString = function(deltaTimeMilliseconds) {
        var seconds = Math.floor(deltaTimeMilliseconds / 1000);
        var minutes = Math.floor(seconds / 60);
        var hours = Math.floor(minutes / 60);

        if (seconds < 60) {
            return seconds == 1 ? "one second" : seconds + " seconds";
        }

        if (minutes < 60) {
            return minutes == 1 ? "a minute" : minutes + " minutes";
        }

        return hours <= 1 ? "an hour" : hours + " hours";
    };

    setInterval(function() {
        if (_startTime) {
            if (_endTime) {
                $('#elapsedTime').html('Total Time: ' + _timeDeltaToString(_endTime - _startTime));
            }
            else {
                $('#elapsedTime').html('Elapsed: ' + _timeDeltaToString(Date.now() - _startTime));
            }
        }
        else {
            $('#elapsedTime').html('');
        }
    }, 1000);

    socket.on('setStatus', function(value) {

        if (value == 'running') {
            $('#status').html('<div class="running">Build Running</div>');
            $('#stopBuildButton').prop('disabled', false);
            $('#triggerPollButton').prop('disabled', true);
            $('#triggerBuildButton').prop('disabled', true);
        }
        else {
            $('#stopBuildButton').prop('disabled', true);

            if (_autoBuild) {
                $('#triggerPollButton').prop('disabled', false);
            }

            $('#triggerBuildButton').prop('disabled', false);

            if (value == 'polling') {
                $('#status').html('<div class="polling">Polling Git</div>');
            }
            else if (value == 'idle') {
                $('#status').html('<div class="idle">Idle</div>');
            }
            else if (value == 'waiting') {
                $('#status').html('<div class="waiting">Waiting</div>');
            }
            else {
                $('#status').html('<div class="idle">Unknown</div>');
            }
        }
    });

    socket.on('setBuildResult', function(value) {
        $('#buildResult').html(value);
    });

    var updateLog = function(logItem, logText, firstUpdate) {
        var log = logItem[0];

        var isScrolledToBottom = log.scrollHeight - log.clientHeight <= log.scrollTop + 1;

        logItem.html(logText);

        if (firstUpdate || isScrolledToBottom) {
            log.scrollTop = log.scrollHeight - log.clientHeight;
        }
    };

    var firstCurrentUpdate = true;
    var firstPreviousUpdate = true;

    socket.on('setCurrentBuildLog', function(logContent) {
        updateLog($('#currentBuildLogContent'), logContent, firstCurrentUpdate);
        firstCurrentUpdate = false;
    });

    socket.on('setPreviousBuildLog', function(logContent) {
        updateLog($('#previousBuildLogContent'), logContent, firstPreviousUpdate);
        firstPreviousUpdate = false;
    });

    $('#stopBuildButton').click(function() {
        socket.emit('stopBuild', '');
    });

    $('#triggerBuildButton').click(function() {
        socket.emit('forceBuild', '');
    });

    $('#triggerPollButton').click(function() {
        socket.emit('forcePoll', '');
    });

    $('#browseFilesButton').click(function() {
        window.location = "/build";
    });

    var changeDisplayedLog = function(useCurrent) {
        if (useCurrent) {
            $('#currentLogButton').attr('class', 'selected');
            $('#previousLogButton').attr('class', 'deselected');

            $('#previousBuildLogContent').hide();
            $('#currentBuildLogContent').show();
        }
        else {
            $('#previousLogButton').attr('class', 'selected');
            $('#currentLogButton').attr('class', 'deselected');

            $('#previousBuildLogContent').show();
            $('#currentBuildLogContent').hide();
        }
    };

    $('#currentLogButton').click(function() {
        changeDisplayedLog(true);
    });

    $('#previousLogButton').click(function() {
        changeDisplayedLog(false);
    });
});
