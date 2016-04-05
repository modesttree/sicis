
require('colors');
require('./string-helpers')

var applyFormatting = function(args) {
    return String.prototype.format.apply(args[0], Array.prototype.slice.call(args, 1));
}

module.exports = {
    trace: function() {
        console.log(applyFormatting(arguments).cyan);
    },

    info: function() {
        console.log(applyFormatting(arguments).white);
    },

    error: function() {
        console.log(applyFormatting(arguments).red);
    },

    warn: function() {
        console.log(applyFormatting(arguments).yellow);
    },

    debug: function() {
        console.log(applyFormatting(arguments).gray);
    },
}
