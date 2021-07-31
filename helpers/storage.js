import fs from 'fs'

class StorageHelper {

    initStorage(cleanup = false) {
        if(cleanup) {
            global.storage = {
                teams: {},
                rating: {},
                chance: [],
                classes: {rocket: 50000, good: 51000, soso: 51300, sucks: 53000},
                settings: {rows: 3, count: 2}
            };
            global.storage.pitlane = this.fillInPitlaneWithUnknown()
        } else {
            this.readStorageData();
            global.storage.teams = !global.storage.teams ?  {} : global.storage.teams;
            global.storage.rating = !global.storage.rating ?  {} : global.storage.rating;
            global.storage.chance = !global.storage.chance ?  [] : global.storage.chance;
            global.storage.classes = !global.storage.classes ?  {rocket: 50000, good: 51000, soso: 51300, sucks: 53000} : global.storage.classes;
            global.storage.settings = !global.storage.settings || !global.storage.settings.rows || !global.storage.settings.count ?  {rows: 3, count: 2} : global.storage.settings;
            global.storage.pitlane = !global.storage.pitlane ?  this.fillInPitlaneWithUnknown() : global.storage.pitlane;
        }

        this.recalculateRating();
        this.recalculateChance();
    }

    recalculateChance() {
        let pitlane = [...global.storage.pitlane];
        let firstPit = this.composeChance(pitlane);
        pitlane.unshift({rating: "fake"});
        let secondPit = this.composeChance(pitlane);
        if(global.storage.settings.count > 2) {
            pitlane.unshift({rating: "fake"});
            global.storage.chance = [firstPit, secondPit, this.composeChance(pitlane)];
        } else {
            global.storage.chance = [firstPit, secondPit];
        }
        this.saveToStorage();
    }

    recalculateRating() {
        for (let name in storage.teams){
            storage.rating[name] = this.defineTeamRating(storage.teams[name]);
        }
        this.saveToStorage();
    }

    composeChance(pitlane) {
        let chance = {rocket: 0, good: 0, soso: 0, sucks: 0, unknown: 0};
        //pitlane length should be more than count karts in a lane
        if (pitlane && pitlane.length >= global.storage.settings.count) {
            //3 karts in a row - we need at least 3 karts in a lane
            let startIndex = global.storage.settings.count - 1;

            //No sense to take into account more than count + 2 karts for a row + count. In case 2 rows and 3 in a row = 13
            let howManyKartsToKeep = ((global.storage.settings.rows * (global.storage.settings.count + 2)) + global.storage.settings.count);

            let endIndex = pitlane.length > howManyKartsToKeep ? howManyKartsToKeep : pitlane.length;
            //Every next pit - decrease chance
            let decreaseChance = 0;
            for (let i = startIndex; i < endIndex; i++) {
                chance[pitlane[i].rating] += parseInt((1 / (global.storage.settings.count * global.storage.settings.rows + decreaseChance)) * 100);
                decreaseChance += global.storage.settings.rows;
            }
        }

        return chance;
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

    fillInPitlaneWithUnknown() {
        let pit = [];
        for (let i = 0; i <= this.howManyKartsToKeep(); i++) {
            pit.push({rating: 'unknown', best: 99999, avg: 99999});
        }

        return pit;
    }

    howManyKartsToKeep() {
        return ((global.storage.settings.rows * (global.storage.settings.count + 2)) + global.storage.settings.count);
    }

    saveToStorage() {
        fs.writeFileSync('./data.json', JSON.stringify(storage), (err) => {
            if (err) throw err;
        })
    }

    readStorageData() {
        let data = {};
        if (fs.existsSync('data.json')) {
            data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
        }
        global.storage = data;
        return data
    }
}

export default StorageHelper;
