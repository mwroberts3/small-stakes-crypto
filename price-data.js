const fs = require('fs');
const cb = require('./sole-coinbase-account');
const path = require('path');


exports.getETHPrice = (req, res, next) => {
  cb.client.getAccount(cb.accountPayment.accountId, function(err, account) {
    console.log(account);
  })
  setInterval(checkAndBuyETH, 5000)
}

function checkAndBuyETH() {
  let previousFiveHour = {};
  fs.readFile((path.join(__dirname, 'buy-price.json')), (err, data) => {
    if (err) throw err;
    previousFiveHour = JSON.parse(data.toString());
  });

  let percentageDrop;

  cb.client.getSpotPrice({'currencyPair': 'ETH-USD'} , (err, price) => {
    cb.client.getTime((err, time) => {
      // check price and time data against what's in the buy-price.json file
      if (price && time) {
        percentageDrop = (price.data.amount / previousFiveHour.SpotPrice * 100) - 100;
        console.log(`${percentageDrop}`, price.data.amount, previousFiveHour.SpotPrice, time.data.epoch);

        if (err === null) {
          if (time.data.epoch > +previousFiveHour.time + 18000 || percentageDrop > 0) {
            fs.writeFile((path.join(__dirname, 'buy-price.json')), JSON.stringify({SpotPrice: price.data.amount, time: time.data.epoch }), (err) => {
              if (err) console.log(err)
              console.log(`NEW PRICE: ${price.data.amount} TIME: ${time.data.epoch}`)
            });
          }
          if (percentageDrop < -5){
            // Purchase coin
            cb.client.getAccount(cb.accountPayment.accountId, function(err, account) {
              account.buy({"amount": "10",

                           "currency": "USD",
                           "payment_method": cb.accountPayment.paymentMethodId}, function(err, tx) {
                             console.log(tx);
                          });
                        });
            
            // Reset 5 hour timer
            fs.writeFile((path.join(__dirname, 'buy-price.json')), JSON.stringify({SpotPrice: price.data.amount, time: time.data.epoch }), (err) => {
              if (err) console.log(err)
              console.log(`NEW PRICE: ${price.data.amount} TIME: ${time.data.epoch}`)
            });
          }
        }
      }
    })
  }) 
}

function sellOffSafeGuard() {
  // if ETH USD value is <= what I paid then sell off and rebuy when decline is reversed

  // get ETH USD balance
  // have separate JSON file that tracks buys and total amount bought in
  // check ETH USD balance against USD paid in
  // if ETH USD amount is less than USD paid in, sell off ETH track the percentage difference, once a negative percentage changes reverses reinvest USD
}