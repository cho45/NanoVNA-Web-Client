#!/usr/bin/env node

var assert = require('assert');
var strptime = require('../lib/micro-strptime.js').strptime;

var anyErrors = false;

assert.ok(strptime('2012', '%Y') instanceof Date);

function assertThrows(callback, message){
	try{
		callback();
	}catch(error){
		assert.ok(error);
		assert.equal(error.message, message);
		return;
	}
	throw Error("Callback didn't throw any error.");
}

assertThrows(function () {
	strptime('xxxx', '%Y-%m-%d');
}, 'Failed to parse');

assertThrows(function () {
	strptime('xxxx');
}, 'Missing format');

assertThrows(function () {
	strptime('2012', '%"unknown"');
}, 'Unknown format descripter: "unknown"');

function test (strings, date) {
	strings.forEach(function (i) {
		var actualDate;
		var expectedDate = new Date(date);
		try {
			actualDate = strptime(i.string, i.format);
			assert.equal(String(actualDate), String(expectedDate));
		} catch (e) {
			console.log("FAIL: %s: %s", i.format, i.string);
			console.log("ACTUAL: " + String(actualDate));
			console.log("EXPECTED: " + String(expectedDate)); 
			console.log(e);
			anyErrors = true;
		}
	});
}

test([
	{ string: '2012-05-05T09:00:00.00+09:00',                 format : '%Y-%m-%dT%H:%M:%S.%s%Z' },
	{ string: '20120505000000',                               format : '%Y%m%d%H%M%S' },
	{ string: '2012-05-05T09:00:00+09:00',                    format : '%Y-%m-%dT%H:%M:%S%Z' },
	{ string: '2012-05-05 09:00:00+09:00',                    format : '%Y-%m-%d %H:%M:%S%Z' },
	{ string: '2012-05-05 00:00:00+00:00',                    format : '%Y-%m-%d %H:%M:%S%Z' },
	{ string: '2012-05-05 00:00:00Z',                         format : '%Y-%m-%d %H:%M:%S%Z' },
	{ string: '05/May/2012:09:00:00 +0900',                   format : '%d/%B/%Y:%H:%M:%S %Z' },
	{ string: '05/5/2012:09:00:00 +0900',                     format : '%d/%m/%Y:%H:%M:%S %Z' },
	{ string: 'Sat, 05 May 2012 09:00:00 +0900',              format : '%A, %d %B %Y %H:%M:%S %Z' },
	{ string: 'Sat, 05 May 2012 09:00:00 +0900',              format : '%a, %d %b %Y %H:%M:%S %z' },
	{ string: 'Sat May 05 2012 09:00:00 GMT+0900 (JST)',      format : '%A %B %d %Y %H:%M:%S GMT%Z' },
	{ string: 'Saturday May 05 2012 09:00:00 GMT+0900 (JST)', format : '%A %B %d %Y %H:%M:%S GMT%Z' }
], Date.UTC(2012, 4, 5, 0, 0, 0));

// 12-hour digital clocks format
test([{ string: '2012-05-05 12:00:00 AM', format : '%Y-%m-%d %I:%M:%S %p' } ], Date.UTC(2012, 4, 5, 0, 0, 0) );
test([{ string: '2012-05-05 12:01:00 AM', format : '%Y-%m-%d %I:%M:%S %p' } ], Date.UTC(2012, 4, 5, 0, 1, 0) );
test([{ string: '2012-05-05 01:00:00 AM', format : '%Y-%m-%d %I:%M:%S %p' } ], Date.UTC(2012, 4, 5, 1, 0, 0) );
test([{ string: '2012-05-05 12:00:00 PM', format : '%Y-%m-%d %I:%M:%S %p' } ], Date.UTC(2012, 4, 5, 12, 0, 0) );
test([{ string: '2012-05-05 12:01:00 PM', format : '%Y-%m-%d %I:%M:%S %p' } ], Date.UTC(2012, 4, 5, 12, 1, 0) );
test([{ string: '2012-05-05 01:00:00 PM', format : '%Y-%m-%d %I:%M:%S %p' } ], Date.UTC(2012, 4, 5, 13, 0, 0) );

test([{ string: '2012-05-05 AM 12:00:00', format : '%Y-%m-%d %p %I:%M:%S' } ], Date.UTC(2012, 4, 5, 0, 0, 0) );
test([{ string: '2012-05-05 AM 12:01:00', format : '%Y-%m-%d %p %I:%M:%S' } ], Date.UTC(2012, 4, 5, 0, 1, 0) );
test([{ string: '2012-05-05 AM 01:00:00', format : '%Y-%m-%d %p %I:%M:%S' } ], Date.UTC(2012, 4, 5, 1, 0, 0) );
test([{ string: '2012-05-05 PM 12:00:00', format : '%Y-%m-%d %p %I:%M:%S' } ], Date.UTC(2012, 4, 5, 12, 0, 0) );
test([{ string: '2012-05-05 PM 12:01:00', format : '%Y-%m-%d %p %I:%M:%S' } ], Date.UTC(2012, 4, 5, 12, 1, 0) );
test([{ string: '2012-05-05 PM 01:00:00', format : '%Y-%m-%d %p %I:%M:%S' } ], Date.UTC(2012, 4, 5, 13, 0, 0) );

// Leap year
// https://github.com/cho45/micro-strptime.js/issues/2
test([
	{ string: '29/Feb/2016:09:00:00 +0700', format : '%d/%B/%Y:%H:%M:%S %Z' }
], new Date("2016-02-29T02:00:00Z"));

if(anyErrors){
	console.log("Tests failed.");
	process.exit(1);
}else{
	console.log("All tests passed.");
	process.exit(0);
}
