//const WebSocketHelper = require('./helpers/websockethelper').WebSocketHelper;
import WebSocketHelper from './helpers/websockethelper.js';
//const Ingul = require('./clients/ingul').Ingul;
import Ingul from './clients/ingul.js'

/*
   Storage:
    Settings:
        rows: how many rows with karts
        count: how many karts in a row
    Classes:
        {rocket: 22499, good: 22800, soso: 23100, sucks: 23400}
    Rating:
        Name: {rating: rocket||good||soso||sucks||unknown, best, avg
    pitlane:
        [
            //Pushing new items to 0 index
            //First items - last added
            {rating: rocket||good||soso||sucks||unknown, best, avg}
        ]
    chance:
        [
           //First pitstop
           {rocket: chance, good: chance, soso: chance, sucks: chance, unknown: chance},
           //Second pitstop
           {rocket: chance, good: chance, soso: chance, sucks: chance, unknown: chance},
           //Third pitstop
           {rocket: chance, good: chance, soso: chance, sucks: chance, unknown: chance},
        ]
    Teams:
      Name:
       laps: {lap: lap number, gap: gap ahead, "lap_time": current lap time, kart: kart #, average: avg time, best: best time, position: curr pos}
       last_lap: # of the lap
       kart: # of the kart
       pitstop: true || false
       stint: 23322
 */

global.storage = {teams:{}, rating: {}, pitlane: [], classes: {rocket: 22499, good: 22800, soso: 23100, sucks: 23400}};

let client = new Ingul();
//new WebSocketHelper('wss://webserver10.sms-timing.com:10015/', "13143@ingulkart", client);
new WebSocketHelper('wss://webserver8.sms-timing.com:10015/', "13143@ingulkart", client);
