const personalData = require('./personal-data.js')

const Client = require('coinbase').Client
const client = new Client({
    'apiKey': personalData.key, 
    'apiSecret': personalData.secret,
    strictSSL: false
})

exports.client = client;

// export account and payment codes
exports.accountPayment = {
    accountId: personalData.accountId,
    paymentMethodId: personalData.paymentMethodId
}
