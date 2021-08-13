initStorage('2g');

let url = '';
switch (storage.track) {
    case 'Ingul':
        url = 'wss://webserver10.sms-timing.com:10015/';
        break;
    case '2g':
        url = 'wss://webserver8.sms-timing.com:10015/';
        break;
    case 'apex':
        //url = 'wss://www.apex-timing.com:8072/';
        url = 'ws://www.apex-timing.com:7822/'

}
let webSocket = new WebSocket(url);

webSocket.onopen = function (event) {
    let message = getInitMessage();
    webSocket.send(message);
};

webSocket.onerror = function (error) {
    console.log(error);
    let message = getInitMessage();
    webSocket.send(message);
}

webSocket.onclose = function (error) {
    let message = getInitMessage();
    webSocket.send(message);
}

webSocket.onmessage = function (event) {
    if(storage.track === 'apex') {
        parseApexData(event.data)
    } else {
        parseData(JSON.parse(event.data))
    }
}

/*
 We need to compose data for parseData from init|r| into
 {

 }
 */
function parseApexData(data) {
    console.log(data);
    console.log(storage);
    let items = data.split('\n');
    if(data.includes('init|')) {
        let grid = items.filter(item => item.includes('grid|'));
        let gridItems = grid[0].split('|');
        document.getElementById('apex-results').innerHTML = gridItems[2];
        let racers = document.querySelectorAll('tr:not(.head)');
        racers.forEach(racer => {
            let driverCellNumber = document.querySelector("td[data-type='dr']").getAttribute('data-id');
            let lastLapCellNumber = document.querySelector("td[data-type='llp']").getAttribute('data-id');
            let kartCellNumber = document.querySelector("td[data-type='no']").getAttribute('data-id');
            let rkCellNumber = document.querySelector("td[data-type='rk']").getAttribute('data-id');

            let dataId = racer.getAttribute('data-id');
            let isPit = racer.querySelector(`td[data-id="${dataId}c1"]`).getAttribute('class');
            let teamName = racer.querySelector(`td[data-id="${dataId}${driverCellNumber}"]`).textContent;
            let kart = racer.querySelector(`div[data-id="${dataId}${kartCellNumber}"]`).textContent;
            let position = racer.querySelector(`p[data-id="${dataId}${rkCellNumber}"]`).textContent;
            let lapTime = convertToMiliSeconds(racer.querySelector(`td[data-id="${dataId}${lastLapCellNumber}"]`).textContent);
            this.addTeamIfNotExists(teamName);
            this.addLapsForTeamIfNotExists(teamName);
            //pitstop
            if(isPit && isPit == 'si') {
                console.log(`${teamName} is in PIT!!!!`);
                !storage.teams[teamName]['pitstop'] ? pitStop(teamName) : '';
                storage.teams[teamName]['pitstop'] = true;
                console.log(`Set empty laps for ${teamName}`);
                storage.teams[teamName].laps = [];
                recalculateRating();
                return;
            }
            if(lapTime === '' || (storage.teams[teamName]['last_lap_time'] && storage.teams[teamName]['last_lap_time'] === lapTime)) {
                return;
            }
            console.log(`${teamName} has new lap with time: ${lapTime}`);
            storage.teams[teamName]['id'] = dataId;
            storage.teams[teamName]['kart'] = kart;
            storage.teams[teamName]['last_lap_time'] = lapTime;
            storage.teams[teamName]['last_lap_time_minutes'] = this.convertToMinutes(lapTime);
            storage.teams[teamName]['pitstop'] = false;
            storage.teams[teamName]['stint'] = false ? 1 : 0;
            storage.teams[teamName].laps.push({
                "lap_time": lapTime,
                "converted_lap_time": lapTime,
                kart,
                position
            });
            recalculateRating();
        });
    } else {
        items.forEach(item => {
            let splitted = item.split('|');
            if(splitted.length < 3) {
                return;
            }

            let lastLapCellNumber = document.querySelector("td[data-type='llp']").getAttribute('data-id');

           /* if (document.querySelector(`[data-id="${splitted[0]}"]`)) {
                document.querySelector(`[data-id="${splitted[0]}"]`).innerHTML = splitted[2];
                document.querySelector(`[data-id="${splitted[0]}"]`).setAttribute('class', splitted[1]);
            }*/
            let teamId = (splitted[0].split('c'))[0];
            if(item.includes('c1|si|')) {
                console.log("MAYBE PIT??");
                for (let name in storage.teams) {
                    if(storage.teams[name].id == teamId) {
                        console.log(`Check if ${name} is in PIT?????`);
                        if(storage.teams[name]['pitstop']) {
                            return;
                        }
                        console.log(`${name} is in PIT!!!!`);
                        pitStop(name);
                        storage.teams[name]['pitstop'] = true;
                        console.log(`Set empty laps for ${name}`);
                        storage.teams[name].laps = [];
                        recalculateRating();
                    }
                }
                return;
            }
            //new lap for team
            if(item.includes(lastLapCellNumber + '|')) {
                //bad lap
                if(splitted[2].length <= 1) {
                    return;
                }
                //Format = r183c11|ib|1:01.707
                for (let name in storage.teams) {
                    if(storage.teams[name].id == teamId) {
                        let lapTime = this.convertToMiliSeconds(splitted[2]);
                        console.log(`${name} has new lap with time: ${lapTime}`);
                        storage.teams[name]['last_lap_time'] = lapTime;
                        storage.teams[name]['last_lap_time_minutes'] = this.convertToMinutes(lapTime);
                        storage.teams[name]['pitstop'] = false;
                        storage.teams[name]['stint'] = false ? 1 : 0;
                        storage.teams[name].laps.push({
                            "lap_time": lapTime,
                            "converted_lap_time": lapTime
                        });
                        recalculateRating();
                    }
                }
            }
        })
    }
}

function parseData(data) {
   // console.log(data);
    //console.log(storage);
    console.log('Response received');
    let adapter = getAdapter();
    let needToRecalculate = false;
    if (!data[adapter.data]) {
        return;
    }
    data[adapter.data].forEach(item => {
        //Check racer/team exists
        this.addTeamIfNotExists(item[adapter.teamName]);
        this.addLapsForTeamIfNotExists(item[adapter.teamName]);

        let team = storage.teams[item[adapter.teamName]];
        //Pitstop
        if (item[adapter.pitTime] && item[adapter.pitTime] >= 0) {
            console.log(`${item[adapter.teamName]} is in PIT for ${item[adapter.pitTime]}`);
            !storage.teams[item[adapter.teamName]].pitstop ? pitStop(item[adapter.teamName]) : '';
            storage.teams[item[adapter.teamName]].pitstop = true;
            console.log(`Set empty laps for ${item[adapter.teamName]}`);
            storage.teams[item[adapter.teamName]].laps = [];
            storage.teams[item[adapter.teamName]].stint = 0;
            needToRecalculate = true;
        } else if ((team.laps.length === 0 || team['last_lap'] !== item[adapter.lapNumber]) && (item[adapter.lapTime] > 0 && item[adapter.lapTime] < 125000)) {
            console.log(`${item[adapter.teamName]} has new lap ${item[adapter.lapNumber]} with time: ${item[adapter.lapTime]}`);
            storage.teams[item[adapter.teamName]]['last_lap'] = item[adapter.lapNumber];
            storage.teams[item[adapter.teamName]].kart = storage.track === '2g' ? item["Kart"]["Name"] : adapter.kart;
            storage.teams[item[adapter.teamName]].pitstop = false;
            storage.teams[item[adapter.teamName]].stint = item[adapter.stint] ? item[adapter.stint] : 0;
            storage.teams[item[adapter.teamName]].laps.push({
                lap: item[adapter.lapNumber],
                "lap_time": item[adapter.lapTime],
                kart: storage.track === '2g' ? item["Kart"]["Name"] : adapter.kart,
                position: item[adapter.position],
            });
            needToRecalculate = true;
        }
    });
    if (needToRecalculate) {
        recalculateRating();
    }

    showFlag(storage.track === '2g' ? data["RaceState"] === "Finished" : data["C"] === 0);
    if (storage.track === '2g' ? data["RaceState"] === "Finished" : data["C"] === 0) {
        console.log("===============HIT IS OVER!==================");
        this.printResult();
        !needToRecalculate ? recalculateRating() : '';
        storage.teams = {};
        storage.rating = {};
        storage.pitlane = fillInPitlaneWithUnknown();
        storage.chance = [];
    }
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
    drawHTML();
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
    if(laps.length < 3) {
        return laps[1].lap_time
    }
    laps.sort((a, b) => a.lap_time - b.lap_time);
    let maxLength = laps.length > 10 ? 10 : laps.length;
    let avg = 0;
    for(let i = 2; i < maxLength; i++) {
        avg += laps[i].lap_time;
    }
    return parseInt(avg / (maxLength - 2));
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

function saveToLocalStorage() {
    return localStorage.setItem('storage', JSON.stringify(storage)) ?? {};
}

function getFromLocalStorage() {
    return JSON.parse(localStorage.getItem('storage'));
}

function reset() {
    localStorage.removeItem('storage');
    initStorage(window.storage.track);
    saveToLocalStorage();
    recalculateRating();
}

//2g || Ingul
function initStorage(track) {
    let fromLocalStorage = getFromLocalStorage();
    if(fromLocalStorage) {
        window.storage = fromLocalStorage;
        initSettings();
    } else {
        window.storage = {
            teams: {},
            rating: {},
            chance: [],
            classes: {rocket: 50000, good: 51000, soso: 51300, sucks: 53000},
            settings: {rows: 3, count: 2}
        };
        initSettings();
        window.storage.pitlane = fillInPitlaneWithUnknown();
    }

    window.storage.track = track;
    recalculateRating();
    recalculateChance();
}

function initSettings() {
    document.getElementById('rocket').value = storage.classes.rocket;
    document.getElementById('good').value = storage.classes.good;
    document.getElementById('soso').value = storage.classes.soso;

    document.getElementById('rows').value = storage.settings.rows;
    document.getElementById('count').value = storage.settings.count;
}

function showFlag(show) {
    document.getElementById('finish').setAttribute('style', show ? '' : 'display: none;');
}

function setRows(value) {
    storage.settings.rows = parseInt(value);
    saveToLocalStorage();
    recalculateChance();
}

function setCountInRow(value) {
    storage.settings.count = parseInt(value);
    saveToLocalStorage();
    recalculateChance();
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
    addToPitlane(name);
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

    saveToLocalStorage();
    drawChance();
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
            chance[pitlane[i].rating] += parseInt((1 / (storage.settings.count * storage.settings.rows + decreaseChance)) * 100);
            decreaseChance += storage.settings.rows;
        }
    }

    return chance;
}


function getInitMessage() {
    if(!storage || !storage.track) {
        return "WRONG STORAGE!";
    }
    switch(storage.track) {
        case "2g":
            return "{\"$type\":\"BcStart\",\"ClientKey\":\"2gcircuit\",\"ResourceId\":19495,\"Timing\":true,\"Notifications\":true,\"Security\":\"THIRD PARTY TV\"}";
        case "Ingul":
            return 'START 13143@ingulkart';
        case "apex":
            return "\n";
    }
    //return storage.track && storage.track === 'Ingul' ? 'START 13143@ingulkart' : "{\"$type\":\"BcStart\",\"ClientKey\":\"2gcircuit\",\"ResourceId\":19495,\"Timing\":true,\"Notifications\":true,\"Security\":\"THIRD PARTY TV\"}";
}

function getAdapter() {
    switch (storage.track) {
        case 'Ingul':
            return {
                data: 'D',
                teamName: 'N',
                lapNumber: 'L',
                lapTime: 'T',
                kart: 'K',
                position: 'P',
                stint: 'S',
                pitTime: 'Pit'
            };
        case '2g':
            return {
                data: 'Drivers',
                teamName: 'Alias',
                lapNumber: 'LapCount',
                lapTime: 'LastTimeMs',
                kart: 'K',
                position: 'Position',
                stint: 'StintTimeMs',
                pitTime: 'CurrentPitTimeMs'
            };
        case 'apex':
            return {
                data: 'Drivers',
                teamName: 'Alias',
                lapNumber: 'LapCount',
                lapTime: 'LastTimeMs',
                kart: 'K',
                position: 'Position',
                stint: 'StintTimeMs',
                pitTime: 'CurrentPitTimeMs'
            };
        default:
            throw new Error(`Wrong track name ${storage.track}`)
    }
}

function addToPitlane(name) {
    let rate = storage.rating && storage.rating[name] ? storage.rating[name] : {
        rating: 'unknown',
        best: 99999,
        avg: 99999
    };
    console.log(`Add kart to pitlane with ${rate.rating},${rate.best}, ${rate.avg}`);
    storage.pitlane.unshift(rate);
    storage.pitlane.length = howManyKartsToKeep();
    saveToLocalStorage();
}

function fillInPitlaneWithUnknown() {
    let pit = [];
    for (let i = 0; i <= howManyKartsToKeep(); i++) {
        pit.push({rating: 'unknown', best: 99999, avg: 99999});
    }

    return pit;
}

//No sense to take into account more than count + 2 karts for a row + count. In case 2 rows and 3 in a row = 13
function howManyKartsToKeep() {
    return ((storage.settings.rows * (storage.settings.count + 1)) + storage.settings.count);
}

function showToast(team) {
    let toastContainer = document.getElementById('toast-container');
    let toastElem = document.createElement('div');
    toastElem.setAttribute('class', 'toast align-items-center bg-warning');
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
