const personalData = require('./personal-data.js')
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: personalData.email,
        pass: personalData.emailPass
    }
})

exports.transporter = transporter;

const Client = require('coinbase').Client
const client = new Client({
    'apiKey': personalData.key, 
    'apiSecret': personalData.secret,
    strictSSL: false
})

exports.client = client;

// export account and payment codes
exports.accountPayment = {
    ETHAccountId: personalData.ETHAccountId,
    fiatPaymentMethodId: personalData.fiatPaymentMethodId,
    fiatAccountId: personalData.fiatAccountId,
    bankAccountId: personalData.bankAccountId
}
