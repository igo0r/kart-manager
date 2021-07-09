
//const Client = require('./client').Client;
import Client from './client.js'
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
class Ingul extends Client{
    constructor() {
        super()
    }

    parseData(data) {
        let needToRecalculate = false;
        if(!data["D"]) {
            return;
        }
        data["D"].forEach(item => {
            //Check racer/team exists
            if(!storage.teams[item["N"]] || storage.teams[item["N"]] === undefined) {
                storage.teams[item["N"]] = {}
            }
            //Check racer/team has some laps
            if(!storage.teams[item["N"]].laps || storage.teams[item["N"]].laps === undefined) {
                storage.teams[item["N"]].laps = [];
                storage.teams[item["N"]]['last_lap'] = 0
            }

            let team = storage.teams[item["N"]];
            //Check if new data exists in results
            if((team.laps.length === 0 || team['last_lap'] !== item["L"]) && item["T"] > 0) {
                //check if pitstop
                if(false === true) {

                } else {
                    storage.teams[item["N"]]['last_lap'] = item["L"];
                    storage.teams[item["N"]]['kart'] = item["K"];
                    storage.teams[item["N"]].laps.push({lap: item["L"], gap: item["G"], "lap_time": item["T"], kart: item["K"], average: item["A"], best: item["B"], position: item["P"]});
                    needToRecalculate = true;
                }
            }
        });
        if(needToRecalculate) {
            this.recalculateRating();
        }

        if(data["C"] === 0) {
            console.log("===============HIT IS OVER!==================");
            this.printResult();
            storage.teams = {};
            storage.rating = {};
            storage.pitlane = {};
        }
    }
}
//exports.Ingul = Ingul;
export default Ingul;
