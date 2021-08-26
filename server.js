initStorage();

function startUpdates() {
    clearInterval(window.updates);
    window.updates = setInterval(function () {
        if (!window.waitForResponse) {
            initStorage();
        }
    }, 1000);
}

function convertToMiliSeconds(time) {
    if(time.length < 2) {
        return time;
    }
    let convertedTime = 0;
    //Get milisec
    let splittedMilisec = time.split('.');
    //Get minutes and seconds
    let milliseconds = 0;
    if(splittedMilisec.length > 1) {
        milliseconds = parseInt(splittedMilisec[1]);
    }
    let splittedHM = splittedMilisec[0].split(':');
    if(splittedHM.length > 1) {
        convertedTime = parseInt(splittedHM[0]) * 60 * 1000 + parseInt(splittedHM[1]) * 1000 + milliseconds;
    } else {
        convertedTime = parseInt(splittedHM[1]) * 1000 + milliseconds;
    }

    return convertedTime;
}

function convertToMinutes(origTime) {
    let time = parseInt(origTime);
    if(!time || time < 1) {
        return origTime;
    }
    let seconds = parseInt(((time%60000)/1000));
    let minutes = parseInt(time/60000);
    let millisec = (time/1000).toString().split('.')[1] ?? '000';

    return `${minutes ?? 0}:${parseInt(seconds ?? 0) < 10 ? '0' + seconds : seconds}:${millisec}`;
}

function recalculateRating() {
    for (let name in storage.rating) {
        storage.rating[name].rating = getRatingByAvgTime(storage.rating[name].avg ?? 0);
        storage.rating[name].stint = storage.teams[name].stint ?? 0;
    }
}

function printResult() {
    console.log("=============TEAMS=============");
    for (let name in storage.teams) {
        console.log(`${name}: laps[ ${storage.teams[name].laps.map(lap => lap['lap_time']).join(', ')} ]`)
    }
    console.log("=============RATING=============");
    for (let name in storage.rating) {
        console.log(`Rating: ${storage.rating[name].rating}, Best lap: ${storage.rating[name].best}, Avg lap: ${storage.rating[name].avg}`)
    }
}

function drawHTML() {
    drawChance();
    drawRating();
    drawPitlane();
    drawLaps();
}


function drawRating() {
    let data = '';
    for (let name in storage.rating) {
        data += `<div class="col border border-3 ${getBgColor(storage.rating[name].rating)}">#${storage.teams[name].kart} ${name} ${storage.rating[name].stint && parseInt(storage.rating[name].stint) > 1800000 ? '🚨' : ''}<br />
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
        data += `<div class="col border border-3 ${getBgColor(storage.rating[name].rating)}">#${storage.teams[name].kart} - ${name}<br />
${storage.teams[name].laps.map(lap => this.convertToMinutes(lap['lap_time'])).join('<br/>')}</div>`;
    }

    document.getElementById('laps').innerHTML = data;
}

function drawChance() {
    let data = '<div class="row">';
    storage.chance.forEach(lane => {
        data += `<div class="col border border-3 ${getBgColor("rocket")}">Rocket - ${lane.rocket} %</div>
<div class="col border border-3 ${getBgColor("good")}">Good - ${lane.good} %</div>
<div class="col border border-3 ${getBgColor("soso")}">So-so - ${lane.soso} %</div>
<div class="col border border-3 ${getBgColor("sucks")}">Sucks - ${lane.sucks} %</div>
<div class="col border border-3 ${getBgColor("unknown")}">Unknown - ${lane.unknown} %</div>
</div><div class="row">`;
    });
    data += '</div>';

    document.getElementById('chance').innerHTML = data;
}

function drawPitlane() {
    let data = '';
    storage.pitlane.forEach(lane => {
        data += `<div class="col-sm border border-3 ${getBgColor(lane.rating)}">${lane.rating}</div>`;
    });

    document.getElementById('pitlane').innerHTML = data;
}

function getBgColor(rating) {
    switch (rating) {
        case "rocket":
            return "bg-info";
        case "good":
            return "bg-success";
        case "soso":
            return "bg-warning";
        case "sucks":
            return "bg-danger";
        default:
            return "bg-white"
    }
}

function reset() {
    resetData();
    initStorage();
}

function initStorage() {
    window.waitForResponse = true;
    window.storage = {};
    initSettings();
    let data = getData();
    data.pitlane.length = howManyKartsToKeep();
    window.storage.teams = data.teams ?? {};
    window.storage.pitlane = data.pitlane ?? [];
    window.storage.rating = data.rating ?? {};
    window.storage.chance = [];
    recalculateRating();
    recalculateChance();
    drawHTML();
    window.waitForResponse = false;
}

function initSettings() {
    storage.classes = {};
    storage.settings = {};

    storage.classes.rocket = getFromLocalStorage('rocket') ?? 0;
    storage.classes.good = getFromLocalStorage('good') ?? 0;
    storage.classes.soso = getFromLocalStorage('soso') ?? 0;

    storage.settings.rows = parseInt(getFromLocalStorage('rows')) ?? 0;
    storage.settings.count = parseInt(getFromLocalStorage('count')) ?? 0;

    if(!window.pauseSettingsUpdate) {
        document.getElementById('rocket').value = storage.classes.rocket;
        document.getElementById('good').value = storage.classes.good;
        document.getElementById('soso').value = storage.classes.soso;

        document.getElementById('rows').value = storage.settings.rows;
        document.getElementById('count').value = storage.settings.count;
    }
}

function pauseUpdate() {
    window.pauseSettingsUpdate = true;
}

function saveToLocalStorage(name, value) {
    return localStorage.setItem(name, value);
}

function getFromLocalStorage(name) {
    return localStorage.getItem(name);
}

function setRows(value) {
    window.pauseSettingsUpdate = false;
    storage.settings.rows = parseInt(value);
    saveToLocalStorage('rows', value);
    initStorage();
}

function setCountInRow(value) {
    window.pauseSettingsUpdate = false;
    saveToLocalStorage('count', value);
    storage.settings.count = parseInt(value);
    initStorage();
}

function setRocket(value) {
    window.pauseSettingsUpdate = false;
    saveToLocalStorage('rocket', value);
    storage.classes.rocket = parseInt(value);
    initStorage();
}

function setGood(value) {
    window.pauseSettingsUpdate = false;
    saveToLocalStorage('good', value);
    storage.classes.good = parseInt(value);
    initStorage();
}

function setSoso(value) {
    window.pauseSettingsUpdate = false;
    saveToLocalStorage('soso', value);
    storage.classes.soso = parseInt(value);
    initStorage();
}

function pitStop(name) {
    showToast(name);
    drawPitlane();
    recalculateChance();
}

function recalculateChance() {
    let pitlane = [...storage.pitlane];
    let firstPit = composeChance(pitlane);
    pitlane.unshift({rating: "fake"});
    let secondPit = composeChance(pitlane);
    pitlane.unshift({rating: "fake"});
    storage.chance = [firstPit, secondPit, composeChance(pitlane)];
}

function composeChance(pitlane) {
    let chance = {rocket: 0, good: 0, soso: 0, sucks: 0, unknown: 0};
    //pitlane length should be more than count karts in a lane
    if (pitlane && pitlane.length >= storage.settings.count) {
        //3 karts in a row - we need at least 3 karts in a lane
        let startIndex = storage.settings.count - 1;

        //No sense to take into account more than count + 2 karts for a row + count. In case 2 rows and 3 in a row = 13
        let howManyKartsToKeep = this.howManyKartsToKeep();

        let endIndex = pitlane.length > howManyKartsToKeep ? howManyKartsToKeep : pitlane.length;
        //Every next pit - decrease chance
        let decreaseChance = 0;
        for (let i = startIndex; i < endIndex; i++) {
            if(pitlane[i].rating === 'fake') {
                continue;
            }
            let rating = getRatingByAvgTime(pitlane[i].avg);
            chance[rating] += parseInt((1 / (storage.settings.count * storage.settings.rows + decreaseChance)) * 100);
            decreaseChance += storage.settings.rows;
        }
    }

    return chance;
}

function getRatingByAvgTime(time) {
    let result = 'sucks';

    if(time == 0) {
        result = 'unknown'
    } else if (time < storage.classes.rocket) {
        result = 'rocket';
    } else if (time < storage.classes.good) {
        result = 'good';
    } else if (time < storage.classes.soso) {
        result = 'soso'
    }

    return result;
}

function getTeamRating(name) {
    return storage.rating && storage.rating[name] ? storage.rating[name] : {
        rating: 'unknown',
        best: 0,
        avg: 0
    };
}

//No sense to take into account more than count + 2 karts for a row + count. In case 2 rows and 3 in a row = 13
function howManyKartsToKeep() {
    return ((storage.settings.rows * (storage.settings.count + 1)) + storage.settings.count);
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
                    <span id="toast-team-name">${team}</span> is in pit!
                </div>
                <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>`;
    toastContainer.append(toastElem);
    toastElem.addEventListener('hidden.bs.toast', function () {
        this.remove();
    })
    let toast = new bootstrap.Toast(toastElem);
    toast.show();
}

function resetData() {
    return JSON.parse(httpGet('http://localhost:8083/init-data'));
}

function getData() {
    return JSON.parse(httpGet('http://localhost:8083/data'));
}
function httpGet(url)
{
    let xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", url, false ); // false for synchronous request
    xmlHttp.send( null );
    return xmlHttp.responseText;
}
