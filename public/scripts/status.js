
var Sicis = (function() {

    var _public = {};

    _public.autoBuild = false;
    _public.status = null;

    var _socket = io();

    var _firstCurrentUpdate = true;
    var _firstPreviousUpdate = true;

    var $_stopBuildButton;
    var $_triggerBuildButton;
    var $_browseFilesButton;
    var $_currentLogButton;
    var $_previousLogButton;
    var $_statusDiv;
    var $_triggerPollButton;
    var $_buildResult;
    var $_currentBuildLogContent;
    var $_previousBuildLogContent;
    var $_elapsedTime;

    var _assert = function(condition) {
        if (!condition) {
            throw new Error("Assert hit!");
        }
    };

    var _updateStatusDiv = function(value) {
        if (value == 'running') {
            $_statusDiv.html('<div class="running">Build Running</div>');
            $_stopBuildButton.prop('disabled', false);
            $_triggerPollButton.prop('disabled', true);
            $_triggerBuildButton.prop('disabled', true);
        }
        else {
            $_stopBuildButton.prop('disabled', true);

            if (_public.autoBuild) {
                $_triggerPollButton.prop('disabled', false);
            }

            $_triggerBuildButton.prop('disabled', false);

            if (value == 'polling') {
                $_statusDiv.html('<div class="polling">Polling Git</div>');
            }
            else if (value == 'idle') {
                $_statusDiv.html('<div class="idle">Idle</div>');
            }
            else if (value == 'waiting') {
                $_statusDiv.html('<div class="waiting">Waiting</div>');
            }
            else {
                $_statusDiv.html('<div class="idle">Unknown</div>');
            }
        }
    };

    var _updateLog = function(logItem, logText, firstUpdate) {
        var log = logItem[0];

        var isScrolledToBottom = log.scrollHeight - log.clientHeight <= log.scrollTop + 1;

        logItem.html(logText);

        if (firstUpdate || isScrolledToBottom) {
            log.scrollTop = log.scrollHeight - log.clientHeight;
        }
    };

    var _onBuildResultChanged = function(value) {
        $_buildResult.html(value);
    };

    var _onCurrentBuildLogChanged = function(logContent) {
        _updateLog($_currentBuildLogContent, logContent, _firstCurrentUpdate);
        _firstCurrentUpdate = false;
    };

    var _onPreviousBuildLogChanged = function(logContent) {
        _updateLog($_previousBuildLogContent, logContent, _firstPreviousUpdate);
        _firstPreviousUpdate = false;
    };

    var _onElapsedTimeChanged = function(value) {
        $_elapsedTime.html(value);
    };

    var _changeDisplayedLog = function(useCurrent) {
        if (useCurrent) {
            $_currentLogButton.attr('class', 'selected');
            $_previousLogButton.attr('class', 'deselected');

            $_previousBuildLogContent.hide();
            $_currentBuildLogContent.show();
        }
        else {
            $_previousLogButton.attr('class', 'selected');
            $_currentLogButton.attr('class', 'deselected');

            $_previousBuildLogContent.show();
            $_currentBuildLogContent.hide();
        }
    };

    var _onCancelButtonClicked = function() {
        _socket.emit('stopBuild', '');
    };

    var _onTriggerBuildButtonClicked = function() {
        _socket.emit('forceBuild', '');
    };

    var _onTriggerPollButtonClicked = function() {
        _socket.emit('forcePoll', '');
    };

    var _onBrowseFilesButtonClicked = function() {
        window.location = "/build";
    };

    var _onCurrentLogButtonClicked = function() {
        _changeDisplayedLog(true);
    };

    var _onPreviousLogButtonClicked = function() {
        _changeDisplayedLog(false);
    };

    var _listenOnHtmlEvents = function() {
        $_stopBuildButton.click(_onCancelButtonClicked);
        $_triggerBuildButton.click(_onTriggerBuildButtonClicked);
        $_browseFilesButton.click(_onBrowseFilesButtonClicked);
        $_currentLogButton.click(_onCurrentLogButtonClicked);
        $_previousLogButton.click(_onPreviousLogButtonClicked);
    };

    var _onStatusChanged = function(value) {
        _updateStatusDiv(value);
    };

    var _listenOnServerEvents = function() {
        _socket.on('elapsedTimeChanged', _onElapsedTimeChanged);
        _socket.on('statusChanged', _updateStatusDiv);
        _socket.on('buildResultChanged', _onBuildResultChanged);
        _socket.on('currentBuildLogChanged', _onCurrentBuildLogChanged);
        _socket.on('previousBuildLogChanged', _onPreviousBuildLogChanged);
    };

    _public.init = function() {
        _assert(_public.status);

        $_stopBuildButton = $('#stopBuildButton');
        $_triggerBuildButton = $('#triggerBuildButton');
        $_browseFilesButton = $('#browseFilesButton');
        $_currentLogButton = $('#currentLogButton');
        $_previousLogButton = $('#previousLogButton');
        $_statusDiv = $('#status');
        $_triggerPollButton = $('#triggerPollButton');
        $_buildResult = $('#buildResult');
        $_currentBuildLogContent = $('#currentBuildLogContent');
        $_previousBuildLogContent = $('#previousBuildLogContent');
        $_elapsedTime = $('#elapsedTime');

        $_stopBuildButton.prop('disabled', true);

        _listenOnServerEvents();
        _listenOnHtmlEvents();

        _updateStatusDiv(_public.initialStatus);
    };

    return _public;
})();

$(function() {
    Sicis.init();
});
