//Manual https://levelup.gitconnected.com/stocks-api-tutorial-with-javascript-40f24320128c


import fs from 'fs';
import express from 'express';
import bodyParser from 'body-parser';
import cors from "cors";
import StorageHelper from "../helpers/storage.js";

const app = express();

app.use(cors());
app.options('*', cors());

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

import dotenv from 'dotenv'
//require("dotenv").config();

app.get("/data", cors(), async (req, res) => {
    console.log("get /data");
    let rawData = fs.readFileSync('./data.json');

    let jsonData = JSON.parse(rawData);
    res.json(jsonData);
});

app.get("/init-data", cors(), async (req, res) => {
    console.log("get /init-data");
    let sH = new StorageHelper();
    sH.initStorage(true);
    res.json(sH.readStorageData());
});

app.listen(process.env.PORT || 8083, () => {
    console.log("localhost:8083 | server started...");
});
