var bcancel = document.getElementById("cancel");
var brestart = document.getElementById("restart");
var badd = document.getElementById("add");

var input = document.getElementById("input");
var inputBox = document.getElementById("inputBox");
var invalid = document.getElementById("invalid");
var output = document.getElementById("output");

var beforeGroup = document.getElementById('beforegroup');
var afterGroup = document.getElementById('aftergroup');

const msInHour = 3600000;
const msInMin = 60000;
const msInSec = 1000;

var length; // length of the current timer in use
var times; // the times array we currently have

// loads the time when opening popup
chrome.storage.local.get('currentTimer', function(result){
    var startTime = result.currentTimer.start;
    length = result.currentTimer.length;

    if (startTime !== null) {
        startedDisplay();
        chrome.extension.getBackgroundPage().displayTime(startTime, length);
    } 
});

chrome.storage.local.get('time', function(result) {
    times = result.time;
    for (var time of times) {
        addTime(time / msInMin);
    }
})

badd.onclick = function() {
    if (input.value > 0) {
        addTime(input.value); 
        storeTime(input.value);
        invalid.style.display = "none";
    } else {
        invalid.style.display = "block";
    }
};

brestart.onclick = restart;

bcancel.onclick = function() {
    chrome.runtime.sendMessage({
        msg: "cancelBackground",
    })
    cancel();
};

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

function restart() {
    output.innerHTML = chrome.extension.getBackgroundPage().msToString(length, "withHr");
    chrome.alarms.clear('alarm1', function(){
        chrome.alarms.create('alarm1', {delayInMinutes: length / msInMin});
    })

    var startTime = new Date().getTime();
    chrome.storage.local.set({currentTimer: {start: startTime, length: length}});

    chrome.runtime.sendMessage({
        msg: "restart",
        data: [startTime, length]
    })
}

function cancel() {
    endedDisplay();
    output.innerHTML = "";

    chrome.storage.local.set({currentTimer: {start: null, length: null}});
    chrome.alarms.clear('alarm1');
}

function initialize(time) {
    startedDisplay();
    chrome.alarms.create('alarm1', {delayInMinutes: time / msInMin});

    var startTime = new Date().getTime();
    chrome.storage.local.set({currentTimer: {start: startTime, length: time}});
    length = time; // for restart
    chrome.runtime.sendMessage({
        msg: "start",
        data: [startTime, time]
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

function stringToMs(string) {
    var split = string.split(":").map(x => parseInt(x));
    return split[0] * msInHour + split[1] * msInMin + split[2] * msInSec;
}
function startedDisplay() {
    beforeGroup.style.display = 'none';
    afterGroup.style.display = 'inline';
}

function endedDisplay() {
    beforeGroup.style.display = 'inline';
    afterGroup.style.display = 'none';
}

