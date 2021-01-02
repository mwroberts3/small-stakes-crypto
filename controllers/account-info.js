const coinbase = require('coinbase')
const { response } = require('express')
const Client = require('../models/sole-coinbase-account')

exports.getAccounts = (req, res, next) => {
    
    Client.getAccounts({}, (err, accounts) => {
        console.log(Client);
        // accounts.forEach(acct => {
        //     console.log('my bal: ' + acct.balance.amount + ' for ' + acct.name)
        // })
    })

    res.render('index')

}