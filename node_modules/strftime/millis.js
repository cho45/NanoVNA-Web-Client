var strftime = require('./strftime.js');

var testDate = function() {
  for(var i = 0; i < 1000; i++){
    var dateTime = strftime("%Y-%m-%d %H:%M:%S:%L");
    console.log(dateTime);
  }
};

testDate();
