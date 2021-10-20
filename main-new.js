initStorage('2g');
trackUpdates();

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
    if (storage.track === 'apex') {
        parseApexData(event.data)
    } else {
        parseData(JSON.parse(event.data))
    }
}

function trackUpdates() {
    window.trackUpdatesTask = window.setInterval(() => {
        if(window.lastUpdate && (new Date() - window.lastUpdate) > 300000) {
            console.log("No data from from timing!");
            showWarningToast("No data from from timing! Reload the page!");
            window.location.reload();
        }
    },7000);
}

function parseData(data) {
    // console.log(data);
    //console.log(storage);
    console.log('Response received');
    window.lastUpdate = new Date();
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
            storage.teams[item[adapter.teamName]].customRating = false;
            needToRecalculate = true;
        } else if ((team.laps.length === 0 || team['last_lap'] !== item[adapter.lapNumber]) && (item[adapter.lapTime] > 0 && item[adapter.lapTime] < 125000)) {
            console.log(`${item[adapter.teamName]} has new lap ${item[adapter.lapNumber]} with time: ${item[adapter.lapTime]}`);
            storage.teams[item[adapter.teamName]]['last_lap'] = item[adapter.lapNumber];
            storage.teams[item[adapter.teamName]].kart = storage.track === '2g' ? item["Kart"]["Name"] : adapter.kart;
            storage.teams[item[adapter.teamName]].pitstop = false;
            storage.teams[item[adapter.teamName]].driver = item["Drivers"] && item["Drivers"][0] && item["Drivers"][0]["Alias"] ? item["Drivers"][0]["Alias"] : item[adapter.teamName];
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
        recalculateRating(false);
    }

    showFlag(storage.track === '2g' ? data["RaceState"] === "Finished" : data["C"] === 0);
    if (storage.track === '2g' ? data["RaceState"] === "Finished" : data["C"] === 0) {
        console.log("===============HIT IS OVER!==================");
        this.printResult();
        !needToRecalculate ? recalculateRating(false) : '';
        for(let teamName in storage.teams) {
            addLapsToStatistics(teamName);
        }
        storage.teams = {};
        storage.rating = {};
        storage.pitlane = fillInPitlaneWithUnknown();
        storage.chance = [];
        saveToLocalStorage();
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
        convertedTime = parseInt(splittedHM[1]) * 1000 + milliseconds;
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
        storage.teams[teamName]['last_lap'] = 0;
        storage.teams[teamName].customRating = false;
    }
}

function addTeamIfNotExists(teamName) {
    if (!storage.teams[teamName] || storage.teams[teamName] === undefined) {
        storage.teams[teamName] = {}
    }
}

function recalculateRating(drawSettings = true) {
    for (let name in storage.teams) {
        let rating = defineTeamRating(storage.teams[name]);
        if (storage.teams[name].customRating) {
            rating.rating = storage.rating[name] && storage.rating[name].rating ? storage.rating[name].rating : rating.rating;
        }

        storage.rating[name] = rating;
    }

    saveToLocalStorage();
    drawHTML(drawSettings);
}

function defineTeamRating(val) {
    if (val.laps.length < 2) {
        let lap = val.laps.length > 0 ? val.laps[0].lap_time : 99999;
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
    let currentLaps = [...laps];
    currentLaps.shift();
    currentLaps.sort((a, b) => a.lap_time - b.lap_time);
    let howManyLaps = storage.settings.howManyLaps;
    let maxLength = currentLaps.length > howManyLaps ? howManyLaps : currentLaps.length;
    let avg = 0;
    for (let i = 0; i < maxLength; i++) {
        avg += currentLaps[i].lap_time;
    }
    return parseInt(avg / maxLength);
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

function drawHTML(withSettings = true) {
    if(withSettings) {
        drawSettings();
    }
    drawChance();
    drawRating();
    drawPitlane();
    drawStatistics();
    drawLaps();
}

function changeTeamRating(item) {
    let teamName = document.getElementById('team-rating-modal').getAttribute('name');
    if (!storage.teams[teamName] || !storage.rating[teamName]) {
        alert(`Wrong team id: ${teamName}`);
        return;
    }

    storage.rating[teamName].rating = item.value;
    storage.teams[teamName].customRating = true;
    recalculateRating();
    window.showTeamEditForm.hide();
}

function editTeamRating(item) {
    let teamId = item.name;
    if (!storage.teams[teamId] || !storage.rating[teamId] || !storage.rating[teamId].rating) {
        alert(`Wrong team name ${item.name} to edit or team does not have rating!`);
        return;
    }

    document.getElementById('team-rating-modal').setAttribute('name', item.name);
    document.getElementById('team-rating-title').innerText = `Change #${storage.teams[teamId].kart} ${teamId} data`;

    document.getElementById('team-rating-body').innerHTML = `
    <div class="m-2 col-3 col-md-2 form-check form-check-inline">
        <input onclick="changeTeamRating(this);" class="form-check-input" type="radio" name="inlineRadioOptions" id="team-rocket" value="rocket">
        <label class="form-check-label bg-info text-dark" for="team-rocket">Rocket</label>
    </div>
    <div class="m-2 col-3 col-md-2 form-check form-check-inline">
        <input onclick="changeTeamRating(this);" class="form-check-input" type="radio" name="inlineRadioOptions" id="team-good" value="good">
        <label class="form-check-label bg-success text-white" for="team-good">Good</label>
    </div>
    <div class=" m-2 col-3 col-md-2 form-check form-check-inline">
        <input onclick="changeTeamRating(this);" class="form-check-input" type="radio" name="inlineRadioOptions" id="team-soso" value="soso">
        <label class="form-check-label bg-warning text-dark" for="team-soso">Soso</label>
    </div>
    <div class="m-2 col-3 col-md-2 form-check form-check-inline">
        <input onclick="changeTeamRating(this);" class="form-check-input" type="radio" name="inlineRadioOptions" id="team-sucks" value="sucks">
        <label class="form-check-label bg-danger text-white" for="team-sucks">Sucks</label>
    </div>
    <div class="m-2 col-3 col-md-2 form-check form-check-inline">
        <input onclick="changeTeamRating(this);" class="form-check-input" type="radio" name="inlineRadioOptions" id="team-unknown" value="unknown">
        <label class="form-check-label bg-white text-dark" for="team-unknown">Unknown</label>
    </div>
    `;

    document.getElementById(`team-${storage.rating[teamId].rating}`).checked = true;
    window.showTeamEditForm = new bootstrap.Modal(document.getElementById('editTeamRating'));
    window.showTeamEditForm.show();
}

function doSorting() {
    let keys = Object.keys(storage.rating);
    switch (storage.settings.teamsSort) {
        case 'max-stint':
            keys.sort((a, b) => storage.teams[b].stint - storage.teams[a].stint);
            break;
        case 'min-avg':
            keys.sort((a, b) => storage.rating[a].avg - storage.rating[b].avg);
            break;
        case 'number':
            keys.sort((a, b) => storage.teams[a].kart - storage.teams[b].kart);
            break;
    }

    return keys;
}
function drawRating() {
    let keysOrder = doSorting();
    let data = '';
    keysOrder.forEach(name => {
        data += `<div class="col border border-3 ${getBgColor(storage.rating[name].rating)}">
<button class="ms-1" name="${name}" onclick="editTeamRating(this)">✏️</button>
<br />
#${storage.teams[name].kart} ${name} ${storage.rating[name].stint && parseInt(storage.rating[name].stint) > 1800000 ? '🚨' : ''}<br />
${storage.teams[name].driver && storage.teams[name].driver !== name ? storage.teams[name].driver + '<br />' : ''}
${storage.rating[name].rating}  <br />
Best - ${this.convertToMinutes(storage.rating[name].best)}<br />
Avg - ${this.convertToMinutes(storage.rating[name].avg)}<br />
Stint - ${this.convertToMinutes(storage.teams[name].stint ?? 0)} </div>`;
    });

    //}

    document.getElementById('teams-sort').value = storage.settings.teamsSort;
    document.getElementById('rating').innerHTML = data;
}

function drawLaps() {
    let keysOrder = doSorting();
    let data = '';
    keysOrder.forEach(name => {
        data += `<div class="col border border-3 ${getBgColor(storage.rating[name].rating)}">
<button class="ms-1" name="${name}" onclick="editTeamRating(this)">✏️</button><br />
#${storage.teams[name].kart} - ${name}<br />
${storage.teams[name].driver && storage.teams[name].driver !== name ? storage.teams[name].driver + '<br />' : ''}
${storage.teams[name].laps.map(lap => this.convertToMinutes(lap['lap_time'])).join('<br/>')}</div>`;
    });

    document.getElementById('laps').innerHTML = data;
}

function drawStatistics() {
    let keysOrder = doSorting();
    let data = '';
    keysOrder.forEach(name => {
        data += `
<div class="col border border-3">
#${storage.teams[name].kart} - ${name}<br />`;
        if(statistic[name]) {
            statistic[name].slice().reverse().forEach(stint => {
                data += `
<div class="${getBgColor(stint.rating.rating)}">
${stint.driver ? stint.driver + '<br />' : ''}
Best - ${this.convertToMinutes(stint.rating.best)}<br />
Avg - ${this.convertToMinutes(stint.rating.avg)}
</div>           
`;
            });
        }
        data += `</div>`;
    });

    document.getElementById('statistics').innerHTML = data;
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
    for(let i = storage.pitlane.length - 1; i >= 0; i-- ) {
        data += `
<div class="col border border-3 ${getBgColor(storage.pitlane[i].rating)}">
#${storage.pitlane[i].kart ?? 0} ${storage.pitlane[i].name ?? 'unknown'}<br />
${storage.pitlane[i].driver ?? 'unknown'}<br />
Best - ${this.convertToMinutes(storage.pitlane[i].best)}<br />
Avg - ${this.convertToMinutes(storage.pitlane[i].avg)}<br />
</div>

`;
    }
    /*storage.pitlane.forEach(lane => {
        data += `<div class="col-sm border border-3 ${getBgColor(lane.rating)}">${lane.rating}</div>`;
    });*/

    document.getElementById('pitlane').innerHTML = data;
}

function drawSettings() {
    document.getElementById('teams-sort').value = storage.settings.teamsSort ?? 'default';
    document.getElementById('how-many-laps').value = storage.settings.howManyLaps;

    document.getElementById('rocket').value = storage.classes.rocket;
    document.getElementById('good').value = storage.classes.good;
    document.getElementById('soso').value = storage.classes.soso;

    for (let i = 0; i < storage.settings.rows.length; i++) {
        storage.settings.rows[i] = storage.settings.rows[i] ? storage.settings.rows[i] : 0;
    }
    storage.settings.rowsSum = storage.settings.rows.reduce((sum, row) => sum + row);
    document.getElementById('rows-count').value = storage.settings.rows.length;
    document.getElementById('rows-with-karts').innerHTML = '';
    let data = '';
    storage.settings.rows.forEach((kartsInRow, index) => {
        data += `<span class="input-group-text" >#${index + 1}</span>
                    <input type="text" class="form-control" placeholder="karts in row" id="row-${index}"
                           onchange="setKartsInRow(${index}, this.value)" value="${kartsInRow}">`;

    });
    document.getElementById('rows-with-karts').innerHTML = data;
    saveToLocalStorage();
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
    if(whatToSave === 'storage') {
        return localStorage.setItem('storage', JSON.stringify(storage)) ?? {};
    } else if(whatToSave === 'statistic') {
        return localStorage.setItem('statistic', JSON.stringify(statistic)) ?? {};
    }
}

function getFromLocalStorage(whatToGet = 'storage') {
    if(whatToGet === 'storage') {
        return JSON.parse(localStorage.getItem('storage'));
    } else if(whatToGet === 'statistic') {
        return JSON.parse(localStorage.getItem('statistic'));
    }
}

function reset() {
    localStorage.removeItem('storage');
    localStorage.removeItem('statistic');
    initStorage(window.storage.track);
    saveToLocalStorage();
    saveToLocalStorage('statistic');
    recalculateRating();
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
            chance: [],
            classes: {rocket: 50000, good: 51000, soso: 51300, sucks: 53000},
            settings: {rows: [2, 2, 2], rowsSum: 6, howManyLaps: 5, teamsSort: 'default'}
        };
        window.storage.pitlane = fillInPitlaneWithUnknown();
    }
    let statisticFromLocalStorage = getFromLocalStorage('statistic');
    if (statisticFromLocalStorage) {
        window.statistic = statisticFromLocalStorage;
    } else {
        window.statistic = {};
    }

    window.lastUpdate = new Date();
    window.storage.track = track;
    recalculateRating();
    recalculateChance();
}

function showFlag(show) {
    document.getElementById('finish').setAttribute('style', show ? '' : 'display: none;');
}

function sortBy(value) {
    storage.settings.teamsSort = value;
    saveToLocalStorage();
    drawRating();
    drawLaps();
    drawStatistics();
}

function setKartsInRow(index, value) {
    storage.settings.rows[index] = parseInt(value);
    storage.settings.rowsSum = storage.settings.rows.reduce((sum, row) => sum + row);
    drawSettings();
    saveToLocalStorage();
    recalculateChance();
}

function setRows(value) {
    storage.settings.rows = storage.settings.rows ? storage.settings.rows : [];
    storage.settings.rows.length = parseInt(value);
    for (let i = 0; i < value; i++) {
        storage.settings.rows[i] = storage.settings.rows[i] ? storage.settings.rows[i] : 0;
    }
    drawSettings();
    saveToLocalStorage();
    recalculateChance();
}

function setHowManyLaps(value) {
    storage.settings.howManyLaps = parseInt(value);
    saveToLocalStorage();
    recalculateRating();
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
    addLapsToStatistics(name);
    addToPitlane(name);
    storage.teams[name].customRating = false;
    drawPitlane();
    recalculateChance();
}

function addLapsToStatistics(name) {
    statistic = !statistic ? {} : statistic;
    statistic[name] = statistic[name] ? statistic[name] : [];
    if(storage.teams[name] && storage.teams[name].laps) {
        statistic[name].push(
            {
                driver: storage.teams[name].driver ?? 'noname',
                stint: storage.teams[name].stint ?? 0,
                rating: getTeamRating(name),
                laps: storage.teams[name].laps
            }
        )
    }
    saveToLocalStorage('statistic');
}

function recalculateChance() {
    let pitlane = [...storage.pitlane];
    let firstPit = composeChance(pitlane);
    pitlane.push({rating: "unknown"});
    pitlane = cutPitlaneToTheSize(pitlane);
    let secondPit = composeChance(pitlane);
    pitlane.push({rating: "unknown"});
    pitlane = cutPitlaneToTheSize(pitlane);
    storage.chance = [firstPit, secondPit, composeChance(pitlane)];

    saveToLocalStorage();
    drawChance();
}

function composeChance(pitlane) {
    let result = composeVariants(pitlane);
    console.log(result);
    return {
        rocket: result.rocket ? (100 * result.rocket / result.all).toFixed(2) : 0,
        good: result.good ? (100 * result.good / result.all).toFixed(2) : 0,
        soso: result.soso ? (100 * result.soso / result.all).toFixed(2) : 0,
        sucks: result.sucks ? (100 * result.sucks / result.all).toFixed(2) : 0,
        unknown: result.unknown ? (100 * result.unknown / result.all).toFixed(2) : 0,
    };
}

function composeVariants(pitlane, result = {}) {
    if (pitlane.length > storage.settings.rowsSum) {
        let startIndex = 0;
        storage.settings.rows.forEach(row => {
            if (row < 1) {
                return;
            }
            let tmpPitlane = [...pitlane];
            let a = tmpPitlane[storage.settings.rowsSum];
            tmpPitlane.splice(storage.settings.rowsSum, 1);
            tmpPitlane.splice(startIndex, 1);
            startIndex += row;
            tmpPitlane.splice(startIndex - 1, 0, a);
            composeVariants(tmpPitlane, result)
        })
    }
    if (pitlane.length === storage.settings.rowsSum) {
        let startIndex = 0;
        storage.settings.rows.forEach(row => {
            if (row < 1) {
                return;
            }
            let type = pitlane[startIndex].rating;
            result[type] = result[type] ? result[type] + 1 : 1;
            result.all = result.all ? result.all + 1 : 1;
            startIndex += row;
        })
    }

    return result;
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

function cutPitlaneToTheSize(pitlane) {
    while (pitlane.length > howManyKartsToKeep()) {
        pitlane.splice(0, 1);
    }

    return pitlane;
}

function addToPitlane(name) {
    let rate = getTeamRating(name);
    rate.name = name;
    rate.kart = storage.teams[name].kart ?? 0;
    rate.driver = storage.teams[name].driver ?? 'unknown';
    console.log(`Add kart to pitlane with ${rate.rating},${rate.best}, ${rate.avg}`);
    storage.pitlane.push(rate);
    storage.pitlane = cutPitlaneToTheSize(storage.pitlane);
    saveToLocalStorage();
}

function getTeamRating(name) {
    return storage.rating && storage.rating[name] ? storage.rating[name] : {
        rating: 'unknown',
        best: 99999,
        avg: 99999
    };
}

function fillInPitlaneWithUnknown() {
    let pit = [];
    for (let i = 0; i < howManyKartsToKeep(); i++) {
        pit.push({kart: '0', team: 'unknown', rating: 'unknown', best: 99999, avg: 99999});
    }

    return pit;
}

//No sense to take into account more than count + 2 karts for a row + count. In case 2 rows and 3 in a row = 13
function howManyKartsToKeep() {
    return 15;
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
