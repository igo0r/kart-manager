initStorage('2g');

let webSocket = new WebSocket(storage.track === 'Ingul' ? 'wss://webserver10.sms-timing.com:10015/' : 'wss://webserver8.sms-timing.com:10015/');

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
    parseData(JSON.parse(event.data))
}

function parseData(data) {
    console.log(data);
    console.log(storage);
    let adapter = getAdapter();
    let needToRecalculate = false;
    if (!data[adapter.data]) {
        return;
    }
    data[adapter.data].forEach(item => {
        //Check racer/team exists
        if (!storage.teams[item[adapter.teamName]] || storage.teams[item[adapter.teamName]] === undefined) {
            storage.teams[item[adapter.teamName]] = {}
        }
        //Check racer/team has some laps
        if (!storage.teams[item[adapter.teamName]].laps || storage.teams[item[adapter.teamName]].laps === undefined) {
            storage.teams[item[adapter.teamName]].laps = [];
            storage.teams[item[adapter.teamName]]['last_lap'] = 0
        }

        let team = storage.teams[item[adapter.teamName]];
        //Pitstop
        if (item[adapter.pitTime] && item[adapter.pitTime] >= 0) {
            console.log(`${item[adapter.teamName]} is in PIT for ${item[adapter.pitTime]}`);
            !storage.teams[item[adapter.teamName]]['pitstop'] ? pitStop(item[adapter.teamName]) : '';
            storage.teams[item[adapter.teamName]]['pitstop'] = true;
            console.log(`Set empty laps for ${item[adapter.teamName]}`);
            storage.teams[item[adapter.teamName]].laps = [];
            needToRecalculate = true;
        } else if ((team.laps.length === 0 || team['last_lap'] !== item[adapter.lapNumber]) && item[adapter.lapTime] > 0) {
            console.log(`${item[adapter.teamName]} has new lap ${item[adapter.lapNumber]} with time: ${item[adapter.lapTime]}`);
            storage.teams[item[adapter.teamName]]['last_lap'] = item[adapter.lapNumber];
            storage.teams[item[adapter.teamName]]['kart'] = storage.track === '2g' ? item["Kart"]["Name"] : adapter.kart;
            storage.teams[item[adapter.teamName]]['pitstop'] = false;
            storage.teams[item[adapter.teamName]]['stint'] = item[adapter.stint] ? item[adapter.stint] : 0;
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
        data += `<div class="col border border-3 ${getBgColor(storage.rating[name].rating)}">#${storage.teams[name].kart} ${name} <br />
${storage.rating[name].rating}  <br />
Best - ${storage.rating[name].best}<br />
Avg - ${storage.rating[name].avg}<br />
Stint - ${storage.rating[name].stint} </div>`;
    }

    document.getElementById('rating').innerHTML = data;
}

function drawLaps() {
    let data = '';
    for (let name in storage.teams) {
        data += `<div class="col border border-3 ${getBgColor(storage.rating[name].rating)}">#${storage.teams[name].kart} - ${name}<br />
${storage.teams[name].laps.map(lap => lap['lap_time']).join('<br/>')}</div>`;
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
        data += `<div class="w-5 col border border-3 ${getBgColor(lane.rating)}">${lane.rating} Best ${lane.best}, Avg ${lane.avg}</div><br />`;
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
            settings: {rows: 2, count: 3}
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
    let thirdPit = composeChance(pitlane);
    storage.chance = [firstPit, secondPit, thirdPit];
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
        let howManyKartsToKeep = ((storage.settings.rows * (storage.settings.count + 2)) + storage.settings.count);

        let endIndex = pitlane.length > howManyKartsToKeep ? howManyKartsToKeep : pitlane.length;
        //Every next pit - decrease chance
        let decreaseChance = 0;
        for (let i = startIndex; i < endIndex; i++) {
            chance[pitlane[i].rating] += parseInt((1 / (storage.settings.count * storage.settings.rows + decreaseChance)) * 100);
            decreaseChance += 2;
        }
    }

    return chance;
}


function getInitMessage() {
    return storage.track && storage.track === 'Ingul' ? 'START 13143@ingulkart' : "{\"$type\":\"BcStart\",\"ClientKey\":\"2gcircuit\",\"ResourceId\":19495,\"Timing\":true,\"Notifications\":true,\"Security\":\"THIRD PARTY TV\"}";
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
    return ((storage.settings.rows * (storage.settings.count + 2)) + storage.settings.count);
}
