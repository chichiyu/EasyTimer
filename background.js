const msInHour = 3600000;
const msInMin = 60000;
const msInSec = 1000;

var timer; // stores the timer used
var originalLength; // saves the original length for alarm notification

// when installed store 30 min and 1 hr to the database
chrome.runtime.onInstalled.addListener(function() {
        chrome.storage.local.get("time", function(result) {
            if (Object.keys(result).length === 0) {
                chrome.storage.local.set({time: [1800000, 3600000]});
            };
        })
})

// resume timing after reopening browser
if (timer === undefined) {
    chrome.storage.local.get('currentTimer', function(result){
        var startTime = result.currentTimer.start;
        var length = result.currentTimer.length;
        var paused = result.currentTimer.paused;
        originalLength = result.currentTimer.originalLength;
        if (startTime !== null) {
            if (!paused) {
                var minLeft = (length - (new Date().getTime() - startTime)) / msInMin;                
                if (minLeft > 0) {
                    chrome.alarms.create('alarm1', {delayInMinutes: minLeft});
                    timer = setInterval(function() {displayTime(startTime, length);}, 1000);
                    setBadge(minLeft * msinMin);
                } else {
                    chrome.storage.local.set({currentTimer: {start: null, length: null, originalLength: null, paused: false}});
                }
            } else {
                setBadge(length);
            }
        }
    });
}

// notify the user time's up
chrome.alarms.onAlarm.addListener(function(alarm) {
    chrome.notifications.create('timesup', {
        type: 'basic',
        iconUrl: 'image/icon_128.ico',
        title: 'Time\'s up!',
        message: msToString(originalLength, "withWords") + ' is over'
    })
    var sound = new Audio('alarm.mp3');
    sound.play();
})

// receive messages and act accordingly
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.msg === "start") {
            var startTime = request.data[0];
            var length = request.data[1];
            originalLength = request.data[2];
            timer = setInterval(function() {displayTime(startTime, length);}, 1000);
        } else if (request.msg === "cancelBackground") {
            clearInterval(timer);
            chrome.browserAction.setBadgeText({text: ''});
        } else if (request.msg === "restart") {
            var startTime = request.data[0];
            var length = request.data[1];
            originalLength = length;
            clearInterval(timer);
            timer = setInterval(function() {displayTime(startTime, length);}, 1000);
        } else if (request.msg === "pause") {
            clearInterval(timer);
        }
    }
)

// display time passed since start; if startTime === 0, display length;
function displayTime(startTime, length) {
    var curTime = new Date().getTime();

    // offset 500 is to make sure the setInterval function doesn't take less than 1000 ms
    var ms;
    if (startTime === 0) ms = length + 500;
    else ms = length - (curTime - startTime) + 500; 

    if (ms <= 0) {
        clearInterval(timer);
        chrome.browserAction.setBadgeText({text: ''});

        chrome.runtime.sendMessage({
            msg: "cancelPopup"
        })
        return;
    }

    // sends the timestring to the popup page
    chrome.runtime.sendMessage({
        msg: "timeString",
        data: msToString(ms, "withHr")
    })
    
    setBadge(ms);
}

// display the badge (hh:mm / mm:ss) based on the number of ms left
function setBadge(ms) {
    if (ms < 60000) {
        chrome.browserAction.setBadgeText({text: msToString(ms, "noHr")});
        chrome.browserAction.setBadgeBackgroundColor({color: "rgb(214, 23, 23)"});
    } else if (ms < 600000) {
        chrome.browserAction.setBadgeText({text: msToString(ms, "noHr")});
        chrome.browserAction.setBadgeBackgroundColor({color: "rgb(173, 163, 0)"});
    } else if (ms < 3600000) {
        chrome.browserAction.setBadgeText({text: msToString(ms, "noHr")});
        chrome.browserAction.setBadgeBackgroundColor({color: "rgb(0, 153, 22)"});
    } else {
        chrome.browserAction.setBadgeText({text: msToString(ms, "noSec")});
        chrome.browserAction.setBadgeBackgroundColor({color: "RoyalBlue"});
    }
}

// converts milliseconds to a string, with the type specified by the second parameter
function msToString(ms, type) {
    var hour = Math.floor(ms / msInHour);
    var min = Math.floor((ms % msInHour) / msInMin);
    var sec = Math.floor((ms % msInMin) / msInSec);
    if (type === "withHr")
        return toString(hour) + ":" + toString(min) + ":" + toString(sec);
    else if (type === "noHr")
        return toString(min) + ":" + toString(sec);
    else if (type === "noSec")
        return toString(hour) + ":" + toString(min);
    else if (type === "withWords") {
        var string = '';
        if (hour > 0) string += (hour + ' h');
        if (min > 0) string += (min + ' m');
        if (sec > 0) string += (sec + ' s');
        if (string === '') string = '0 s'
        return string;
    }
}

// converts a number to a string with 0 added if necessary
function toString(num) {
    var s = num < 10 ? "0" + String(num) : String(num);
    return s;
}
