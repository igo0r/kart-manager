import fs from 'fs'

class StorageHelper {

    initStorage(cleanup = false) {
        if(cleanup) {
            global.storage = {
                teams: {},
                rating: {},
                pitlane: this.fillInPitlaneWithUnknown()
            };
        } else {
            this.readStorageData();
            global.storage.teams = !global.storage.teams ?  {} : global.storage.teams;
            global.storage.rating = !global.storage.rating ?  {} : global.storage.rating;
            global.storage.pitlane = !global.storage.pitlane ?  this.fillInPitlaneWithUnknown() : global.storage.pitlane;
        }

        this.recalculateRating();
    }

    recalculateRating() {
        for (let name in storage.teams){
            storage.rating[name] = this.defineTeamRating(storage.teams[name]);
        }
        this.saveToStorage();
    }

    defineTeamRating(val) {
        if(val.laps.length === 0) {
            return {avg: 0, best: 0}
        }
        return {best: val.laps[0]['lap_time'], avg: this.getTimeToCompare(val.laps)}
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
            pit.push({best: 0, avg: 0});
        }

        return pit;
    }

    howManyKartsToKeep() {
        return 30;
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
