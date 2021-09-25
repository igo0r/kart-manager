//url = 'wss://www.apex-timing.com:8072/';
//let url = 'ws://www.apex-timing.com:7822/';
let url = 'ws://www.apex-timing.com:7962/';
//Url for php request +2!
// url = 'http://www.apex-timing.com/live-timing/pista-azzurra/liveajax.php?init=0&index=0&port=7824'

trackUpdates();
trackQueue();
getData();
initStorage('apex');

function getData() {
    window.getDataTask = window.setInterval(() => {
        window.myWebSocket = new WebSocket(url);
        myWebSocket.onopen = function (event) {
            let message = getInitMessage();
            myWebSocket.send(message);
        };

        myWebSocket.onmessage = function (event) {
            window.myWebSocket.close();
            parseApexData(event.data);
        }
    }, 5000);
}

function trackQueue() {
    window.queueTask = window.setInterval(() => {
        if (!isPitlaneFormVisible() && storage.queue && storage.queue.length > 0) {
            console.log("Open select kart form");
            showPitlaneForm(storage.queue[0]);
        }
    }, 3000);
}

function trackUpdates() {
    window.trackUpdatesTask = window.setInterval(() => {
        if (window.lastUpdate && (new Date() - window.lastUpdate) > 50000) {
            console.log("No data from from timing! Reloading the page");
            window.location.reload();
            showWarningToast("No data from from timing! Reload the page!");
        }
    }, 10000);
}

function parseApexData(data) {
    //console.log(data);
    //console.log(storage);
  //  console.log("Received data");
    let items = data.split('\n');
    if (data.includes('init|')) {
       // console.log("Received init data");
        let grid = items.filter(item => item.includes('grid|'));
        if (grid.length === 0) {
            console.log("Wrong init data");
            console.log(data);
            return;
        }
        let gridItems = grid[0].split('|');
        document.getElementById('apex-results').innerHTML = gridItems[2];
        let racers = document.querySelectorAll('tr:not(.head)');
        window.lastUpdate = new Date();
        racers.forEach(racer => {
            let driverCellNumber = document.querySelector("td[data-type='dr']").getAttribute('data-id');
            let lastLapCellNumber = document.querySelector("td[data-type='llp']").getAttribute('data-id');
            let kartCellNumber = document.querySelector("td[data-type='no']").getAttribute('data-id');
            let rkCellNumber = document.querySelector("td[data-type='rk']").getAttribute('data-id');
            let otrNumber = document.querySelector("td[data-type='otr']").getAttribute('data-id');

            let dataId = racer.getAttribute('data-id');
            let isPit = racer.querySelector(`td[data-id="${dataId}c1"]`).getAttribute('class');
            let teamName = racer.querySelector(`td[data-id="${dataId}${driverCellNumber}"]`).textContent;
            let stint = racer.querySelector(`td[data-id="${dataId}${otrNumber}"]`).textContent;
            let kart = racer.querySelector(`div[data-id="${dataId}${kartCellNumber}"]`).textContent;
            let position = racer.querySelector(`p[data-id="${dataId}${rkCellNumber}"]`).textContent;
            let lapTime = convertToMiliSeconds(racer.querySelector(`td[data-id="${dataId}${lastLapCellNumber}"]`).textContent);
            this.addTeamIfNotExists(dataId);
            this.addLapsForTeamIfNotExists(dataId);

            storage.teams[dataId]['id'] = dataId;
            storage.teams[dataId]['kart'] = kart;
            storage.teams[dataId]['teamName'] = !storage.teams[dataId].teamName || storage.teams[dataId].teamName === ''
                ? teamName.includes('[') ? ''
                    : teamName : storage.teams[dataId]['teamName'];

            //pitstop
            if (isPit && isPit == 'si') {
                !storage.teams[dataId]['pitstop'] ? pitStop(dataId) : '';
                storage.teams[dataId]['pitstop'] = true;
                storage.teams[dataId].laps = [];
                recalculateRating();
                return;
            }
            if (lapTime === '' || (storage.teams[dataId]['last_lap_time'] && storage.teams[dataId]['last_lap_time'] === lapTime)) {
                console.log('Same lap')
            } else {
                console.log(`#${storage.teams[dataId]['kart']} ${storage.teams[dataId]['teamName']} has new lap with time: ${lapTime}`);
                storage.teams[dataId]['last_lap_time'] = lapTime;
                storage.teams[dataId]['last_lap_time_minutes'] = this.convertToMinutes(lapTime);
                storage.teams[dataId]['pitstop'] = false;
                storage.teams[dataId]['stint'] = stint;
                storage.teams[dataId].laps.push({
                    "lap_time": lapTime,
                    "converted_lap_time": lapTime,
                    kart,
                    position
                });
                recalculateRating();
            }
        });
    }
}

function convertToMiliSeconds(time) {
    if (time.length < 2) {
        return time;
    }
    let convertedTime = 0;
    //Get milisec
    let splittedMilisec = time.split('.');
    //Get minutes and seconds
    let milliseconds = 0;
    if (splittedMilisec.length > 1) {
        milliseconds = parseInt(splittedMilisec[1]);
    }
    let splittedHM = splittedMilisec[0].split(':');
    if (splittedHM.length > 1) {
        convertedTime = parseInt(splittedHM[0]) * 60 * 1000 + parseInt(splittedHM[1]) * 1000 + milliseconds;
    } else {
        convertedTime = parseInt(splittedHM[0]) * 1000 + milliseconds;
    }

    return convertedTime;
}

function convertToMinutes(origTime) {
    let time = parseInt(origTime);
    if (!time || time < 1) {
        return origTime;
    }
    let seconds = parseInt(((time % 60000) / 1000));
    let minutes = parseInt(time / 60000);
    let millisec = (time / 1000).toString().split('.')[1] ?? '000';

    return `${minutes ?? 0}:${parseInt(seconds ?? 0) < 10 ? '0' + seconds : seconds}:${millisec}`;
}

function addLapsForTeamIfNotExists(teamName) {
    //Check racer/team has some laps
    if (!storage.teams[teamName].laps || storage.teams[teamName].laps === undefined) {
        storage.teams[teamName].laps = [];
        storage.teams[teamName]['last_lap'] = 0
    }
}

function addTeamIfNotExists(teamName) {
    if (!storage.teams[teamName] || storage.teams[teamName] === undefined) {
        storage.teams[teamName] = {}
    }
}

function recalculateRating() {
    for (let name in storage.teams) {
        storage.rating[name] = defineTeamRating(storage.teams[name]);
    }

    saveToLocalStorage();
    drawRating();
    drawLaps();
}

function defineTeamRating(val) {
    if (val.laps.length < 2) {
        let lap = val.laps.length > 0 ? val.laps[0].lap_time : 0;
        return {rating: "unknown", avg: lap, best: lap}
    }
    let time = getTimeToCompare(val.laps);
    let result = '';
    if (time < storage.classes.rocket) {
        result = 'rocket';
    } else if (time < storage.classes.good) {
        result = 'good';
    } else if (time < storage.classes.soso) {
        result = 'soso'
    } else {
        result = 'sucks'
    }

    return {
        rating: result,
        best: val.laps[0]['lap_time'],
        avg: time,
        stint: val.stint ? val.stint : 0
    }
}

function getTimeToCompare(laps) {
    if (laps.length < 3) {
        return laps[1].lap_time
    }
    laps.sort((a, b) => a.lap_time - b.lap_time);
    let maxLength = laps.length > 5 ? 5 : laps.length;
    let avg = 0;
    for (let i = 1; i < maxLength; i++) {
        avg += laps[i].lap_time;
    }
    return parseInt(avg / (maxLength - 1));
}

function drawHTML() {
    drawSettings();
    drawRating();
    drawLaps();
    drawPitlane();
}


function drawRating() {
    let data = '';
    for (let name in storage.rating) {
        data += `
<div class="col-3 col-sm-3 col-md-2 col-lg-1 border border-3 ${getBgColor(storage.rating[name].rating)}">
<button name="${name}" onclick="deleteTeamLaps(this)">🗑</button><br />
#${storage.teams[name].kart} ${storage.teams[name].teamName} ${storage.rating[name].stint && parseInt(storage.rating[name].stint) > 1800000 ? '🚨' : ''}<br />
${storage.rating[name].rating}  <br />
Best - ${this.convertToMinutes(storage.rating[name].best)}<br />
Avg - ${this.convertToMinutes(storage.rating[name].avg)}<br />
Stint - ${this.convertToMinutes(storage.rating[name].stint)} </div>`;
    }

    document.getElementById('rating').innerHTML = data;
}

function drawLaps() {
    let data = '';
    for (let name in storage.teams) {
        data += `<div class="col-3 col-sm-3 col-md-2 col-lg-1 border border-3 ${getBgColor(storage.rating[name].rating)}">
<button name="${name}" onclick="deleteTeamLaps(this)">🗑</button><br />
#${storage.teams[name].kart} - ${storage.teams[name].teamName}<br />
${storage.teams[name].laps.map(lap => this.convertToMinutes(lap['lap_time'])).join('<br/>')}</div>`;
    }

    document.getElementById('laps').innerHTML = data;
}

function deleteTeamLaps(item) {
    storage.teams[item.name].laps = [];
    recalculateRating();
}

function isPitlaneFormVisible() {
    return window.showPitlaneChoice && window.showPitlaneChoice._isShown
}

/**{rate.rating},${rate.best}, ${rate.avg}
 * Team - {name - teamId, rating - rocket, sucks..., avg - avg lap, best - best lap}
 */
function showPitlaneForm(team) {
    document.getElementById('select-row-title').innerHTML = `
    Select row for the <span class="${getBgColor(team.rating)}">#${storage.teams[team.name].kart} ${storage.teams[team.name].teamName}</span>`;
    let html = '<div class="row">';
    storage.settings.rows.forEach((row, index) => {
        html += `<button name="${index}" class="mb-2 p-3 btn btn-primary" 
onclick="setPitlaneRowForPitstop(this)"
style="color: ${row.color === '#FFFFFF' ? '#000000' : '#FFFFFF'}; 
background-color: ${row.color ?? '#FFFFFF'}" type="button">${index + 1}</button>`
    });
    html += `<button name="ignore" class="mt-5 mb-5 p-3 btn btn-primary bg-dark text-white" 
onclick="setPitlaneRowForPitstop(this)" type="button">Ignore pit</button>`;

    html += '<h3>Queue order:</h3>';
    html += '<h5>Click on kart to set it first in order!</h5>';
    storage.queue.forEach((item, index) => {
        html += `<button name="${index}" class="${getBgColor(item.rating)} mt-3 p-3 btn btn-primary" 
onclick="changeQueueOrder(this)" type="button">#${storage.teams[item.name].kart} ${storage.teams[item.name].teamName}</button>`
    });
    html += '</div>';
    document.getElementById('select-row-body').innerHTML = html;
    window.showPitlaneChoice = new bootstrap.Modal(document.getElementById('choiceModal'));
    window.showPitlaneChoice.show();
}

function changeQueueOrder(item) {
    let index = parseInt(item.name);
    if (storage.queue && storage.queue.length > index) {
        let kart = storage.queue[item.name];
        storage.queue.splice(index, 1);
        storage.queue.unshift(kart);
        saveToLocalStorage();
        window.showPitlaneChoice.hide();
    }
}

function setPitlaneRowForPitstop(item) {
    if (storage.queue && storage.queue.length > 0) {
        if (item.name !== 'ignore') {
            storage.pitlane[item.name].push(storage.queue[0]);
            storage.pitlane[item.name].shift();
        }
        storage.queue.shift();
        saveToLocalStorage();
        drawPitlane();
        window.showPitlaneChoice.hide();
    }
}

function removeKartFromPitlane() {
    let kartIndex = document.getElementById('kart-data-modal').getAttribute('name');
    if (kartIndex.length < 2 || !storage.pitlane[kartIndex[0]] || !storage.pitlane[kartIndex[0]][kartIndex[1]]) {
        console.log(`Wrong name provided ${kartIndex}`);
        return;
    }
    storage.pitlane[kartIndex[0]].splice(kartIndex[1], 1);
    storage.settings.rows[kartIndex[0]].count = storage.pitlane[kartIndex[0]].length;
    saveToLocalStorage();
    drawPitlane();
    drawSettings();
    window.showPitlaneKartForm.hide();
}

function changeKartRating(item) {
    let kartIndex = document.getElementById('kart-data-modal').getAttribute('name');
    if (kartIndex.length < 2 || !storage.pitlane[kartIndex[0]] || !storage.pitlane[kartIndex[0]][kartIndex[1]]) {
        console.log(`Wrong name provided ${kartIndex}`);
        return;
    }
    storage.pitlane[kartIndex[0]][kartIndex[1]].rating = item.value;
    saveToLocalStorage();
    drawPitlane();
    window.showPitlaneKartForm.hide();
}

function showPitlaneKartData(item) {
    if (item.name.length < 2 || !storage.pitlane[item.name[0]] || !storage.pitlane[item.name[0]][item.name[1]]) {
        console.log(`Wrong name provided ${item.name}`);
        return;
    }

    let kart = storage.pitlane[item.name[0]][item.name[1]];
    document.getElementById('kart-data-modal').setAttribute('name', item.name);
    document.getElementById(`kart-${kart.rating}`).checked = true;

    window.showPitlaneKartForm = new bootstrap.Modal(document.getElementById('pitlane-kart-data'));
    window.showPitlaneKartForm.show();
}

function drawPitlane() {
    let data = '';
    let maxLength = 0;
    storage.pitlane.forEach(row => {
        maxLength = row.length > maxLength ? row.length : maxLength;
    });
    storage.pitlane.forEach((row, index) => {
        data += '<div class="col-12 d-flex align-items-center justify-content-center">';
        data += `<input class="h-50 w-25" type="color" disabled value="${storage.settings.rows[index].color}">`;
        row.forEach((line, lineIndex) => {
            data += `<button name="${index}${lineIndex}" onclick="showPitlaneKartData(this)"
class="w-25 btn-lg m-3 p-8 btn btn-primary ${getBgColor(line.rating)}" type="button">${lineIndex + 1}</button>`;
        });
        for (let i = 0; i < maxLength - row.length; i++) {
            data += `<div class="w-25 m-3 p-8"></div>`
        }
        data += '</div>';
    });
    document.getElementById('pitlane').innerHTML = data;
}

function drawSettings() {
    document.getElementById('rocket').value = storage.classes.rocket;
    document.getElementById('good').value = storage.classes.good;
    document.getElementById('soso').value = storage.classes.soso;

    for (let i = 0; i < storage.settings.rows.length; i++) {
        storage.settings.rows[i] = storage.settings.rows[i] ? storage.settings.rows[i] : {count: 0, color: '#FFFFFF'};
    }
    document.getElementById('rows-count').value = storage.settings.rows.length;
    document.getElementById('rows-with-karts').innerHTML = '';
    let data = '';
    storage.settings.rows.forEach((kartsInRow, index) => {
        data += `<span class="input-group-text" >#${index + 1}</span>
                    <input type="text" class="form-control" placeholder="karts in row" id="row-${index}"
                           onchange="setKartsInRow(${index}, this.value)" value="${kartsInRow.count}">
                           <input type="color" class="form-control form-control-color" id="color-row-${index}" 
                           placeholder="line color" onchange="setColorInRow(${index}, this.value)" value="${kartsInRow.color}">`
    });
    document.getElementById('rows-with-karts').innerHTML = data;
    if (window.screen.width < 1680) {
        document.getElementById('rows-with-karts').classList.add('row');
    }

    saveToLocalStorage();
    drawPitlane();
}

function getBgColor(rating) {
    switch (rating) {
        case "rocket":
            return "bg-info text-dark";
        case "good":
            return "bg-success text-white";
        case "soso":
            return "bg-warning text-dark";
        case "sucks":
            return "bg-danger text-white";
        default:
            return "bg-white text-dark"
    }
}

function saveToLocalStorage(whatToSave = 'storage') {
    if (whatToSave === 'storage') {
        return localStorage.setItem('storage', JSON.stringify(storage)) ?? {};
    } else if (whatToSave === 'statistic') {
        return localStorage.setItem('statistic', JSON.stringify(statistic)) ?? {};
    }
}

function getFromLocalStorage(whatToGet = 'storage') {
    if (whatToGet === 'storage') {
        return JSON.parse(localStorage.getItem('storage'));
    } else if (whatToGet === 'statistic') {
        return JSON.parse(localStorage.getItem('statistic'));
    }
}

function reset() {
    localStorage.removeItem('storage');
    localStorage.removeItem('statistic');
    initStorage(window.storage.track);
}

//2g || Ingul
function initStorage(track) {
    let fromLocalStorage = getFromLocalStorage();
    if (fromLocalStorage) {
        window.storage = fromLocalStorage;
    } else {
        window.storage = {
            teams: {},
            rating: {},
            classes: {rocket: 52800, good: 53300, soso: 53800, sucks: 54200},
            settings: {
                rows: [{count: 3, color: '#FFFFFF'}, {count: 3, color: '#FFFFFF'}, {
                    count: 3,
                    color: '#FFFFFF'
                }]
            },
            queue: []
        };
        fillInPitlaneWithUnknown();
    }
    let statisticFromLocalStorage = getFromLocalStorage('statistic');
    if (statisticFromLocalStorage) {
        window.statistic = statisticFromLocalStorage;
    } else {
        window.statistic = {};
    }

    window.storage.track = track;
    window.lastUpdate = new Date();
    drawHTML();
    saveToLocalStorage();
    saveToLocalStorage('statistic');
}

function setColorInRow(index, value) {
    storage.settings.rows[index].color = value;
    saveToLocalStorage();
    drawSettings();
    drawPitlane();
}

function setKartsInRow(index, value) {
    storage.settings.rows[index].count = parseInt(value);
    drawSettings();
    saveToLocalStorage();
    fillInPitlaneWithUnknown(false);
    drawPitlane();
}

function setRows(value) {
    storage.settings.rows = storage.settings.rows ? storage.settings.rows : [];
    storage.settings.rows.length = parseInt(value);
    for (let i = 0; i < value; i++) {
        storage.settings.rows[i] = storage.settings.rows[i] ? storage.settings.rows[i] : {count: 0, color: '#FFFFFF'};
    }
    drawSettings();
    saveToLocalStorage();
    fillInPitlaneWithUnknown(false);
    drawPitlane();
}

function setRocket(value) {
    storage.classes.rocket = parseInt(value);
    saveToLocalStorage();
    recalculateRating();
}

function setGood(value) {
    storage.classes.good = parseInt(value);
    saveToLocalStorage();
    recalculateRating();
}

function setSoso(value) {
    storage.classes.soso = parseInt(value);
    saveToLocalStorage();
    recalculateRating();
}

function pitStop(name) {
    showToast(name);
    console.log(`${storage.teams[name].teamName} is in PIT!!!!`);
    console.log(`Set empty laps for ${storage.teams[name].teamName}`);
    storage.teams[name]['pitstop'] = true;
    storage.teams[name].laps = [];
    // addLapsToStatistics(name);
    addToPitlaneQueue(name);
}

function addLapsToStatistics(name) {
    statistic = !statistic ? {} : statistic;
    statistic[name] = statistic[name] ? statistic[name] : [];
    if (storage.teams[name] && storage.teams[name].laps) {
        statistic[name].push(
            {
                driver: storage.teams[name].driver ?? 'noname',
                stint: storage.teams[name].stint ?? 0,
                laps: storage.teams[name].laps
            }
        )
    }
    saveToLocalStorage('statistic');
}

function getInitMessage() {
    if (!storage || !storage.track) {
        return "WRONG STORAGE!";
    }
    switch (storage.track) {
        case "2g":
            return "{\"$type\":\"BcStart\",\"ClientKey\":\"2gcircuit\",\"ResourceId\":19495,\"Timing\":true,\"Notifications\":true,\"Security\":\"THIRD PARTY TV\"}";
        case "Ingul":
            return 'START 13143@ingulkart';
        case "apex":
            return "\n";
    }
}

function addToPitlaneQueue(name) {
    let rate = getTeamRating(name);
    rate.name = name;
    console.log(`Add ${storage.teams[name].teamName ?? "unknown"} team to pitlane queue with ${rate.rating},${rate.best}, ${rate.avg}`);
    storage.queue.push(rate);
    saveToLocalStorage();
}

function getTeamRating(name) {
    return storage.rating && storage.rating[name] ? storage.rating[name] : {
        kart: 'unknown',
        rating: 'unknown',
        best: 0,
        avg: 0
    };
}

function fillInPitlaneWithUnknown(rewrite = true) {
    let pit = [];
    storage.settings.rows.forEach((row, index) => {
        let rowItems = [];
        for (let i = 0; i < row.count; i++) {
            if (rewrite) {
                rowItems.push({rating: "unknown"})
            } else {
                let itemToPush = storage.pitlane && storage.pitlane[index] && storage.pitlane[index][i]
                    ? storage.pitlane[index][i]
                    : {rating: "unknown"};
                rowItems.push(itemToPush);
            }

        }
        pit.push(rowItems);
    });

    window.storage.pitlane = pit;
    saveToLocalStorage();
}

function showToast(team) {
    let rating = getTeamRating(team);
    let bgColor = getBgColor(rating.rating);

    let toastContainer = document.getElementById('toast-container');
    let toastElem = document.createElement('div');
    toastElem.setAttribute('class', `toast align-items-center ${bgColor}`);
    toastElem.setAttribute('role', 'alert');
    toastElem.setAttribute('aria-live', 'assertive');
    toastElem.setAttribute('aria-atomic', 'true');
    toastElem.innerHTML = `<div class="d-flex">
                <div class="toast-body">
                    <span id="toast-team-name">${storage.teams[team]['teamName']}</span> is in pit!
                </div>
                <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>`;
    toastContainer.append(toastElem);
    toastElem.addEventListener('hidden.bs.toast', function () {
        this.remove();
    });
    let toast = new bootstrap.Toast(toastElem);
    toast.show();
}

function showWarningToast(text) {
    let toastContainer = document.getElementById('toast-container');
    let toastElem = document.createElement('div');
    toastElem.setAttribute('class', `toast align-items-center ${getBgColor("sucks")}`);
    toastElem.setAttribute('role', 'alert');
    toastElem.setAttribute('aria-live', 'assertive');
    toastElem.setAttribute('aria-atomic', 'true');
    toastElem.innerHTML = `<div class="d-flex">
                <div class="toast-body">
                    ${text}
                </div>
                <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>`;
    toastContainer.append(toastElem);
    toastElem.addEventListener('hidden.bs.toast', function () {
        this.remove();
    });
    let toast = new bootstrap.Toast(toastElem);
    toast.show();
}
