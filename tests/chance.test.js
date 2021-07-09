//const Ingul = require('../clients/ingul').Ingul;
//const fs = require('fs');
import fs from 'fs'

beforeEach(() => {
    global.storage = {
        teams: {},
        rating: {},
        chance: [],
        settings: {rows: 2, count: 3},
        pitlane: []
    };
});

test('Calculate rocket chance', () => {
    storage.pitlane = [{rating: "rocket"}, {rating: "rocket"}, {rating: "rocket"}, {rating: "rocket"}];
    recalculateChance();
    expect(storage.chance).toEqual([
        {"good": 0, "rocket": 28, "soso": 0, "sucks": 0, "unknown": 0},
        {"good": 0, "rocket": 38, "soso": 0, "sucks": 0, "unknown": 0},
        {"good": 0, "rocket": 46, "soso": 0, "sucks": 0, "unknown": 0}]);
    expect(storage.pitlane).toEqual([{rating: "rocket"}, {rating: "rocket"}, {rating: "rocket"}, {rating: "rocket"}]);
});

test('Calculate good and rocket chance', () => {
    storage.pitlane = [{rating: "rocket"}, {rating: "good"}, {rating: "rocket"}, {rating: "good"}];
    recalculateChance();
    expect(storage.chance).toEqual([
        {"good": 12, "rocket": 16, "soso": 0, "sucks": 0, "unknown": 0},
        {"good": 26, "rocket": 12, "soso": 0, "sucks": 0, "unknown": 0},
        {"good": 20, "rocket": 26, "soso": 0, "sucks": 0, "unknown": 0}]);
    expect(storage.pitlane).toEqual([{rating: "rocket"}, {rating: "good"}, {rating: "rocket"}, {rating: "good"}]);
});

test('Calculate all chances', () => {
    storage.pitlane = [{rating: "rocket"}, {rating: "good"}, {rating: "soso"}, {rating: "sucks"}, {rating: "unknown"}, {rating: "sucks"}, {rating: "unknown"}, {rating: "rocket"}, {rating: "good"}, {rating: "unknown"}, {rating: "rocket"}, {rating: "good"}, {rating: "unknown"}, {rating: "rocket"}, {rating: "good"}];
    recalculateChance();
    expect(storage.chance).toEqual([
        {"good": 9, "rocket": 10, "soso": 16, "sucks": 20, "unknown": 25},
        {"good": 24, "rocket": 9, "soso": 12, "sucks": 17, "unknown": 18},
        {"good": 16, "rocket": 24, "soso": 10, "sucks": 14, "unknown": 16}]);
});


function recalculateChance() {
    let pitlane = [...storage.pitlane];
    let firstPit = composeChance(pitlane);
    pitlane.unshift({rating: "fake"});
    let secondPit = composeChance(pitlane);
    pitlane.unshift({rating: "fake"});
    let thirdPit = composeChance(pitlane);
    storage.chance = [firstPit, secondPit, thirdPit];
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
