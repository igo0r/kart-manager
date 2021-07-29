//Manual https://levelup.gitconnected.com/stocks-api-tutorial-with-javascript-40f24320128c


const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const axios = require("axios");

const cors = require("cors");
app.use(cors());
app.options('*', cors());

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

require("dotenv").config();

app.get("/stock", cors(), async (req, res) => {
    const body = JSON.parse(JSON.stringify(req.body));
    const {ticker, type} = body;
    console.log("stocks-api.js 14 | body", body.ticker);
    const request = await fetch(
        `https://www.alphavantage.co/query?function=${timePeriod(
            type
        )}&symbol=${ticker}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`
    );
    const data = await request.json();
    res.json({data: data});
});

app.post("/stocks", async (req, res) => {
    let body = JSON.parse(JSON.stringify(req.body));
    let stocksPromises = await body.stocks.map(async stock => {
        console.log(stock);
        let request = await axios.get(
            `https://finance.yahoo.com/quote/${stock}/`
        );
        let currentPrice = request.data
            .split(`"${stock}":{"sourceInterval"`)[1]
            .split('regularMarketPrice')[1]
            .split('fmt":"')[1]
            .split('"')[0];
        let previousClosePrice = request.data
            .split(`"${stock}":{"sourceInterval"`)[1]
            .split('regularMarketPreviousClose')[1]
            .split('fmt":"')[1]
            .split('"')[0];
        let openPrice = request.data
            .split(`"${stock}":{"sourceInterval"`)[1]
            .split('regularMarketOpen')[1]
            .split('fmt":"')[1]
            .split('"')[0];
        return {[stock]: {current: currentPrice, close: previousClosePrice, open: openPrice}}
    });

    Promise.all(stocksPromises)
        .then(values => {
            let response = {};
            for (let value of values) {
                let stockName = Object.keys(value)[0];
                response[stockName] = value[stockName];
            }
            console.log("stocks-api.js 40 | values", response);
            res.json({data: response, status: "done"});
        })
        .catch(error => {
            console.log("stocks-api.js 47 | error", error);
            res.json({error: error});
        });
});

app.listen(process.env.PORT || 8080, () => {
    console.log("index.js 6 | server started...");
});
