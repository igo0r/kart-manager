
//const Client = require('./client').Client;
import Client from './client.js'
import storage from '../helpers/storage.js';
/*
"N":"Заезд 36",
"C":"Time left in millisec",
"D" [] - data who is in the race
D.A - average lap time
D.B - best lap time
D.K - kart number
D.G - gap to next pos
D.L - lap number
D.T - last lap time
D.N - racer name
D.P - position
*/
class Circuit2G extends Client{
    constructor() {
        super()
    }

    get track() {
        return '2g';
    }

    getInitMessage() {
        return "{\"$type\":\"BcStart\",\"ClientKey\":\"2gcircuit\",\"ResourceId\":19495,\"Timing\":true,\"Notifications\":true,\"Security\":\"THIRD PARTY TV\"}";
    }

    getUrl() {
        return 'wss://webserver8.sms-timing.com:10015/';
    }

    getAdapter() {
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
    }

    parseData(data) {
       // console.log(data);
       // console.log(global.storage);
        let adapter = this.getAdapter();
        let needToRecalculate = false;
        if (!data[adapter.data]) {
            return;
        }
        data[adapter.data].forEach(item => {
            //Check racer/team exists
            this.addTeamIfNotExists(item[adapter.teamName]);
            this.addLapsForTeamIfNotExists(item[adapter.teamName]);

            let team = global.storage.teams[item[adapter.teamName]];
            //Pitstop
            if (item[adapter.pitTime] && item[adapter.pitTime] >= 0) {
                console.log(`${item[adapter.teamName]} is in PIT for ${item[adapter.pitTime]}`);
                !global.storage.teams[item[adapter.teamName]]['pitstop'] ? this.pitStop(item[adapter.teamName]) : '';
                global.storage.teams[item[adapter.teamName]]['pitstop'] = true;
                console.log(`Set empty laps for ${item[adapter.teamName]}`);
                global.storage.teams[item[adapter.teamName]].laps = [];
                needToRecalculate = true;
            } else if ((team.laps.length === 0 || team['last_lap'] !== item[adapter.lapNumber]) && (item[adapter.lapTime] > 0 && item[adapter.lapTime] < 125000)) {

                console.log(`${item[adapter.teamName]} has new lap ${item[adapter.lapNumber]} with time: ${item[adapter.lapTime]}`);
                global.storage.teams[item[adapter.teamName]]['last_lap'] = item[adapter.lapNumber];
                global.storage.teams[item[adapter.teamName]]['kart'] = this.track === '2g' ? item["Kart"]["Name"] : adapter.kart;
                global.storage.teams[item[adapter.teamName]]['pitstop'] = false;
                global.storage.teams[item[adapter.teamName]]['stint'] = item[adapter.stint] ? item[adapter.stint] : 0;
                global.storage.teams[item[adapter.teamName]].laps.push({
                    lap: item[adapter.lapNumber],
                    "lap_time": item[adapter.lapTime],
                    kart: this.track === '2g' ? item["Kart"]["Name"] : adapter.kart,
                    position: item[adapter.position],
                });
                needToRecalculate = true;
            }
        });
        if (needToRecalculate) {
            this.storage.recalculateRating();
        }

        if (this.track === '2g' ? data["RaceState"] === "Finished" : data["C"] === 0) {
            console.log("===============HIT IS OVER!==================");
            this.printResult();
            !needToRecalculate ? this.storage.recalculateRating() : '';
            global.storage.teams = {};
            global.storage.rating = {};
            global.storage.pitlane = this.storage.fillInPitlaneWithUnknown();
        }
    }
}

export default Circuit2G;
