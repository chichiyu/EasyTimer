// get the html elements
var brestart = document.getElementById("restart");
var bpause = document.getElementById("pause");
var bcancel = document.getElementById("cancel");
var badd = document.getElementById("add");

var input = document.getElementById("input");
var inputBox = document.getElementById("inputBox");
var invalid = document.getElementById("invalid");
var output = document.getElementById("output");

var beforeGroup = document.getElementById('beforegroup');
var afterGroup = document.getElementById('aftergroup');

// constants for unit conversions
const msInHour = 3600000;
const msInMin = 60000;
const msInSec = 1000;

var originalLength; // length of the timer when first set
var length; // length of the current timer in use
var startTime; // start time of the current timer in use
var paused; // whether or not the timer is paused currently
var times; // an array containing all user specified times

// loads the time when opening popup
chrome.storage.local.get('currentTimer', function(result){
    chrome.extension.getBackgroundPage().console.log("--popup--");
    chrome.extension.getBackgroundPage().console.log(result);
    startTime = result.currentTimer.start;
    originalLength = result.currentTimer.originalLength;
    length = result.currentTimer.length;
    paused = result.currentTimer.paused;
    console.log(startTime);
    if (startTime !== null) {
        startedDisplay(length);
        if (paused) {
            bpause.innerHTML = "&#9658";
            chrome.extension.getBackgroundPage().displayTime(0, length);
            console.log(length);
        } else {
            chrome.extension.getBackgroundPage().displayTime(startTime, length + 1000);
        }
    } 
});

// get the list of times user added before
chrome.storage.local.get('time', function(result) {
    times = result.time;
    for (var time of times) {
        addTime(time / msInMin);
    }
})

// add a time button and a minus button whenever the user clicks plus
badd.onclick = function() {
    var v = input.value;
    if (times.indexOf(v * msInMin) > -1) {
        invalid.innerHTML = "You already added this time";
    } else if (v <= 0 || v >=6000) {
        invalid.innerHTML = "Please enter a number <br> 0 < x < 6000";
    } else {
        addTime(input.value); 
        storeTime(input.value);
        invalid.innerHTML = "";
    }
};

brestart.onclick = restart;

bpause.onclick = function() {
    if (paused) unpause();
    else pause();
}

bcancel.onclick = function() {
    chrome.runtime.sendMessage({
        msg: "cancelBackground",
    })
    cancel();
};

// listens to message from background page
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.msg === "timeString") {
            output.innerHTML = request.data;
        }
        if (request.msg === "cancelPopup") {
            cancel();
        }
    }
);

// restarts the timer, unpause the timer if paused
function restart() {
    output.innerHTML = chrome.extension.getBackgroundPage().msToString(originalLength, "withHr");
    chrome.alarms.clear('alarm1', function(){
        chrome.alarms.create('alarm1', {delayInMinutes: originalLength / msInMin});
    })

    startTime = new Date().getTime();
    chrome.storage.local.set({currentTimer: {start: startTime, length: originalLength, originalLength: originalLength, paused: false}});

    paused = false;
    bpause.innerHTML = "&#10074&#10074";

    chrome.runtime.sendMessage({
        msg: "restart",
        data: [startTime, originalLength]
    })

    chrome.extension.getBackgroundPage().setBadge(originalLength);    
}

// pause the timer
function pause() {
    var curTime = new Date().getTime();

    var msLeft = Math.ceil((length - (curTime - startTime)) / 1000) * 1000;
    chrome.storage.local.set({currentTimer: {start:startTime, length: msLeft, originalLength: originalLength, paused: true}});
    length = msLeft;

    chrome.alarms.clear('alarm1');
    paused = true;
    bpause.innerHTML = "&#9658"

    chrome.runtime.sendMessage({
        msg: "pause"
    })
}

// unpause the timer
function unpause() {
    startTime = new Date().getTime();

    chrome.alarms.create('alarm1', {delayInMinutes: length / msInMin});
    console.log(length);
    chrome.storage.local.set({currentTimer:{start: startTime, length: length, originalLength: originalLength, paused: false}});
    
    paused = false;
    bpause.innerHTML = "&#10074&#10074";

    chrome.runtime.sendMessage({
        msg: "start",
        data: [startTime, length, originalLength]
    })
}

// cancel the timer
function cancel() {
    endedDisplay();
    output.innerHTML = "";

    chrome.storage.local.set({currentTimer: {start: null, length: null, originalLength: null, paused: false}});
    chrome.alarms.clear('alarm1');
}

// initialize the timer (when a user selects a time)
function initialize(time) {
    startedDisplay(time);
    chrome.alarms.create('alarm1', {delayInMinutes: time / msInMin});

    startTime = new Date().getTime();
    chrome.storage.local.set({currentTimer: {start: startTime, length: time, originalLength: time, paused: false}});

    length = time;
    originalLength = time;
    paused = false;
    bpause.innerHTML = "&#10074&#10074";

    chrome.runtime.sendMessage({
        msg: "start",
        data: [startTime, time, time]
    })

}

// adds the time to the screen
function addTime(min) {
    var time = Math.floor(min * msInMin / 1000) * 1000; // round to the nearest second

    // create a new button
    var newTimeButton = document.createElement("button");
    var newTimeString = chrome.extension.getBackgroundPage().msToString(time, "withHr");
    var text = document.createTextNode(newTimeString);
    newTimeButton.appendChild(text);
    newTimeButton.classList.add("timeButton");
    newTimeButton.onclick = function() {initialize(time)};

    var newMinusButton = document.createElement("button");
    var minus = document.createTextNode("-");
    newMinusButton.appendChild(minus);
    newMinusButton.classList.add("minusButton");
    newMinusButton.onclick = function() {deleteTime(newMinusButton)};

    beforeGroup.insertBefore(newTimeButton, inputBox);
    beforeGroup.insertBefore(newMinusButton, inputBox);
}

// stores the time to google storage
function storeTime(min) {    
    var time = Math.floor(min * msInMin / 1000) * 1000;

    // store the time added
    times.push(time);
    times.sort(function(a, b) {return a - b});
    chrome.storage.local.set({time: times});
}

function deleteTime(button) {
    var parent = button.parentNode;
    var time = stringToMs(button.previousSibling.innerHTML);

    parent.removeChild(button.previousSibling);
    parent.removeChild(button);
    
    // remove the time from storage
    var index = times.indexOf(time);
    times.splice(index, 1);
    chrome.storage.local.set({time: times});
}

// convert hh:mm:ss to ms
function stringToMs(string) {
    var split = string.split(":").map(x => parseInt(x));
    return split[0] * msInHour + split[1] * msInMin + split[2] * msInSec;
}

// only display the timer and the control buttons
function startedDisplay(length) {
    beforeGroup.style.display = 'none';
    afterGroup.style.display = 'inline';
    output.innerHTML = chrome.extension.getBackgroundPage().msToString(length, "withHr");
    chrome.extension.getBackgroundPage().setBadge(length);
}

// only display the time selection buttons
function endedDisplay() {
    beforeGroup.style.display = 'inline';
    afterGroup.style.display = 'none';
}

