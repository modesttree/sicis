
require('colors');
require('./string-helpers')

var _applyFormatting = function(args) {
    return String.prototype.format.apply(args[0], Array.prototype.slice.call(args, 1));
}

module.exports = {
    trace: function() {
        console.log(_applyFormatting(arguments).cyan);
    },

    info: function() {
        console.log(_applyFormatting(arguments).white);
    },

    error: function() {
        console.log(_applyFormatting(arguments).red);
    },

    warn: function() {
        console.log(_applyFormatting(arguments).yellow);
    },

    debug: function() {
        console.log(_applyFormatting(arguments).gray);
    },
}
