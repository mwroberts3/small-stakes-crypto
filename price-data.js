const fs = require('fs');
const cb = require('./sole-coinbase-account');
const path = require('path');
const emailMsg = require('./email-messages');

let smallStakesData;
let totalBuyIn;
let previousFiveHour = {};
let highestBuyPrice;

let buyPercentageDrop;
let amountToPurchase;

// resets current price every 10 hours, unless there's been an increase
let resetInterval = 36000;

exports.getETHPrice = () => {
  cb.client.getAccount(cb.accountPayment.ETHAccountId, function(err, account) {
    if (err) console.log(err)
    console.log('ETH Account Value:', account.native_balance.amount);
  })

  // gets current total ammount USD spent on coin
  smallStakesData = fs.readFileSync(path.join(__dirname, 'small-stakes-data.json')).toString('utf-8');
  smallStakesData = JSON.parse(smallStakesData);  
  totalBuyIn = smallStakesData['totalBuyIn']['totalBuyIn'];
  console.log(`Total CASH Buy In: ${totalBuyIn}`);

  // Get latest buy price
  fs.readFile((path.join(__dirname, 'small-stakes-data.json')), (err, data) => {
    if (err) throw err;
    smallStakesData = JSON.parse(data.toString());
    previousFiveHour = smallStakesData['buyPriceData'];
    console.log(previousFiveHour);
  });

  setInterval(checkAndBuyETH, 5000)
}

function checkAndBuyETH() {
  let percentageDrop;
  amountToPurchase = 25;
  amountToSell = 29;
  amountToDeposit = 26.5;
  cbTransactionFee = 1.49;

  cb.client.getBuyPrice({'currencyPair': 'ETH-USD'} , (err, price) => {
    cb.client.getTime((err, time) => {
      // check for monthly bank account $52 deposit
      checkForBankDeposit(time.data.epoch);
      
      // Set percentage drop necessary for investment
      setBuyPercentageDrop(price.data.amount, time.data.epoch);

      // check price and time data against what's in the buy-price.json file
      if (price && time) {        
        percentageDrop = (price.data.amount / previousFiveHour.buyPrice * 100) - 100;
        console.log(`${percentageDrop}`, buyPercentageDrop, price.data.amount, previousFiveHour.buyPrice, time.data.epoch);

        if (err === null) {
          if (time.data.epoch > +previousFiveHour.time + resetInterval || percentageDrop > 0) {
            resetPctDropTimer(price.data.amount, time.data.epoch);
          }
         
          // Purchase coin
          if (percentageDrop < buyPercentageDrop){
            cb.client.getAccount(cb.accountPayment.ETHAccountId, function(err, account) {
              account.buy({"amount": amountToPurchase.toString(),
                           "currency": "USD",
                           "payment_method": cb.accountPayment.fiatPaymentMethodId
              }, function(err, tx) {
                if (!err) {
                  console.log(tx);
                  // update buyPriceHistory
                  smallStakesData = fs.readFileSync(path.join(__dirname, 'small-stakes-data.json')).toString('utf-8');
                  smallStakesData = JSON.parse(smallStakesData); 

                  smallStakesData['buyPriceHistory'].push(+price.data.amount);

                  smallStakesData['buyPriceHistory'].sort((a,b) => {
                    return b - a;
                  });

                  // add to total buy in
                  smallStakesData['totalBuyIn']['totalBuyIn'] += (amountToPurchase + cbTransactionFee);

                  // save changes to small-stakes-data.json
                  fs.writeFileSync(path.join(__dirname, 'small-stakes-data.json'), JSON.stringify(smallStakesData));

                  // Send email notification
                  cb.transporter.sendMail(emailMsg.youJustBoughtCrypto, (err, info) => {
                    if (err) {
                      console.log(err)
                    } else {
                      console.log('email sent', info.response)
                    }
                  })
                  
                  // reset timer
                  resetPctDropTimer(price.data.amount, time.data.epoch);
                } else {
                  console.log(err)
                  resetPctDropTimer(price.data.amount, time.data.epoch);
                }
              })
            })
          }
        }
      }
    })
  }) 
}

function setBuyPercentageDrop(price, time) {
  // Get latest transaction price
  fs.readFile((path.join(__dirname, 'small-stakes-data.json')), (err, data) => {
    if (err) throw err;

    smallStakesData = JSON.parse(data.toString());

    highestBuyPrice = smallStakesData['buyPriceHistory'][0];

    if (price >= highestBuyPrice * 1.15) {
      buyPercentageDrop = -0.5;
    } else if (price >= highestBuyPrice * 1.05) {
      buyPercentageDrop = -3;
    } else if (price >= highestBuyPrice) {
      buyPercentageDrop = -5;
    } else {
      buyPercentageDrop = -7;
    }

    sellOffSafeGuardCheck(highestBuyPrice, price, time);
  });
}

function sellOffSafeGuardCheck(highestBuyPrice, price, time) {
  if (price <= highestBuyPrice * 0.9) {

    cb.client.getAccount(cb.accountPayment.ETHAccountId, function(err, account) {
      account.sell({"amount": amountToSell.toString(),
        "currency": "USD",
        "payment_method": cb.accountPayment.fiatPaymentMethodId}, function(err, tx) {

        if (!err) {
          console.log(tx);
          // update buyPriceHistory
          smallStakesData = fs.readFileSync(path.join(__dirname, 'small-stakes-data.json')).toString('utf-8');
          smallStakesData = JSON.parse(smallStakesData); 

          smallStakesData['buyPriceHistory'].splice(0,1);

          // subtract from total buy in
          smallStakesData['totalBuyIn']['totalBuyIn'] -= amountToSell;

          // save changes to small-stakes-data.json
          fs.writeFileSync(path.join(__dirname, 'small-stakes-data.json'), JSON.stringify(smallStakesData));

          // Send email notification
          cb.transporter.sendMail(emailMsg.youJustSoldCrypto, (err, info) => {
            if (err) {
              console.log(err)
            } else {
              console.log('email sent', info.response)
            }
          })

          resetPctDropTimer(price, time);
        } else {
          console.log(err);
        }
      });
    });
  }
}

function checkForBankDeposit(time) {
    // Currently set up for monthly deposits of 53 dollars
    // get time of last deposit, then check if it has been a month
    smallStakesData = fs.readFileSync(path.join(__dirname, 'small-stakes-data.json')).toString('utf-8');
    smallStakesData = JSON.parse(smallStakesData);
    let timeOfLastDeposit = smallStakesData['latestDepositData']['timeOfDeposit'];

    // console.log('time until next deposit', (timeOfLastDeposit + 604800) - time)
    // 2.628e+6 - 4 weeks
    // 1.21e+6 - 2 weeks
    // 604800 - 1 week

    if (time >= timeOfLastDeposit + 604800) {
      cb.client.getAccount(cb.accountPayment.fiatAccountId, function(err, account) {
        console.log(account)

        account.deposit({"amount": amountToDeposit.toString(),
                         "currency": "USD",
                         "payment_method": cb.accountPayment.bankAccountId}, function(err, tx) {
          console.log(tx);
          if (err) console.log(err);
        });

        // Send email notification
        cb.transporter.sendMail(emailMsg.bankWithdrawal, (err, info) => {
          if (err) {
            console.log(err)
          } else {
            console.log('email sent', info.response)
          }
        })

        smallStakesData['latestDepositData']['timeOfDeposit'] = time;
        smallStakesData['latestDepositData']['monthlyDepositAmount'] = amountToDeposit;

        fs.writeFileSync(path.join(__dirname, 'small-stakes-data.json'), JSON.stringify(smallStakesData));
      });
    }
}

function resetPctDropTimer(price, time) {
    smallStakesData = fs.readFileSync(path.join(__dirname, 'small-stakes-data.json')).toString('utf-8');
    smallStakesData = JSON.parse(smallStakesData);
    smallStakesData['buyPriceData']['buyPrice'] = price;
    smallStakesData['buyPriceData']['time'] = time;

    console.log(`NEW PRICE: ${price} TIME: ${time}`)

    fs.writeFileSync(path.join(__dirname, 'small-stakes-data.json'), JSON.stringify(smallStakesData));

    fs.readFile((path.join(__dirname, 'small-stakes-data.json')), (err, data) => {
      if (err) throw err;
      smallStakesData = JSON.parse(data.toString());
      previousFiveHour = smallStakesData['buyPriceData'];
    });
}