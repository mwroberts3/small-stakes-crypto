const path = require('path')

const express = require('express')
const app = express()
const port = 3000

app.set('view engine', 'ejs')
app.set('views', 'views')

app.use(express.static(path.join(__dirname, 'public')))

const accountController = require('./controllers/account-info')

app.get('/', accountController.getAccounts)

app.listen(port)