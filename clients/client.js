//const fs = require('fs');
//import fs from '../node_modules/@types/node/fs.d.ts';

class Client {
    constructor() {}

    parseData() {
        throw new Error("Implement me!");
    }

    recalculateRating() {
        for (let name in storage.teams){
            storage.rating[name] = this.defineTeamRating(storage.teams[name]);
        }
        this.writeToFile();
    }

    defineTeamRating(val) {
        if(val.laps.length === 0) {
            return {rating: "unknown", avg: 0, best: 0}
        }
        let time = this.getTimeToCompare(val.laps);
        let result = '';
        if(time < storage.classes.rocket) {
            result = 'rocket';
        } else if(time < storage.classes.good) {
            result = 'good';
        } else if(time < storage.classes.soso) {
            result = 'soso'
        } else {
            result = 'sucks'
        }

        return {rating: result, best: val.laps[0]['lap_time'], avg: val.laps[parseInt((val.laps.length - 1) / 2)]['lap_time']}
    }

    getTimeToCompare(laps) {
        laps.sort((a, b) => a.lap_time - b.lap_time);
        let bestLap = laps[0]['lap_time'];
        let avgLap = laps[parseInt((laps.length - 1) / 2)]['lap_time'];
        return parseInt((bestLap + avgLap) / 2)
    }

    printResult() {
        console.log("=============TEAMS=============");
        for (let name in storage.teams){
            console.log(`${name}: laps[ ${storage.teams[name].laps.map(lap => lap['lap_time']).join(', ')} ]`)
        }
        console.log("=============RATING=============");
        for (let name in storage.rating){
            console.log(`Rating: ${storage.rating[name].rating}, Best lap: ${storage.rating[name].best}, Avg lap: ${storage.rating[name].avg}`)
        }
    }

    writeToFile() {
        /*fs.writeFile('data.json', JSON.stringify(storage), (err) => {
            if (err) throw err;
        })*/
       // fs.writeFileSync('data.json', JSON.stringify(storage))
    }

    readStorageData() {
        if (!fs.existsSync('data.json')) {
            return {};
        }
        let content = fs.readFileSync('data.json', 'utf8');
        console.log(content);
        return JSON.parse(fs.readFileSync('data.json', 'utf8'))
    }
}
//exports.Client = Client;
export default Client
