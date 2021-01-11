const fs = require('fs');
const cb = require('./sole-coinbase-account');
const path = require('path');
const emailMsg = require('./email-messages');

let totalBuyIn;
let checkForRebound;
let ETHAccountTotal;
let previousFiveHour = {};
let mostRecentPaidPrice;

let emailTiming = {
  approachingSafeguard: 0,
  priceLessThan500: 0
};

let buyPercentageDrop;
let amountToPurchase;

exports.getETHPrice = () => {
  cb.client.getAccount(cb.accountPayment.ETHAccountId, function(err, account) {
    if (err) console.log(err)
    console.log('ETH Account Value:', account.native_balance.amount);
    ETHAccountTotal = account.native_balance.amount;
  })

  // gets current total ammount USD spent on coin
  totalBuyIn = fs.readFileSync(path.join(__dirname, 'sell-balance-threshold.json')).toString('utf-8');
  totalBuyIn = JSON.parse(totalBuyIn);  
  console.log(totalBuyIn)
  checkForRebound = (totalBuyIn['Check-For-Rebound'] === 'true');
  totalBuyIn = totalBuyIn['Total-Buy-In'];

  // Get latest buy price
  fs.readFile((path.join(__dirname, 'buy-price.json')), (err, data) => {
    if (err) throw err;
    previousFiveHour = JSON.parse(data.toString());
  });

  setInterval(checkAndBuyETH, 5000)
}

function checkAndBuyETH() {
  let percentageDrop;
  amountToPurchase = 25;

  // gets buyprice at last sale
  let buyPriceAtLastSale = fs.readFileSync(path.join(__dirname, 'sell-balance-threshold.json')).toString('utf-8');
  buyPriceAtLastSale = JSON.parse(buyPriceAtLastSale); 

  cb.client.getBuyPrice({'currencyPair': 'ETH-USD'} , (err, price) => {
    cb.client.getTime((err, time) => {
      // check for monthly bank account $52 deposit
      checkForBankDeposit(time.data.epoch);
      
      // Set percentage drop necessary for investment
      setBuyPercentageDrop(previousFiveHour.BuyPrice);

      // check price and time data against what's in the buy-price.json file
      if (price && time) {        
        percentageDrop = (price.data.amount / previousFiveHour.BuyPrice * 100) - 100;
        console.log(`${percentageDrop}`, buyPercentageDrop, price.data.amount, previousFiveHour.BuyPrice, time.data.epoch);

        if (err === null) {
          if (time.data.epoch > +previousFiveHour.time + 18000 || percentageDrop > 0) {
            fs.writeFile((path.join(__dirname, 'buy-price.json')), JSON.stringify({BuyPrice: price.data.amount, time: time.data.epoch }), (err) => {
              if (err) console.log(err)
              console.log(`NEW PRICE: ${price.data.amount} TIME: ${time.data.epoch}`)

              fs.readFile((path.join(__dirname, 'buy-price.json')), (err, data) => {
                if (err) throw err;
                previousFiveHour = JSON.parse(data.toString());
              });
            });
          }

          if (percentageDrop < -5 && !checkForRebound) {
            sellOffSafeGuardCheck(price.data.amount, time.data.epoch);
          }

          if (checkForRebound) { 
            console.log(150);

            // Email yourself a notification when approaching reinvest threshold
            if (price.data.amount <= 500) {  
              if (time.data.epoch - emailTiming.priceLessThan500 >= 3600) {
                cb.transporter.sendMail(emailMsg.priceLessThan500, (err, info) => {
                  if (err) {
                    console.log(err)
                  } else {
                    console.log('email sent', info.response)
                    emailTiming.priceLessThan500 = time.data.epoch
                  }
                })
              }
            }

            // Hard coded this to $150 to wait for did to really low price
            if (price.data.amount <= 150) {

              // needs to set the reinvest amount to equal the amount sold off
              amountToPurchase = buyPriceAtLastSale.valueUSD;
              
              // once the downward trend starts to reverse, rebuy ether
              buyPercentageDrop = 2;
            }
          }
          
          if (percentageDrop < buyPercentageDrop){
            // Purchase coin
            cb.client.getAccount(cb.accountPayment.ETHAccountId, function(err, account) {
              account.buy({"amount": amountToPurchase.toString(),
                           "currency": "USD",
                           "payment_method": cb.accountPayment.fiatPaymentMethodId}, function(err, tx) {
                             // Make sure enough funds in wallet before updating most recent paid price
                            if (!err) {
                            console.log(tx);
                            fs.writeFileSync(path.join(__dirname, 'most-recent-paidprice.json'), JSON.stringify({PaidPrice: +price.data.amount, time: time.data.epoch }))
                          } else {
                            console.log(err)
                          }
              });
            });
            
            // add to total buy in
            totalBuyIn = fs.readFileSync(path.join(__dirname, 'sell-balance-threshold.json')).toString('utf-8');
            totalBuyIn = JSON.parse(totalBuyIn);  
            console.log(totalBuyIn)
            totalBuyIn = totalBuyIn['Total-Buy-In'];
            checkForRebound = false;

            fs.writeFileSync(path.join(__dirname, 'sell-balance-threshold.json'), JSON.stringify({'Total-Buy-In': totalBuyIn + amountToPurchase, 'Check-For-Rebound': 'false', 'buyPriceAtLastSale': buyPriceAtLastSale.buyPriceAtLastSale, 'valueUSD': buyPriceAtLastSale.valueUSD, 'time': buyPriceAtLastSale.time}))

            // Reset 5 hour timer
            fs.writeFile((path.join(__dirname, 'buy-price.json')), JSON.stringify({BuyPrice: price.data.amount, time: time.data.epoch }), (err) => {
              if (err) console.log(err)
              console.log(`NEW PRICE: ${price.data.amount} TIME: ${time.data.epoch}`)

              fs.readFile((path.join(__dirname, 'buy-price.json')), (err, data) => {
                if (err) throw err;
                previousFiveHour = JSON.parse(data.toString());
              });
            });
          }
        }
      }
    })
  }) 
}

function sellOffSafeGuardCheck(price, time) {
  // gets current total ammount USD spent on coin
  totalBuyIn = fs.readFileSync(path.join(__dirname, 'sell-balance-threshold.json')).toString('utf-8');
  totalBuyIn = JSON.parse(totalBuyIn);  
  console.log(totalBuyIn)
  checkForRebound = (totalBuyIn['Check-For-Rebound'] === 'true');
  totalBuyIn = totalBuyIn['Total-Buy-In'];

  // get current ETH account value
  cb.client.getAccount(cb.accountPayment.ETHAccountId, function(err, account) {
    ETHAccountTotal = account.native_balance.amount;

    console.log(`TOTAL BUY IN: ${totalBuyIn}, ETH ACCOUNT TOTAL: ${account.native_balance.amount}`);

  // Email yourself a notification when approaching threshold
  if (time - emailTiming.approachingSafeguard >= 3600) {
    cb.transporter.sendMail(emailMsg.approachingSafeguard, (err, info) => {
      if (err) {
        console.log(err)
      } else {
        console.log('email sent', info.response)
        emailTiming.approachingSafeguard = time.data.epoch
      }
    })
  }

  if (totalBuyIn > 0 && totalBuyIn > ETHAccountTotal) {
    console.log('TIME TO SELL');
    checkForRebound = true;
    console.log('check for rebound', checkForRebound);

    cb.client.getAccount(cb.accountPayment.ETHAccountId, function(err, account) {
      account.sell({"amount": (ETHAccountTotal - 2).toString(),
        "currency": "USD",
        "payment_method": cb.accountPayment.fiatPaymentMethodId}, function(err, tx) {
        console.log(tx);
        console.log(err);
      });
    });

    fs.writeFileSync(path.join(__dirname, 'sell-balance-threshold.json'), JSON.stringify({'Total-Buy-In': 0, 'Check-For-Rebound': 'true', 'buyPriceAtLastSale': price, 'valueUSD': totalBuyIn, 'time': time }))

  // Reset 5 hour timer
  fs.writeFile((path.join(__dirname, 'buy-price.json')), JSON.stringify({BuyPrice: price, time: time }), (err) => {
    if (err) console.log(err)
    console.log(`NEW PRICE: ${price} TIME: ${time}`)

    fs.readFile((path.join(__dirname, 'buy-price.json')), (err, data) => {
      if (err) throw err;
      previousFiveHour = JSON.parse(data.toString());
    });
  });
  }
  })
}

function setBuyPercentageDrop(price) {
  // Get latest paid price
  fs.readFile((path.join(__dirname, 'most-recent-paidprice.json')), (err, data) => {
    if (err) throw err;
    mostRecentPaidPrice = JSON.parse(data.toString());

    if (price >= mostRecentPaidPrice.PaidPrice * 1.1) {
      buyPercentageDrop = -5;
    } else if (price >= mostRecentPaidPrice.PaidPrice * 1.05 && price < mostRecentPaidPrice.PaidPrice * 1.1) {
      buyPercentageDrop = -7
    } else {
      buyPercentageDrop = -10
    }

    if (checkForRebound) {
      buyPercentageDrop = -1000
    }

  });
}

function checkForBankDeposit(time) {
    // Currently set up for monthly deposits of 52 dollars
    // get time of last deposit, then check if it has been a month
    let timeOfLastDeposit;
    timeOfLastDeposit = fs.readFileSync(path.join(__dirname, 'latest-deposit.json')).toString('utf-8');
    timeOfLastDeposit = JSON.parse(timeOfLastDeposit).timeOfDeposit;

    // console.log('time until next deposit', (timeOfLastDeposit + 2.628e+6) - time)

    if (time >= timeOfLastDeposit + 2.628e+6) {
      cb.client.getAccount(cb.accountPayment.fiatAccountId, function(err, account) {
        console.log(account)

        account.deposit({"amount": "53",
                         "currency": "USD",
                         "payment_method": cb.accountPayment.bankAccountId}, function(err, tx) {
          console.log(tx);
          if (err) console.log(err);
        });

        fs.writeFile((path.join(__dirname, 'latest-deposit.json')), JSON.stringify({monthlyDepositAmount: 53, timeOfDeposit: time }), (err) => {
          if (err) console.log(err)
        })
      });
    }
}