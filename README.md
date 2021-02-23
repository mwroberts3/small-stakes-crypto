# Small Stakes - Crypto

**Version 0.5.0**
<br>
**Released 1/11/21**
<br>

## Features

This is a very basic Coinbase-based crypto trading bot, though I hesitate to call it a bot, because I wouldn't trust it to run on its own at this point

## Usage

You might have to have some basic knowledge of node.js to get the most out of this an understand its inner-workings. But, overall, the logic is not complicated and is still getting iterated upon.

The basic principle of is to have the bot watch for a sharp dip in price over a given amount of time and invest at that moment, before it rebounds.

I don't think I have to go into too detail, but this might be fun to look at for a node beginner who wants play around with trading bots, though give the current state of crypto, now is probably not the best to start investing.

The only thing not included in this repo is my personal account data, required for the bot run properly. You'll need to make your own personal-data.js file and fill it out with your own information.

`module.exports = { key: 'your Coinbase API key', secret: 'your Coinbase API secret', ETHAccountId: 'your ETH coinbase account id', fiatPaymentMethodId: 'your fiat payment method id', fiatAccountId: 'your fiat account id', bankAccountId: 'your bank account id', email: 'your gmail', emailPass: 'your gmail password' }`

Not reflected in the package.json file is Forever.js, which I strong recommend running this script through. Also, I made a batch file and put a shortcut in my PC's startup folder so the script will start running automatically if computer is shutdown and restarted.

## Basic Logic of Bot

-selling off occurs when the current buy price of ETH is less than 90% of the most recent transaction price
-this is based around a $26.49 transaction per week

## Updates to Come

I will probably wait until ETH is relative stable and cheaper before continuing serious work on this program. Ultimately I want this to be a 'set it and forget about it' kind of program.
