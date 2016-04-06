
var socket = io();

$(function() {
    socket.on('statusUpdated', function(value) {
        $('#status').html(value);
    });

    socket.on('buildResultUpdated', function(value) {
        $('#buildResult').html(value);
    });

    socket.on('buildLogUpdated', function(value) {
        $('#buildLogContent').html(value);
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
