const personalData = require('../personal-data.js')

const Client = require('coinbase').Client
const client = new Client({'apiKey': personalData.key, 'apiSecret': personalData.secret})

module.exports = client

