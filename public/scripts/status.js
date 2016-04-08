
var socket = io();

$(function() {
    $('#stopBuildButton').prop('disabled', true);

    socket.on('statusUpdated', function(value) {

        if (value == 'running') {
            $('#status').html('<div class="running">Build Running</div>');
            $('#stopBuildButton').prop('disabled', false);
            $('#triggerPollButton').prop('disabled', true);
            $('#triggerBuildButton').prop('disabled', true);
        }
        else {
            $('#stopBuildButton').prop('disabled', true);
            $('#triggerPollButton').prop('disabled', false);
            $('#triggerBuildButton').prop('disabled', false);

            if (value == 'polling') {
                $('#status').html('<div class="polling">Polling Git</div>');
            }
            else if (value == 'idle') {
                $('#status').html('<div class="idle">Idle</div>');
            }
            else {
                $('#status').html('<div class="idle">Unknown</div>');
            }
        }
    });

    socket.on('buildResultUpdated', function(value) {
        $('#buildResult').html(value);
    });

    socket.on('buildLogUpdated', function(value) {
        var log = $('#buildLogContent')[0];

        var isScrolledToBottom = log.scrollHeight - log.clientHeight <= log.scrollTop + 1;

        $('#buildLogContent').html(value);

        // scroll to bottom if isScrolledToBotto
        if (isScrolledToBottom) {
            log.scrollTop = log.scrollHeight - log.clientHeight;
        }
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

    // Always start the log at the bottom
    var log = $('#buildLogContent')[0];
    log.scrollTop = log.scrollHeight - log.clientHeight;
});
