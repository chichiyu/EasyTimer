var b30min = document.getElementById("30min");
var b1hr = document.getElementById("1hr");
var bstart = document.getElementById('start');
var bcancel = document.getElementById("cancel");
var brestart = document.getElementById("restart");

var input = document.getElementById("input");
var output = document.getElementById("output");


const msInMin = 60000;
var length; // length of the current timer in use

// loads the time when opening popup
chrome.storage.local.get(null, function(result){
    var startTime = result['start'];
    length = result['length'];

    if (startTime !== null) {
        startedDisplay();
        chrome.extension.getBackgroundPage().displayTime(startTime, length);
    }
});

b30min.onclick = function() {
    output.innerHTML = "00:30:00";
    length = 1800000;
    initialize();
}

b1hr.onclick = function() {
    output.innerHTML = "01:00:00";
    length = 3600000;
    initialize();
}

bstart.onclick = function() {
    var min = input.value
    length = Math.floor(min * msInMin / 1000) * 1000;
    initialize();
}

brestart.onclick = restart;

bcancel.onclick = function() {
    chrome.runtime.sendMessage({
        msg: "cancelBackground",
    })
    cancel();
}

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
    chrome.storage.local.set({start: startTime})

    chrome.runtime.sendMessage({
        msg: "restart",
        data: [startTime, length]
    })
}

function cancel() {
    endedDisplay();
    output.innerHTML = "";

    chrome.storage.local.set({start: null, length: null});
    chrome.alarms.clear('alarm1');
}

function initialize() {
    startedDisplay();
    chrome.alarms.create('alarm1', {delayInMinutes: length / msInMin});

    var startTime = new Date().getTime();
    chrome.storage.local.set({start: startTime, length: length});

    chrome.runtime.sendMessage({
        msg: "start",
        data: [startTime, length]
    })
}

function startedDisplay() {
    document.getElementById('beforegroup').style.display = 'none';
    document.getElementById('aftergroup').style.display = 'inline';
}

function endedDisplay() {
    document.getElementById('beforegroup').style.display = 'inline';
    document.getElementById('aftergroup').style.display = 'none';
}

