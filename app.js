const Alpaca = require('@alpacahq/alpaca-trade-api');
const nj = require('numjs');
const moment = require('moment-business-days');
const axios = require('axios');
const CronJob = require('cron').CronJob;
const express = require('express');
const config = require('./config.json');
const app = express();

const stock = 'SPY'; // Stock
const guide = 'TMV'; // Guide

const WEIGHT = 0.4;

const alpaca = new Alpaca(config.alpaca);

new CronJob('* 45 6 * * 2,4', function() {
    test();
}, null, true, 'America/Los_Angeles');


async function test() {
    const [stock_price, guide_price] = await alpaca.getBars('minute', [stock, guide]).then((position) => {
        return [position[stock][3].c, position[guide][3].c];
    });

    const[stock_history, guide_history] = await alpaca.getBars('day', [stock, guide], {start: new Date(moment().businessSubtract(20, 'days'))}).then((positions) => {
        let stockAverages = positions[stock].map((position) => {
            return (position.o + position.c)/2.0;
        });
        let guideAverages = positions[guide].map((position) => {
            return (position.o + position.c)/2.0;
        });
        return [stockAverages,guideAverages];
    });

    const mean_stock = nj.mean(stock_history);
    const mean_guide = nj.mean(guide_history);

    const stddev_stock = nj.std(stock_history);
    const stddev_guide = nj.std(guide_history);

    const zscore_stock = (stock_price - mean_stock) / stddev_stock;
    const zscore_guide = (guide_price - mean_guide) / stddev_guide;

    const weight_stock = (stock_price / mean_stock) + WEIGHT;
    const weight_guide = (guide_price / mean_guide * -1) - WEIGHT;

    if ((Math.abs(zscore_guide) > Math.abs(zscore_stock)) && (zscore_stock > 0) && (zscore_guide > 0) && (/*open order stuff*/true)) {
        orderTargetPercent(stock, weight_stock, stock_price);
    } else if ((Math.abs(zscore_stock) > Math.abs(zscore_guide)) && (zscore_stock < 0) && (zscore_guide < 0) && (/*open order stuff*/true)) {
        orderTargetPercent(guide, weight_guide, guide_price);
    } else {
        slackUpdate("We decided not to purchase any stocks today.");
    }
}

async function orderTargetPercent(ticker, weight, price) {
    const side = (weight < 0) ? 'sell' : 'buy';

    const portfolio = await alpaca.getAccount().then((account) => {
        return account.portfolio_value;
    });

    orderTargetValue(ticker, portfolio*weight, price);
}

async function orderTargetValue(ticker, target, price) {
    const amount = Math.round(target / price);

    orderTarget(ticker, amount);
}

async function orderTarget(ticker, amount) {
    const positions = await alpaca.getPosition(ticker).then((positions) => {
        return positions.length;
    });

    order(ticker, amount - positions);
}

function order(ticker, amount) {
    console.log('Trying to order', ticker, 'with amount', amount);

    if (amount < 0) {
        alpaca.createOrder({
            symbol: ticker, // any valid ticker symbol
            qty: Math.abs(amount),
            side: 'sell',
            type: 'market',
            time_in_force: 'day'
        }).then((order) => {
            console.log('Order placed:', order);
        });
        slackUpdate("We are selling " + Math.abs(amount) + " stocks of " + ticker);
    } else if (amount > 0) {
        alpaca.createOrder({
            symbol: ticker, // any valid ticker symbol
            qty: amount,
            side: 'buy',
            type: 'market',
            time_in_force: 'day'
        }).then((order) => {
            console.log('Order placed:', order);
        });
        slackUpdate("We are buying " + amount + " stocks of " + ticker);
    }
}

function slackUpdate(message) {
    axios.post(config.slackHook, {
        text: message
    }).catch((error) => {
        console.error(error);
    });
}

app.post('/forcerun', (req, res) => {
    slackUpdate("Forcefully running Loxley...");
    test();
    res.send("Running...");
});

app.post('/positions', (req, res) => {
    alpaca.getPositions().then((positions) => {
        if (positions.length == 0) return slackUpdate("You currently hold no positions");
        var response = "You currently hold the following positions:";
        for (var i = 0; i < positions.length; i++) {
            let pos = positions[i];
            response+="\n*"+pos['symbol']+"*: "+pos['qty']+" position(s), with a market value of " + pos['market_value'];
        }
        slackUpdate(response);
        res.send("Sending....");
    });
});

app.listen(8080, () => console.log(`Loxley listening on port ${8080}!`))