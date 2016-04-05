
String.prototype.format = function() {
    var s = this,
    i = arguments.length;

    while (i--) {
        var arg = arguments[i];
        if (typeof arg === 'object') {
            arg = JSON.stringify(arg);
        }
        s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arg);
    }
    return s;
};

