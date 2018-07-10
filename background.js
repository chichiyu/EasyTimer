const msInHour = 3600000;
const msInMin = 60000;
const msInSec = 1000;

var timer;
var length;

// resume timing after reopening browser
if (timer === undefined) {
    chrome.storage.local.get(null, function(result){
        var startTime = result['start'];
        length = result['length'];
        if (startTime !== null) {
            var minLeft = (length - (new Date().getTime() - startTime)) / msInMin;
            if (minLeft > 0) {
                chrome.alarms.create('alarm1', {delayInMinutes: minLeft});
                timer = setInterval(function() {displayTime(startTime, length);}, 1000);
            }
            else {
                chrome.storage.local.set({start: null, length: null});
            }
        }
    });
}

// notify the user time's up
chrome.alarms.onAlarm.addListener(function(alarm) {
    chrome.notifications.create('timesup', {
        type: 'basic',
        iconUrl: 'icon_128.png',
        title: 'Time\'s up!',
        message: msToString(length, "withWords") + 'is over'
    })
})

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.msg === "start") {
            var startTime = request.data[0];
            length = request.data[1];
            timer = setInterval(function() {displayTime(startTime, length);}, length / msInMin);
        } else if (request.msg === "cancelBackground") {
            clearInterval(timer);
            chrome.browserAction.setBadgeText({text: ''});
        } else if (request.msg === "restart") {
            var startTime = request.data[0];
            length = request.data[1];
            clearInterval(timer);
            timer = setInterval(function() {displayTime(startTime, length);}, length/ msInMin)
        }
    }
)

// display time passed since start
function displayTime(startTime, length) {
    var curTime = new Date().getTime();

    // with an offset such that alarm rings when hitting 0
    ms = length - (curTime - startTime) + 1000; 

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

    // display hh:mm or mm:ss for the badge depending on the remaining time
    if (ms < 3600000) {
        chrome.browserAction.setBadgeText({text: msToString(ms, "noHr")});
        chrome.browserAction.setBadgeBackgroundColor({color: "rgb(0, 153, 22)"});
    } else {
        chrome.browserAction.setBadgeText({text: msToString(ms, "noSec")});
        chrome.browserAction.setBadgeBackgroundColor({color: "RoyalBlue"});
    }
    
}

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
        return hour === 0 ? min === 0 ? sec + " s " : min + " m " + sec + 
        " s " : hour + " h " + min + " m " + sec + " s ";
    }
}

// converts a number to a string with 0 added if necessary
function toString(num) {
    var s = num < 10 ? "0" + String(num) : String(num);
    return s;
}
