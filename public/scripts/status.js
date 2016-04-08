
var socket = io();

$(function() {
    socket.on('statusUpdated', function(value) {
        $('#status').html(value);
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

    $('#triggerBuildButton').click(function() {
        socket.emit('forceBuild', '');
    });

    $('#triggerPollButton').click(function() {
        socket.emit('forcePoll', '');
    });

    $('#browseFilesButton').click(function() {
        window.location = "/build";
    });
});
