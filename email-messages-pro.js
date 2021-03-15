const personalData = require('./personal-data-pro')

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
exports.youJustSoldSafe = {
  from: `"Small Stakes - Crypto" <${personalData.email}>`,
  to: personalData.email,
  subject: 'You Just SAFE Sold Crypto',
  html: `
  <strong>You just SAFE sold some crypto!</strong>
  <br>
  <br>
  <p>You just sold SAFE some crypto!</p>
  `
};

// If you just made a purchase
exports.youJustSoldHigh = {
  from: `"Small Stakes - Crypto" <${personalData.email}>`,
  to: personalData.email,
  subject: 'You Just HIGH Sold Crypto',
  html: `
  <strong>You just HIGH sold some crypto!</strong>
  <br>
  <br>
  <p>You just sold HIGH some crypto!</p>
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
