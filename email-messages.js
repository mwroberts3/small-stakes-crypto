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

// If you just made a purchase
exports.youJustSoldCrypto = {
  from: `"Small Stakes - Crypto" <${personalData.email}>`,
  to: personalData.email,
  subject: 'You Just Sold Crypto',
  html: `
  <strong>You just sold some crypto!</strong>
  <br>
  <br>
  <p>You just sold some crypto!</p>
  `
};




// notification when a withdrawal is made from bank account
exports.bankWithdrawal = {
  from: `"Small Stakes - Crypto" <${personalData.email}>`,
  to: personalData.email,
  subject: 'You Just Withdrew Money from Bank Account',
  html: `
  You just withdrew money from your bank accout, which will be used to purchase ETH.
  `
}
