const personalData = require('./personal-data')

let ETHAccountTotal;
let totalBuyIn;
let price = {data: 0, amount: 0};

// If you just made a purchase
exports.youJustBoughtCrypto = {
  from: `"Small Stakes - Crypto" <${personalData.email}>`,
  to: personalData.email,
  subject: 'You Just Bought Crypto',
  html: `
  <strong>You just purchased some crypto!</strong>
  <br>
  <br>
  <p>You just purchased some crypto!</p>
  `
};

// Approaching safeguard selloff
exports.approachingSafeguard = {
    from: `"Small Stakes - Crypto" <${personalData.email}>`,
    to: personalData.email,
    subject: 'Approaching Safeguard Threshold',
    html: `
    <strong>You are approaching your safeguard threshold</strong>
    <br>
    <br>
    <p>The value of your ethereum wallet is ${ETHAccountTotal}, and the threshold is ${totalBuyIn}, which is 100% of your total buy in.</p>
    <p>The situation is developing rapidly, so you may want to moniter</p>
    `
  };

// notification if price is less than 300
exports.priceLessThan500 = {
    from: `"Small Stakes - Crypto" <${personalData.email}>`,
    to: personalData.email,
    subject: 'ETH Price Now Below $500',
    html: `
    <strong>You are approaching your safeguard threshold</strong>
    <br>
    <br>
    <p>The buy price of ETH is now ${price.data.amount}, you may want to start monitoring the situation</p>
    `
}

// notification when a withdrawal is made from bank account
exports.bankWithdrawal = {
  from: `"Small Stakes - Crypto" <${personalData.email}>`,
  to: personalData.email,
  subject: 'You Just Withdrew Money from Bank Account',
  html: `
  You just withdrew money from your bank accout, which will be used to purchase ETH.
  `
}
