# Small Stakes - Crypto

**Version 1.0.0**
<br>
**Released 3/15/21**
<br>

## Features

Basic Ether trading bot that works through the Coinbase API. Could be tweaked to work with any crypto coin.

## Usage

Usage is pretty self-explanatory. It's a node program that can be run in a terminal. One thing you'll have to do however is make a JavaScript file in the root directory called personal-data-pro.js, which contains personal email information and Coinbase Pro API information.

`module.exports = { key: 'your API key', secret:'your API secret', passphrase: 'your API passphrase', email: 'your email address', emailPass: 'your email password' }`

It might be worth using with forever.js depending on your setup.

## Basic Logic

The golden rule of trading applies here: <em>sell high and buy low</em>.

This section will be fleshed out more in the future, but as of 3/15/21 the bot is <em>barely</em> profit, so I guess the logic is sound on some level.

I think it's pretty easy to decipher how it works by looking at the code. It's not a very sophisticated bot that I'm sure is bested by most others out there. This is more of a pet project than anything.

## Updates to Come

The logic will be tweaked continuously I imagine, and I'll continue to update here.

I might also eventually convert this app to use the Binance API as that exchange charges less fees.

## Contributions

Please email mwroberts89@gmail.com if you're interested in contributing

## License

MIT
