
var Sicis = (function() {

    // Private variables
    var _hasInitialized;

    var _autoBuild = false;
    var _status;
    var _elapsedTime;
    var _buildResult;
    var _currentBuildLog;
    var _previousBuildLog;

    var _socket = io();

    var _firstCurrentUpdate = true;
    var _firstPreviousUpdate = true;

    var $_stopBuildButton;
    var $_triggerBuildButton;
    var $_currentLogButton;
    var $_previousLogButton;
    var $_statusDiv;
    var $_triggerPollButton;
    var $_downloadLogButton;
    var $_buildResult;
    var $_currentBuildLogContent;
    var $_previousBuildLogContent;
    var $_elapsedTime;
    var $_autoBuildCheckbox;
    var $_isDisplayingCurrent = true;

    // Private methods
    var _assert = function(condition) {
        if (!condition) {
            alert("Assert hit!");
            throw new Error("Assert hit!");
        }
    };

    var _onAutoBuildChanged = function() {
        $_autoBuildCheckbox.prop('checked', _autoBuild);
    };

    var _onStatusChanged = function() {

        if (_status == 'running') {
            $_statusDiv.html('<div class="running">Build Running</div>');
            $_stopBuildButton.prop('disabled', false);
            $_triggerPollButton.prop('disabled', true);
            $_triggerBuildButton.prop('disabled', true);
        }
        else {
            $_stopBuildButton.prop('disabled', true);
            $_triggerPollButton.prop('disabled', !_autoBuild);

            $_triggerBuildButton.prop('disabled', false);

            if (_status == 'polling') {
                $_statusDiv.html('<div class="polling">Polling Git</div>');
            }
            else if (_status == 'idle') {
                $_statusDiv.html('<div class="idle">Idle</div>');
            }
            else if (_status == 'waiting') {
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

    var _onBuildResultChanged = function() {
        $_buildResult.html(_buildResult);
    };

    var _onCurrentBuildLogChanged = function() {
        _updateLog($_currentBuildLogContent, _currentBuildLog, _firstCurrentUpdate);
        _firstCurrentUpdate = false;
    };

    var _onPreviousBuildLogChanged = function() {
        _updateLog($_previousBuildLogContent, _previousBuildLog, _firstPreviousUpdate);
        _firstPreviousUpdate = false;
    };

    var _onElapsedTimeChanged = function() {
        $_elapsedTime.html(_elapsedTime);
    };

    var _changeDisplayedLog = function(useCurrent) {
        $_isDisplayingCurrent = useCurrent;
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

    var _onDownloadLogButtonClicked = function() {
        if ($_isDisplayingCurrent) {
            window.location.href = 'detailedCurrentLog.txt';
        }
        else {
            window.location.href = 'detailedPreviousLog.txt';
        }
    };

    var _onCurrentLogButtonClicked = function() {
        _changeDisplayedLog(true);
    };

    var _onPreviousLogButtonClicked = function() {
        _changeDisplayedLog(false);
    };

    var _onAutoBuildClicked = function(event) {
        event.preventDefault();
        _socket.emit('setAutoBuild', !_autoBuild);
    };

    var _listenOnHtmlEvents = function() {
        $_stopBuildButton.click(_onCancelButtonClicked);
        $_triggerBuildButton.click(_onTriggerBuildButtonClicked);
        $_triggerPollButton.click(_onTriggerPollButtonClicked);
        $_downloadLogButton.click(_onDownloadLogButtonClicked);
        $_currentLogButton.click(_onCurrentLogButtonClicked);
        $_previousLogButton.click(_onPreviousLogButtonClicked);
        $_autoBuildCheckbox.click(_onAutoBuildClicked);
    };

    var _listenOnServerEvents = function() {
        _socket.on('statusChanged', function(value) {
            _status = value;
            _onStatusChanged();
        });

        _socket.on('elapsedTimeChanged', function(value) {
            _elapsedTime = value;
            _onElapsedTimeChanged();
        });

        _socket.on('buildResultChanged', function(value) {
            _buildResult = value;
            _onBuildResultChanged();
        });

        _socket.on('currentBuildLogChanged', function(value) {
            _currentBuildLog = value;
            _onCurrentBuildLogChanged();
        });

        _socket.on('previousBuildLogChanged', function(value) {
            _previousBuildLog = value;
            _onPreviousBuildLogChanged();
        });

        _socket.on('autoBuildChanged', function(value) {
            _autoBuild = value;
            _onAutoBuildChanged();
            _onStatusChanged();
        });
    };

    // Public data
    var _pub = {};

    // Public methods
    _pub.setStatus = function(value) {
        _status = value;

        if (_hasInitialized) {
            _onStatusChanged();
        }
    };

    _pub.setAutoBuild = function(value) {
        _autoBuild = value;

        if (_hasInitialized) {
            _onAutoBuildChanged();
        }
    };

    _pub.init = function() {
        _assert(!_hasInitialized);

        _hasInitialized = true;

        $_stopBuildButton = $('#stopBuildButton');
        $_triggerBuildButton = $('#triggerBuildButton');
        $_currentLogButton = $('#currentLogButton');
        $_previousLogButton = $('#previousLogButton');
        $_statusDiv = $('#status');
        $_triggerPollButton = $('#triggerPollButton');
        $_downloadLogButton = $('#downloadLogButton');
        $_buildResult = $('#buildResult');
        $_currentBuildLogContent = $('#currentBuildLogContent');
        $_previousBuildLogContent = $('#previousBuildLogContent');
        $_elapsedTime = $('#elapsedTime');
        $_autoBuildCheckbox = $('#autoBuild');

        $_stopBuildButton.prop('disabled', true);

        _listenOnServerEvents();
        _listenOnHtmlEvents();

        _assert(_status);
        _onStatusChanged();

        _onAutoBuildChanged();
    };

    return _pub;
})();

$(function() {
    Sicis.init();
});
