const ssSettingsContainer = document.getElementById('bot-settings');
const editSettingPopup = document.getElementById('edit-setting-popup');
const analyticsDisplay = document.getElementById('analytics');

let settings = {};

let currentBuyPriceHigh;

// functions
// display current ETH price and 24 hour price
const currentETHPrice = async () => {
    let ETHPrice = await fetch('https://api.pro.coinbase.com/products/ETH-USD/stats');
    
    ETHPrice = await ETHPrice.json();

    let timeNow = Math.round(new Date().getTime() / 1000);
    let timeYesterday = timeNow - 86400;
    timeNow = new Date(timeNow*1000).toISOString();
    timeYesterday = new Date(timeYesterday*1000).toISOString();

    let uri = new URL(`https://api.pro.coinbase.com/products/ETH-USD/candles?start=${timeYesterday}&end=${timeNow}&granularity=${300}`);

    let price24HoursEarlier = await fetch(uri);
    
    price24HoursEarlier = await price24HoursEarlier.json();

    let approx24HourPrice = -(((price24HoursEarlier[price24HoursEarlier.length-1][3]/ETHPrice.last) - 1) * 100).toFixed(2);

    console.log((ETHPrice.open/ETHPrice.last)-1);

    // not sure if this is right, but seems a little closer to what coinbase is showing
    approx24HourPrice = +(((ETHPrice.open/ETHPrice.last) - 1) * 100).toFixed(2);

    approx24HourPrice > 0 ? document.getElementById('24-hour-price').classList.add('positive-change') : document.getElementById('24-hour-price').classList.add('negative-change');

    document.getElementById('current-ETH-price').textContent = ETHPrice.last;
    document.getElementById('24-hour-price').textContent = `~ ${approx24HourPrice}%`;
}

const displayCurrentAccountInfo = async() => {
    let buyPriceHistory = await fetch('http://localhost:3040/buyPriceHistory');
    buyPriceHistory = await buyPriceHistory.json();
    currentBuyPriceHigh = buyPriceHistory[0];

    let lastHighSale = await fetch('http://localhost:3040/lastHighSale');
    lastHighSale = await lastHighSale.json();

    let sellOffBank = await fetch('http://localhost:3040/sellOffBank');
    sellOffBank = await sellOffBank.json();
    
    const accountInfoDisplay = document.getElementById('account-info');

    
    let lhsDisplay = [];

    lastHighSale.prices.forEach(sale => {
        lhsDisplay.push(`${sale.price} - ${sale.unbalancedSales}`)
    })

    accountInfoDisplay.innerHTML += `
        <div class="account-info-line">
            <strong>Buy Price History: </strong>${buyPriceHistory}
        </div>
        <div class="account-info-line">
            <strong>ETH Balance: </strong>${sellOffBank.ETHbalance}
        </div>
        <div class="account-info-line">
            <strong>Unbalanced Sales: </strong>${lhsDisplay}
        </div>
        <div class="account-info-line" style="margin-left: 25px; padding-top: 0;">
            <strong>Last High Sale: </strong>${new Date(lastHighSale.time)}
        </div>
    `
}

const fetchAnalytics = async () => {
    let uri = 'http://localhost:3050/smallStakesAnalytics';

    let analytics = await fetch(uri);
    analytics = await analytics.json();

    analyticsDisplay.innerHTML += `
        <div>
            <strong>Hauls Since 3/11/21: </strong>${analytics.rebalanceHauls.length}
        </div>`

    analytics.rebalanceHauls.reverse().forEach(haul => {
        analyticsDisplay.innerHTML += `
        <div class="haul-card"> 
            <p><strong>High Sale Price: </strong>${haul.highSalePrice}</p>
            <p><strong>High Sale Size: </strong>${haul.size}</p>
            <p><strong>Buy Back Average Price: </strong>${haul.buyBackAvgPrice}</p>
            <p><strong>Buy Back Size: </strong>${haul.buyBackSize}</p>
            <p><strong>Post Sale High: </strong>${haul.postSaleHigh}</p>
            <p><strong>Post Sale Low: </strong>${haul.postSaleLow}</p>
            <p style="margin-left: 25px"><strong>Haul Size: </strong>${(haul.buyBackSize - haul.size).toFixed(10)}</p>
            <p style="margin-left: 25px"><strong>Pct Gain: </strong>${((haul.buyBackSize / haul.size) - 1).toFixed(4)}%</p>
        </div>
    `
    })
}

const fetchCurrentSettings = async () => {
    let uri = 'http://localhost:3030/smallStakesBotSettings';

    settings = await fetch(uri);
    settings = await settings.json();

    ssSettingsContainer.innerHTML += `
        <div class="setting-line not-live">
            <strong>Base Buy/Sell Amount:</strong> <span id="settings.basicBuySellAmount" class="setting">$${settings.basicBuySellAmount}</span>
        </div>
        <div class="setting-line not-live">
            <strong>Reset Interval:</strong> <span id="settings.resetInterval" class="setting">${+(settings.resetInterval/3600000).toFixed(2)} Hours</span>
        </div>
            <h3><u>High Sale Percentage Triggers</u></h3>
            <div style="margin-left: 25px;">
                <div class="setting-line">
                    <strong>24 Hour Down:</strong> <span id="settings.HighSalePctTrigger.PctTriggers.oneDayDown" class="setting">${settings.HighSalePctTrigger.PctTriggers.oneDayDown * 100}% </span>${(currentBuyPriceHigh * settings.HighSalePctTrigger.PctTriggers.oneDayDown).toFixed(2)}
                </div>
                <div class="setting-line">
                    <strong>24 Hour Up - Low:</strong> <span id="settings.HighSalePctTrigger.PctTriggers.oneDayUpLow" class="setting">${settings.HighSalePctTrigger.PctTriggers.oneDayUpLow * 100}% </span>${(currentBuyPriceHigh * settings.HighSalePctTrigger.PctTriggers.oneDayUpLow).toFixed(2)}
                </div>
                <div class="setting-line">
                    <strong>24 Hour Up - High:</strong> <span id="settings.HighSalePctTrigger.PctTriggers.oneDayUpHigh" class="setting">${settings.HighSalePctTrigger.PctTriggers.oneDayUpHigh * 100}% </span>${(currentBuyPriceHigh * settings.HighSalePctTrigger.PctTriggers.oneDayUpHigh).toFixed(2)}
                </div>
                <div class="setting-line" style="margin-left: 25px; padding-top: 0">
                    <strong>24 Hour Change Trigger for High Sale - High: </strong><span id="settings.HighSalePctTrigger.rawDiffUpHighCutoff" class="setting">${(settings.HighSalePctTrigger.rawDiffUpHighCutoff * 100).toFixed(1)}%</span>
                </div>
            </div>
            <h3><u>Percentage Drop Trigger</u></h3>
            <div style="margin-left: 25px">
                <div class="setting-line">
                    <strong>w/ Sell Off Balance and 24 Hour Up:</strong> <span id="settings.percentageDropTrigger.withSellOffBalance.oneDayUp" class="setting">${settings.percentageDropTrigger.withSellOffBalance.oneDayUp}%</span>
                </div>
                <div class="setting-line">
                    <strong>w/ Sell Off Balance and 24 Hour Down:</strong> <span id="settings.percentageDropTrigger.withSellOffBalance.oneDayDown" class="setting">${settings.percentageDropTrigger.withSellOffBalance.oneDayDown}%</span>
                </div>
                <div class="setting-line">
                    <strong>w/o Sell Off Balance:</strong> <span id="settings.percentageDropTrigger.noSellOffBalance" class="setting">${settings.percentageDropTrigger.noSellOffBalance}%</span>
                </div>
            </div>
        <h3><u>Surge Safety Buys</u></h3>
        <div style="margin-left: 25px">
            <div class="setting-line">
                <strong>Upsurge Saftety Buy Percentage Drop:</strong> <span id="settings.upsurgeSafetyBuyPctDrop" class="setting">${+((settings.upsurgeSafetyBuyPctDrop - 1) * 100).toFixed(2)}%</span>
            </div>
            <div class="setting-line">
                <strong>Downsurge Saftety Buy Percentage Drop:</strong> <span id="settings.downsurgeSafetyBuyPctDrop" class="setting">${+((settings.downsurgeSafetyBuyPctDrop - 1) * 100).toFixed(2)}%</span>
            </div>
        </div>
        <div class="setting-line">
            <strong>Splice Off Percentage Drop:</strong> <span id="settings.spliceOffSafeGuard" class="setting">${100-(settings.spliceOffSafeGuard * 100)}%</span>
        </div> 
        `
        }
        
const submitSettingChange = async (settingName, value) => {
    // ensure negative values for negative settings
    if (settingName === 'settings.percentageDropTrigger.withSellOffBalance.oneDayUp' || settingName === 'settings.percentageDropTrigger.withSellOffBalance.oneDayDown' || settingName === 'settings.percentageDropTrigger.noSellOffBalance' || settingName === 'settings.upsurgeSafetyBuyPctDrop' || settingName === 'settings.downsurgeSafetyBuyPctDrop') {
        if (value >= 0) {
            alert('setting must be less than zero, setting to -10. Please reset');
            value = -10;
        }
    }

    // adjust exact value depending on setting
    if (settingName === "settings.HighSalePctTrigger.PctTriggers.oneDayDown" || settingName === "settings.HighSalePctTrigger.PctTriggers.oneDayUpHigh" || settingName === "settings.HighSalePctTrigger.PctTriggers.oneDayUpLow" || settingName === "settings.HighSalePctTrigger.rawDiffUpHighCutoff") {
        value = value/100;
    } else if (settingName === "settings.spliceOffSafeGuard") {
        value = (100 - value) / 100;
    } else if (settingName === "settings.upsurgeSafetyBuyPctDrop" || settingName === "settings.downsurgeSafetyBuyPctDrop" ) {
        value = (100 - (-value)) / 100;
    }
    
    settingName = settingName.substring(9);
    settingName = settingName.split('.');

    if (settingName.length === 1) {
        settings[settingName[0]] = +value;
    } else if (settingName.length === 2) {
        settings[settingName[0]][settingName[1]] = +value;
    }  else if (settingName.length === 3) {
        settings[settingName[0]][settingName[1]][settingName[2]] = +value;
    }

    let uri = 'http://localhost:3030/smallStakesBotSettings';

    await fetch(uri, {
        method: 'PUT',
        body: JSON.stringify(settings),
        headers: {'Content-Type': 'application/json'}
    });

}

// event listeners
ssSettingsContainer.addEventListener('click', (e) => {
    if(e.target.tagName==='SPAN') {
        editSettingPopup.classList.remove('hidden');
        editSettingPopup.children[0].textContent = e.target.previousElementSibling.textContent;
        editSettingPopup.className = e.target.id;
    } else {
        editSettingPopup.classList.add('hidden');
    }
});

editSettingPopup.addEventListener('click', (e) => {
    if(e.target.tagName ==='BUTTON') {
        submitSettingChange(e.target.parentNode.className,e.target.previousElementSibling.value);
        editSettingPopup.classList.add('hidden');
    }
})

document.getElementById('toggle-analytics-display').addEventListener('click', () => {
    analyticsDisplay.classList.toggle('hidden');
})

// init app
// get current buyPrice[0] to calculate high sell off prices
fetch('http://localhost:3040/buyPriceHistory')
    .then(data => data.json())
    .then(data => {
        currentBuyPriceHigh = data[0];
    })
    .then(() => {
        currentETHPrice();
        setInterval(()=>{
            currentETHPrice();
        }, 3000);
        
        displayCurrentAccountInfo();
        fetchAnalytics();
        fetchCurrentSettings();
    })


