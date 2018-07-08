var b30min = document.getElementById("30min");
var bcancel = document.getElementById("cancel");
var output = document.getElementById("output");
var timer;

// loads the timer
chrome.storage.local.get('start', function(result){
    var startTime = result['start'];

    if (startTime !== null) {
        displayTime(startTime);
        b30min.innerHTML = "Restart"
        timer = setInterval(function() {displayTime(startTime);}, 1000);
    }
});

b30min.onclick = function() {
    output.innerHTML = "00:30:00";
    b30min.innerHTML = "Restart";

    var startTime = new Date().getTime();
    chrome.storage.local.set({start: startTime});
    clearInterval(timer);
    timer = setInterval(function() {displayTime(startTime);}, 1000);
}

bcancel.onclick = cancelTimer;

// display time passed since start
function displayTime(startTime) {
    const msInHour = 3600000;
    const msInMin = 60000;
    const msInSec = 1000;
    const totalMs = 1800999; // such that there is time for calculations

    var curTime = new Date().getTime();
    ms = totalMs - (curTime - startTime);

    if (ms <= 0) {
        cancelTimer();
        alert("TIME IS UP!")
        return;
    }

    var hour = Math.floor(ms / msInHour);
    var min = Math.floor((ms % msInHour) / msInMin);
    var sec = Math.floor((ms % msInMin) / msInSec);

    var time = toString(hour) + ":" + toString(min) + ":" + toString(sec);
    
    chrome.extension.getBackgroundPage().console.log(time);
    output.innerHTML = time;
}

// when a user clicks cancel or when time is up
function cancelTimer() {
    clearInterval(timer);
    output.innerHTML = "00:00:00";
    b30min.innerHTML = "30 min"
    chrome.storage.local.set({start: null}, function(){
        chrome.extension.getBackgroundPage().console.log("CLEARED")
    });
    
}

// converts a number to a string with 0 added if necessary
function toString(num) {
    var s = num < 10 ? "0" + String(num) : String(num);
    return s;
}


