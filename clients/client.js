import StorageHelper from '../helpers/storage.js';

class Client {
    constructor() {
        this.storage = new StorageHelper();
        this.storage.initStorage();
    }

    get track() {
        throw new Error("Implement me!");
    }

    parseData() {
        throw new Error("Implement me!");
    }

    getInitMessage() {
        throw new Error("Implement me!");
    }

    getUrl() {
        throw new Error("Implement me!");
    }

    pitStop(name) {
        this.addToPitlane(name);
        this.storage.recalculateChance();
    }

    addToPitlane(name) {
        let rate = global.storage.rating && global.storage.rating[name] ? global.storage.rating[name] : {
            rating: 'unknown',
            best: 99999,
            avg: 99999
        };
        console.log(`Add kart to pitlane with ${rate.rating},${rate.best}, ${rate.avg}`);
        global.storage.pitlane.unshift(rate);
        global.storage.pitlane.length = this.storage.howManyKartsToKeep();
        this.storage.saveToStorage();
    }

    addTeamIfNotExists(teamName) {
        if (!global.storage.teams[teamName] || global.storage.teams[teamName] === undefined) {
            global.storage.teams[teamName] = {}
        }
    }

    addLapsForTeamIfNotExists(teamName) {
        //Check racer/team has some laps
        if (!global.storage.teams[teamName].laps || global.storage.teams[teamName].laps === undefined) {
            global.storage.teams[teamName].laps = [];
            global.storage.teams[teamName]['last_lap'] = 0
        }
    }

    getAdapter() {
        switch (this.track) {
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
                throw new Error(`Wrong track name ${this.track}`)
        }
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
}

export default Client
