#!/usr/bin/env node

var strftime = require('./strftime.js');
var dates = [
    '01-01-2017 00:00:00',
    '03-25-2017 00:00:00',
    '03-26-2017 00:00:00',
    '03-27-2017 00:00:00',
    '04-02-2017 00:00:00',
];
dates.forEach(function(d) {
    console.log('strftime(%U, "' + d + '") = ' + strftime('%U', new Date(d)));
});
