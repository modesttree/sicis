
var socket = io();

$(function() {
    $('#stopBuildButton').prop('disabled', true);

    socket.on('setElapsedTime', function(value) {
        $('#elapsedTime').html(value);
    });

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
