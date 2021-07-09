//const Ingul = require('../clients/ingul').Ingul;
//const fs = require('fs');
import fs from 'fs'
import Ingul from '../clients/ingul.js'

beforeEach(() => {
    global.storage = {
        teams: {},
        rating: {},
        pitlane: {},
        classes: {rocket: 22499, good: 22800, soso: 23100, sucks: 23400}
    };
    if (fs.existsSync('data.json')) {
        fs.unlinkSync('data.json');
    }

});

test('Empty data', () => {
    let ingul = new Ingul();
    ingul.parseData({});
    expect(storage.teams).toEqual({});
    expect(ingul.readStorageData()).toEqual({});
});

test('Zero lap', () => {
    let ingul = new Ingul();
    ingul.parseData(
        JSON.parse('{"D":[{"LP":0,"A":30509,"B":29081,"K":"3","G":"","L":0,"T":0,"R":5,"N":"Racer","P":1,"M":0}]}')
    );
    expect(storage.teams).toEqual({"Racer": {"laps": [], "last_lap": 0}});
    expect(storage.pitlane).toEqual({});
    expect(storage.rating).toEqual({});
    expect(ingul.readStorageData()).toEqual({});
});

test('Only 1 racer has lap time', () => {
    let ingul = new Ingul();
    ingul.parseData(
        JSON.parse('{"D":[{"L":0,"T":0,"N":"Racer 1"}, {"L":1,"T":24432,"N":"Racer 2", "K": 1, "A": 24432, "B": 24432, "P": 1, "G": 0}]}')
    );
    expect(storage.teams).toEqual({
        "Racer 1": {"laps": [], "last_lap": 0},
        "Racer 2": {
            "laps": [{
                "average": 24432,
                "best": 24432,
                "gap": 0,
                "kart": 1,
                "lap": 1,
                "lap_time": 24432,
                "position": 1,
            }], "last_lap": 1
        }
    });
    expect(storage.pitlane).toEqual({});
    expect(storage.rating).toEqual({
            "Racer 1": {
                "avg": 0,
                "best": 0,
                "rating": "unknown",
            },
            "Racer 2": {
                "avg": 24432,
                "best": 24432,
                "rating": "sucks",
            },
        }
    );
    expect(ingul.readStorageData()).toEqual(storage);
});

test('Series of 2 lap times', () => {
    let ingul = new Ingul();
    ingul.parseData(
        JSON.parse('{"D":[{"L":0,"T":0,"N":"Racer 1"}, {"L":0,"T":0,"N":"Racer 2"}]}')
    );
    ingul.parseData(
        JSON.parse('{"D": [{"L":1,"T":22000,"N":"Racer 1", "K": 1, "A": 22000, "B": 22000, "P": 1, "G": 0}, {"L":1,"T":24000,"N":"Racer 2", "K": 2, "A": 24000, "B": 24000, "P": 2, "G": 4}]}')
    );
    ingul.parseData(
        JSON.parse('{"D": [{"L":2,"T":23000,"N":"Racer 1", "K": 1, "A": 22500, "B": 22000, "P": 1, "G": 0}, {"L":1,"T":24000,"N":"Racer 2", "K": 2, "A": 24000, "B": 24000, "P": 2, "G": 4}]}')
    );
    expect(storage.teams).toEqual(
        {
            "Racer 1": {
                "laps": [
                    {
                        "average": 22000,
                        "best": 22000,
                        "gap": 0,
                        "kart": 1,
                        "lap": 1,
                        "lap_time": 22000,
                        "position": 1,
                    },
                    {
                        "average": 22500,
                        "best": 22000,
                        "gap": 0,
                        "kart": 1,
                        "lap": 2,
                        "lap_time": 23000,
                        "position": 1,
                    },
                ],
                "last_lap": 2,
            },
            "Racer 2": {
                "laps": [
                    {
                        "average": 24000,
                        "best": 24000,
                        "gap": 4,
                        "kart": 2,
                        "lap": 1,
                        "lap_time": 24000,
                        "position": 2,
                    },
                ],
                "last_lap": 1,
            },
        }
    );
    expect(storage.pitlane).toEqual({});
    expect(storage.rating).toEqual({
            "Racer 1": {
                "avg": 22000,
                "best": 22000,
                "rating": "rocket",
            },
            "Racer 2": {
                "avg": 24000,
                "best": 24000,
                "rating": "sucks",
            },
        }
    );
    expect(ingul.readStorageData()).toEqual(storage);
});

test('Series of 3 lap times', () => {
    let ingul = new Ingul();
    ingul.parseData(
        JSON.parse('{"D":[{"L":0,"T":0,"N":"Racer 1"}, {"L":0,"T":0,"N":"Racer 2"}]}')
    );
    ingul.parseData(
        JSON.parse('{"D": [{"L":1,"T":22000,"N":"Racer 1", "K": 1, "A": 22000, "B": 22000, "P": 1, "G": 0}, {"L":1,"T":24000,"N":"Racer 2", "K": 2, "A": 24000, "B": 24000, "P": 2, "G": 4}]}')
    );
    ingul.parseData(
        JSON.parse('{"D": [{"L":2,"T":23000,"N":"Racer 1", "K": 1, "A": 22500, "B": 22000, "P": 1, "G": 0}, {"L":1,"T":24000,"N":"Racer 2", "K": 2, "A": 24000, "B": 24000, "P": 2, "G": 4}]}')
    );
    ingul.parseData(
        JSON.parse('{"D": [{"L":3,"T":24000,"N":"Racer 1", "K": 1, "A": 23000, "B": 22000, "P": 1, "G": 0}, {"L":2,"T":21000,"N":"Racer 2", "K": 2, "A": 22500, "B": 21000, "P": 2, "G": 3}]}')
    );
    expect(storage.teams).toEqual(
        {
            "Racer 1": {
                "laps": [
                    {
                        "average": 22000,
                        "best": 22000,
                        "gap": 0,
                        "kart": 1,
                        "lap": 1,
                        "lap_time": 22000,
                        "position": 1,
                    },
                    {
                        "average": 22500,
                        "best": 22000,
                        "gap": 0,
                        "kart": 1,
                        "lap": 2,
                        "lap_time": 23000,
                        "position": 1,
                    },
                    {
                        "average": 23000,
                        "best": 22000,
                        "gap": 0,
                        "kart": 1,
                        "lap": 3,
                        "lap_time": 24000,
                        "position": 1,
                    },
                ],
                "last_lap": 3,
            },
            "Racer 2": {
                "laps": [
                    {
                        "average": 22500,
                        "best": 21000,
                        "gap": 3,
                        "kart": 2,
                        "lap": 2,
                        "lap_time": 21000,
                        "position": 2,
                    },
                    {
                        "average": 24000,
                        "best": 24000,
                        "gap": 4,
                        "kart": 2,
                        "lap": 1,
                        "lap_time": 24000,
                        "position": 2,
                    }
                ],
                "last_lap": 2,
            },
        }
    );
    expect(storage.rating).toEqual({
            "Racer 1": {
                "avg": 23000,
                "best": 22000,
                "rating": "good",
            },
            "Racer 2": {
                "avg": 21000,
                "best": 21000,
                "rating": "rocket",
            },
        }
    );
    expect(ingul.readStorageData()).toEqual(storage);
});

test('Series of 3 lap times + last the same', () => {
    let ingul = new Ingul();
    ingul.parseData(
        JSON.parse('{"D":[{"L":0,"T":0,"N":"Racer 1"}, {"L":0,"T":0,"N":"Racer 2"}]}')
    );
    ingul.parseData(
        JSON.parse('{"D": [{"L":1,"T":22000,"N":"Racer 1", "K": 1, "A": 22000, "B": 22000, "P": 1, "G": 0}, {"L":1,"T":24000,"N":"Racer 2", "K": 2, "A": 24000, "B": 24000, "P": 2, "G": 4}]}')
    );
    ingul.parseData(
        JSON.parse('{"D": [{"L":2,"T":23000,"N":"Racer 1", "K": 1, "A": 22500, "B": 22000, "P": 1, "G": 0}, {"L":1,"T":24000,"N":"Racer 2", "K": 2, "A": 24000, "B": 24000, "P": 2, "G": 4}]}')
    );
    ingul.parseData(
        JSON.parse('{"D": [{"L":3,"T":24000,"N":"Racer 1", "K": 1, "A": 23000, "B": 22000, "P": 1, "G": 0}, {"L":2,"T":21000,"N":"Racer 2", "K": 2, "A": 22500, "B": 21000, "P": 2, "G": 3}]}')
    );
    ingul.parseData(
        JSON.parse('{"D": [{"L":3,"T":24000,"N":"Racer 1", "K": 1, "A": 23000, "B": 22000, "P": 1, "G": 0}, {"L":2,"T":21000,"N":"Racer 2", "K": 2, "A": 22500, "B": 21000, "P": 2, "G": 3}]}')
    );
    expect(storage.teams).toEqual(
        {
            "Racer 1": {
                "laps": [
                    {
                        "average": 22000,
                        "best": 22000,
                        "gap": 0,
                        "kart": 1,
                        "lap": 1,
                        "lap_time": 22000,
                        "position": 1,
                    },
                    {
                        "average": 22500,
                        "best": 22000,
                        "gap": 0,
                        "kart": 1,
                        "lap": 2,
                        "lap_time": 23000,
                        "position": 1,
                    },
                    {
                        "average": 23000,
                        "best": 22000,
                        "gap": 0,
                        "kart": 1,
                        "lap": 3,
                        "lap_time": 24000,
                        "position": 1,
                    },
                ],
                "last_lap": 3,
            },
            "Racer 2": {
                "laps": [
                    {
                        "average": 22500,
                        "best": 21000,
                        "gap": 3,
                        "kart": 2,
                        "lap": 2,
                        "lap_time": 21000,
                        "position": 2,
                    },
                    {
                        "average": 24000,
                        "best": 24000,
                        "gap": 4,
                        "kart": 2,
                        "lap": 1,
                        "lap_time": 24000,
                        "position": 2,
                    }
                ],
                "last_lap": 2,
            },
        }
    );
    expect(storage.rating).toEqual({
            "Racer 1": {
                "avg": 23000,
                "best": 22000,
                "rating": "good",
            },
            "Racer 2": {
                "avg": 21000,
                "best": 21000,
                "rating": "rocket",
            },
        }
    );
    expect(ingul.readStorageData()).toEqual(storage);
});

test('End of session', () => {
    let ingul = new Ingul();
    ingul.parseData(
        JSON.parse('{"C": 0, "D":[{"LP":5,"A":30509,"B":29081,"K":"3","G":"","L":4,"T":23333,"R":5,"N":"Racer","P":1,"M":0}]}')
    );
    expect(storage.teams).toEqual({});
    expect(storage.pitlane).toEqual({});
    expect(storage.rating).toEqual({});
});
