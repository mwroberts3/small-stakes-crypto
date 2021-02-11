const fs = require('fs');
const cb = require('./sole-coinbase-account');
const path = require('path');
const emailMsg = require('./email-messages');

let totalBuyIn;
let checkForRebound;
let ETHAccountTotal;
let previousFiveHour = {};
let mostRecentPaidPrice;

let buyPercentageDrop;
let amountToPurchase;

let emailTiming = {
  approachingSafeguard: 0,
  priceLessThan500: 0
};

// resets current price every 10 hours, unless there's been an increase
let resetInterval = 36000;

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
  cbTransactionFee = 1.49;

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
          if (time.data.epoch > +previousFiveHour.time + resetInterval || percentageDrop > 0) {
            resetPctDropTimer(price.data.amount, time.data.epoch);
          }

          // if (percentageDrop < -5 && !checkForRebound) {
          //   sellOffSafeGuardCheck(price.data.amount, time.data.epoch);
          // }

          // if (checkForRebound) { 
          //   console.log(150);

          //   // Email yourself a notification when approaching reinvest threshold
          //   if (price.data.amount <= 500) {  
          //     if (time.data.epoch - emailTiming.priceLessThan500 >= 3600) {
          //       cb.transporter.sendMail(emailMsg.priceLessThan500, (err, info) => {
          //         if (err) {
          //           console.log(err)
          //         } else {
          //           console.log('email sent', info.response)
          //           emailTiming.priceLessThan500 = time.data.epoch
          //         }
          //       })
          //     }
          //   }

          //   // Hard coded this to $150 to wait for did to really low price
          //   if (price.data.amount <= 150) {

          //     // needs to set the reinvest amount to equal the amount sold off
          //     amountToPurchase = buyPriceAtLastSale.valueUSD;
              
          //     // once the downward trend starts to reverse, rebuy ether
          //     buyPercentageDrop = 2;
          //   }
          // }
          
          if (percentageDrop < buyPercentageDrop){
            // Purchase coin
            cb.client.getAccount(cb.accountPayment.ETHAccountId, function(err, account) {
              account.buy({"amount": amountToPurchase.toString(),
                           "currency": "USD",
                           "payment_method": cb.accountPayment.fiatPaymentMethodId
              }, function(err, tx) {
                if (!err) {
                  // Send email notification
                  cb.transporter.sendMail(emailMsg.youJustBoughtCrypto, (err, info) => {
                      if (err) {
                        console.log(err)
                      } else {
                        console.log('email sent', info.response)
                      }
                    }
                  )

                  // Update most recent paid price
                  console.log(tx);
                  fs.writeFileSync(path.join(__dirname, 'most-recent-paidprice.json'), JSON.stringify({PaidPrice: +price.data.amount, time: time.data.epoch }))

                  // get former total buy in
                  totalBuyIn = fs.readFileSync(path.join(__dirname, 'sell-balance-threshold.json')).toString('utf-8');
                  totalBuyIn = JSON.parse(totalBuyIn);  
                  console.log(totalBuyIn)
                  totalBuyIn = totalBuyIn['Total-Buy-In'];
                  checkForRebound = false;

                  // add to total buy in
                  fs.writeFileSync(path.join(__dirname, 'sell-balance-threshold.json'), JSON.stringify({
                    'Total-Buy-In': totalBuyIn + amountToPurchase + cbTransactionFee, 
                    'Check-For-Rebound': 'false', 
                    'buyPriceAtLastSale': buyPriceAtLastSale.buyPriceAtLastSale, 
                    'valueUSD': buyPriceAtLastSale.valueUSD, 
                    'time': buyPriceAtLastSale.time
                  }))

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

    resetPctDropTimer(price, time);
  }
  })
}

function setBuyPercentageDrop(price) {
  // Get latest paid price
  fs.readFile((path.join(__dirname, 'most-recent-paidprice.json')), (err, data) => {
    if (err) throw err;

    mostRecentPaidPrice = JSON.parse(data.toString());

    if (price >= mostRecentPaidPrice.PaidPrice * 1.25) {
      buyPercentageDrop = -1;
    } else if (price >= mostRecentPaidPrice.PaidPrice * 1.1) {
      buyPercentageDrop = -3;
    } else if (price >= mostRecentPaidPrice.PaidPrice * 1.05 && price < mostRecentPaidPrice.PaidPrice * 1.1) {
      buyPercentageDrop = -5;
    } else {
      buyPercentageDrop = -7
    }
  });
}

function checkForBankDeposit(time) {
    // Currently set up for monthly deposits of 53 dollars
    // get time of last deposit, then check if it has been a month
    let timeOfLastDeposit;
    timeOfLastDeposit = fs.readFileSync(path.join(__dirname, 'latest-deposit.json')).toString('utf-8');
    timeOfLastDeposit = JSON.parse(timeOfLastDeposit).timeOfDeposit;

    // console.log('time until next deposit', (timeOfLastDeposit + 604800) - time)
    // 2.628e+6 - 4 weeks
    // 1.21e+6 - 2 weeks
    // 604800 - 1 week

    if (time >= timeOfLastDeposit + 604800) {
      cb.client.getAccount(cb.accountPayment.fiatAccountId, function(err, account) {
        console.log(account)

        account.deposit({"amount": "26.5",
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

        fs.writeFile((path.join(__dirname, 'latest-deposit.json')), JSON.stringify({monthlyDepositAmount: 26.5, timeOfDeposit: time }), (err) => {
          if (err) console.log(err)
        })
      });
    }
}

function resetPctDropTimer(price, time) {
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