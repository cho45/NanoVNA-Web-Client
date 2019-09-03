#!/usr/bin/env node

var strftime = require('./strftime.js');

var start = 1478415600 * 1000; // 2016-11-06 00:00:00 -0700 (PDT)
// var start = 1477782000 * 1000; // 2016-10-30 00:00:00 +0200 (Europe/Amsterdam)
var tenMinutes = 10 * 60 * 1000;
for (var i = 0; i < 18; i++) {
    var t = start + (i * tenMinutes);
    console.log('strftime.utc()("%F %T %z", ' + t + ') = ' + strftime.utc()('%F %T %z', new Date(t)));
}

// var strftime = require('./strftime.js'), su = strftime.utc();
// var start = new Date("2016-10-30 02:30:00");
// var tenMinutes = 10 * 60 * 1000, fmt = '%F %T %z';
// for (var i = 0; i < 18; i++) {
//     var t = new Date(+start + (i * tenMinutes));
//     console.log(t, strftime(fmt, t), su(fmt, t), t.getTimezoneOffset());
// }
