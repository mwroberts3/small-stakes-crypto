const fs = require('fs');
const path = require('path');

const CoinbasePro = require('coinbase-pro');

const nodemailer = require('nodemailer');

const personalData = require('./personal-data-pro')

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: personalData.email,
        pass: personalData.emailPass
    }
})

const emailMsg = require('./email-messages-pro');

const key = personalData.key;
const secret = personalData.secret;
const passphrase = personalData.passphrase;

const apiURI = 'https://api.pro.coinbase.com';

const authedClient = new CoinbasePro.AuthenticatedClient(
    key,
    secret,
    passphrase,
    apiURI
  );

let smallStakesData;
let previousIntervalHigh;
// the price it's checking against resets after 3 hours
let resetInterval = (9600 * 1000);
let currentPercentageDrop = 0;
let currentPriceInfo;

let highestBuyPrice;

let highSalePct;
let last24Price = 0;

let amountToPurchase = 10;
let amountToSell = 10;

// Get current interval highest price
fs.readFile((path.join(__dirname, 'small-stakes-data-pro.json')), (err, data) => {
    if (err) throw err;
    smallStakesData = JSON.parse(data.toString());
    previousIntervalHigh = smallStakesData['buyPriceData'];
});

// init bot
setInterval(checkBuySellETH, 5000);

function checkBuySellETH() {
    authedClient.getProduct24HrStats('ETH-USD')
        .then(ether => {
            // get current time and price of ETH
            currentPriceInfo = {
                price: ether.last,
                time: new Date().getTime()
            };

            // get price 24hours ago for high sale purposes
            last24Price = ether.open;

            // check for weekly bank deposit
            checkForBankDeposit();

            // check previousIntervalHigh and potentially reset price info
            if (currentPriceInfo.time > previousIntervalHigh.time + resetInterval || currentPercentageDrop > 0) {
                resetPctDropTimer(currentPriceInfo.price, currentPriceInfo.time);
            }
        })
        .then(() => {
            // set dropPercentageTrigger to purchase ETH
            return setPricePercentageDrop(previousIntervalHigh.buyPrice);    
        })
        .then(dropPercentageTrigger => {
            // get current percentage drop
            currentPercentageDrop = +(( currentPriceInfo.price / previousIntervalHigh.buyPrice * 100) - 100).toFixed(3);

            // SET high sale percentage increase
            setHighSalePct(currentPriceInfo.price, last24Price);

            // CHECK price for high sale
            // 3% higher than [0] in buyPriceHistory
            if (+currentPriceInfo.price >= highestBuyPrice * highSalePct && highestBuyPrice > 0){
                sellHighCheck(currentPriceInfo.time);
            }

            // UPSURGE safetybuy 
            // CHECK if 24hours is a positive change
            if (highSalePct >= 1.04) {
                upsurgeSaftetyBuy(currentPriceInfo.price);
            }

            // CHECK price to adjust buyPriceHistory
            // -2.75% from [0] in buyPriceHistory
            if (currentPriceInfo.price <= highestBuyPrice * 0.9725) {
                sellOffSafeGuard(currentPriceInfo.price);
            }

            // CHECK price for buying
            // -1.25% to -0.7%
            if(currentPercentageDrop < dropPercentageTrigger) {
                purchaseCoin(currentPriceInfo.price);
            }

            // log data
            console.log(
                currentPriceInfo.price, previousIntervalHigh.buyPrice, currentPercentageDrop, dropPercentageTrigger,
                `Safe-${+(highestBuyPrice * 0.9725).toFixed(2)}`,
                `High-${+(highestBuyPrice * highSalePct).toFixed(2)}`,
                new Date(currentPriceInfo.time));
        })
        .catch(err => console.log(err));
}

function setPricePercentageDrop(price) {
    let percentageDrop;

    // Get latest transaction price
    smallStakesData = fs.readFileSync((path.join(__dirname, 'small-stakes-data-pro.json').toString('utf-8')));

    smallStakesData = JSON.parse(smallStakesData);

    // set highestBuyPrice and add to array if it is empty
    if (smallStakesData['buyPriceHistory'].length < 2 && price != smallStakesData['buyPriceHistory'][(smallStakesData['buyPriceHistory'].length - 1)]) {
        smallStakesData['buyPriceHistory'].push(+price);

        smallStakesData['buyPriceHistory'].sort((a,b) => {
            return b - a;
            });

        highestBuyPrice = smallStakesData['buyPriceHistory'][0];

        // save changes to small-stakes-data.json
        fs.writeFileSync(path.join(__dirname, 'small-stakes-data-pro.json'), JSON.stringify(smallStakesData));
        
    } else {
        highestBuyPrice = smallStakesData['buyPriceHistory'][0];
    }

    // the top condition leaves a little buffer zone for after the High sale is completed
    // percentage drop is set depending on the price percentage change over the previous 24 hours
    if (smallStakesData['sellOffBank']['unbalancedSales'] > 0) {
        if (highSalePct === 1.03 ) {
            percentageDrop = -1.25;
        } else {
            percentageDrop = -0.75;
        }
    } else {
        percentageDrop = -3;
    }

    return percentageDrop;
}

function setHighSalePct(price, last24Price) {
    // set necessary high sale percentage increase, depending on change over 24 hour open 
    let rawDiff = -(((last24Price/price) - 1));

    if (rawDiff <= 0) {
        highSalePct = 1.03;
    } else if (rawDiff > 0.07) {
        highSalePct = 1.05;
    } else {
        highSalePct = 1.04;
    }
}

function purchaseCoin(price) {
    amountToPurchase = 10;

    // load data
    smallStakesData = fs.readFileSync(path.join(__dirname, 'small-stakes-data-pro.json')).toString('utf-8');
    smallStakesData = JSON.parse(smallStakesData);

    // if there are still unbalancedSales, only buy back if current price is less than lastHighSale
    // set to 99.5% to offset any price increase that happens in between the price being logged and the order being opened
    if (smallStakesData['sellOffBank']['unbalancedSales'] > 0){
        if (smallStakesData['lastHighSale']['prices'][0]['unbalancedSales'] > 0) {
            if (price >= (smallStakesData['lastHighSale']['prices'][0]['price'] * 0.995) && smallStakesData['lastHighSale']['prices'][0]['price'] > 0) {
                amountToPurchase = 0;
                console.log('price too high');
    
                // reset timer
                resetPctDropTimer(price, new Date().getTime());
            }
        }
    }

    const params = {
        type: 'market',
        side: 'buy',
        funds: amountToPurchase,
        product_id: 'ETH-USD'
    };

    authedClient.placeOrder(params)
        .then(res => {
            console.log(res);
            
            authedClient.getFills({ product_id: 'ETH-USD', order_id: res.id })
                .then(fill => {
                    console.log('purchaseCoin()')
                    // update transactionHistory
                    smallStakesData['allTransHistory'].push({
                        price: +fill[0].price,
                        side: 'buy',
                        size: +fill[0].size
                    });
                    
                    smallStakesData['buyPriceHistory'].push(+fill[0].price);

                    smallStakesData['buyPriceHistory'].sort((a,b) => {
                    return b - a;
                    });

                    // subtract from sellOffBank
                    if (smallStakesData['sellOffBank']['unbalancedSales'] > 0) {
                        smallStakesData['sellOffBank']['unbalancedSales']-- ;

                        smallStakesData['sellOffBank']['ETHbalance'] += +fill[0].size;

                        // subtract from [0] lastHighSale
                        smallStakesData['lastHighSale']['prices'][0]['unbalancedSales']--;

                        if (smallStakesData['lastHighSale']['prices'][0]['unbalancedSales'] === 0){
                            smallStakesData['lastHighSale']['prices'].splice(0,1);
                        }
                    }                   
        
                    // add to total buy in
                    smallStakesData['totalBuyIn']['totalBuyIn'] += amountToPurchase;
        
                    // add to total fees
                    smallStakesData['totalBuyIn']['totalFees'] += +(amountToPurchase * .005).toFixed(2);
        
                    // save changes to small-stakes-data.json
                    fs.writeFileSync(path.join(__dirname, 'small-stakes-data-pro.json'), JSON.stringify(smallStakesData));

                    // reset timer & amountToPurchase
                    amountToPurchase = 10;
                    resetPctDropTimer(+fill[0].price, new Date().getTime());
                })
                .catch((err) => {
                    console.log('ERROR GETTING FILL DETAILS');

                    // update transaction history with dummy data
                    smallStakesData['allTransHistory'].push({
                        price: 'error',
                        side: 'buy',
                        size: 'error'
                    });

                    // save changes to small-stakes-data.json
                    fs.writeFileSync(path.join(__dirname, 'small-stakes-data-pro.json'), JSON.stringify(smallStakesData));

                    // reset timer
                    resetPctDropTimer(price, new Date().getTime());
                })
        })
        .catch(err => {
            console.log('NOT ENOUGH USD');
            console.log(err);

            // reset timer
            resetPctDropTimer(price, new Date().getTime());
        });
}

function sellHighCheck(time) {
    // load data
    smallStakesData = fs.readFileSync(path.join(__dirname, 'small-stakes-data-pro.json')).toString('utf-8');
    smallStakesData = JSON.parse(smallStakesData);
    
    // check if it has been at least 7 hours since last sellHigh
    if (time > smallStakesData['lastHighSale']['time'] + 2.52e+7) {
        // send email notification
        transporter.sendMail(emailMsg.youJustSoldHigh, (err, info) => {
            if (err) {
                console.log(err)
            } else {
                console.log('email sent', info.response)
            }
        })

        amountToSell = 10;

        const params = {
            type: 'market',
            side: 'sell',
            funds: amountToSell * 5,
            product_id: 'ETH-USD'
        };
        
        authedClient.placeOrder(params)
            .then(res => {
                console.log(res)
    
                authedClient.getFills({ product_id: 'ETH-USD', order_id: res.id })
                    .then(fill => {     
                    // update all transactions history
                    smallStakesData['allTransHistory'].push({
                        price: +fill[0].price,
                        side: 'sell',
                        size: +fill[0].size,
                        type: 'HIGH'
                    });
    
                    // update lastHighSale time
                    smallStakesData['lastHighSale']['time'] = time;
                    
                    // add to lastHighSale prices array
                    smallStakesData['lastHighSale']['prices'].unshift({price: +fill[0].price, unbalancedSales: 5});

                    // sort lastHighSale Prices
                    smallStakesData['lastHighSale']['prices'].sort((a,b) => {
                        if(a.price > b.price) {
                            return -1;
                        } else if (b.price > a.price) {
                            return 1;
                        } else {
                            return 0;
                        }
                    });

                    // update sellOffBank
                    smallStakesData['sellOffBank']['unbalancedSales'] += 5;
                    smallStakesData['sellOffBank']['ETHbalance'] -= +fill[0].size;
    
                    // save changes to small-stakes-data.json
                    fs.writeFileSync(path.join(__dirname, 'small-stakes-data-pro.json'), JSON.stringify(smallStakesData));
                    })
                    .catch(err => {
                        console.log('ERROR GETTING FILL DETAILS');

                        // update all transactions history with dummy data
                        smallStakesData['allTransHistory'].push({
                        price: 'error',
                        side: 'sell',
                        size: 'error',
                        type: 'HIGH'
                    });

                    // update lastHighSale time to prevent repeat highsale error
                    smallStakesData['lastHighSale']['time'] = time;

                    // save changes to small-stakes-data.json
                    fs.writeFileSync(path.join(__dirname, 'small-stakes-data-pro.json'), JSON.stringify(smallStakesData));
                    })
            })
            .catch(err => {
                console.log(err);
            });
    }

}

function upsurgeSaftetyBuy(price) {
    // load data
    smallStakesData = fs.readFileSync(path.join(__dirname, 'small-stakes-data-pro.json')).toString('utf-8');
    smallStakesData = JSON.parse(smallStakesData);

    if(smallStakesData['sellOffBank']['unbalancedSales'] > 0) {
        if (price <= smallStakesData['lastHighSale']['prices'][0]['price'] * 0.98) {
            amountToPurchase = 10;
            unbalancedSalesToSubtract = smallStakesData['lastHighSale']['prices'][0]['unbalancedSales'];

            const params = {
                type: 'market',
                side: 'buy',
                funds: amountToPurchase * unbalancedSalesToSubtract,
                product_id: 'ETH-USD'
            };

            authedClient.placeOrder(params)
            .then(res => {
                console.log(res);

                authedClient.getFills({ product_id: 'ETH-USD', order_id: res.id })
                    .then(fill => {
                        console.log('upsurgeSaftetyBuy()');

                        // update transactionHistory
                        smallStakesData['allTransHistory'].push({
                            price: +fill[0].price,
                            side: 'buy',
                            size: +fill[0].size
                        });
                        
                        smallStakesData['buyPriceHistory'].push(+fill[0].price);

                        smallStakesData['buyPriceHistory'].sort((a,b) => {
                        return b - a;
                        });

                                                                        // remove from lastHighestSale[]
                        if (smallStakesData['sellOffBank']['unbalancedSales'] > 0) {
                            smallStakesData['lastHighSale']['prices'].splice(0,1);
                        }

                        // subtract from sellOffBank
                        smallStakesData['sellOffBank']['unbalancedSales'] -= unbalancedSalesToSubtract;

                        smallStakesData['sellOffBank']['ETHbalance'] += +fill[0].size;

                        // save changes to small-stakes-data.json
                        fs.writeFileSync(path.join(__dirname, 'small-stakes-data-pro.json'), JSON.stringify(smallStakesData));

                        // reset timer
                        resetPctDropTimer(price, new Date().getTime());
                })
                .catch(err => {
                    console.log('ERROR GETTING FILL DETAILS');

                    // update transaction history with dummy data
                    smallStakesData['allTransHistory'].push({
                        price: 'error',
                        side: 'buy',
                        size: 'error'
                    });

                    // save changes to small-stakes-data.json
                    fs.writeFileSync(path.join(__dirname, 'small-stakes-data-pro.json'), JSON.stringify(smallStakesData));

                    // reset timer
                    resetPctDropTimer(price, new Date().getTime());
                })
            })
            .catch(err => {
                console.log('NOT ENOUGH USD');
                console.log(err);
    
                // reset timer
                resetPctDropTimer(price, new Date().getTime());
            })
        }
}
}


function sellOffSafeGuard(price) {
    // Load small stakes data
    smallStakesData = fs.readFileSync(path.join(__dirname, 'small-stakes-data-pro.json')).toString('utf-8');
    smallStakesData = JSON.parse(smallStakesData);

    // update buyPriceHistory                    
    smallStakesData['buyPriceHistory'].splice(0,1);

    // log to console
    console.log('safeguard trigger, current highest buyprice was removed');

    // save changes to small-stakes-data.json
    fs.writeFileSync(path.join(__dirname, 'small-stakes-data-pro.json'), JSON.stringify(smallStakesData));
}

function resetPctDropTimer(price, time) {
    smallStakesData = fs.readFileSync(path.join(__dirname, 'small-stakes-data-pro.json')).toString('utf-8');
    smallStakesData = JSON.parse(smallStakesData);
    smallStakesData['buyPriceData']['buyPrice'] = price;
    smallStakesData['buyPriceData']['time'] = time;

    console.log(`NEW PRICE: ${price} TIME: ${time}`)

    fs.writeFileSync(path.join(__dirname, 'small-stakes-data-pro.json'), JSON.stringify(smallStakesData));

    fs.readFile((path.join(__dirname, 'small-stakes-data-pro.json')), (err, data) => {
      if (err) throw err;
      smallStakesData = JSON.parse(data.toString());
      previousIntervalHigh = smallStakesData['buyPriceData'];
    });
}

function checkForBankDeposit() {

}
