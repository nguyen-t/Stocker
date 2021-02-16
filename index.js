const express = require('express');
const Stocker = require('./stocker.js');
const TxtMsg = require('./txtmsg.js');
const handler = require('./handler.js');
const credentials = require('./credentials.json') || process.env;
const products = require('./limited.json');
const cart = require('./cart.js');

const PORT = process.env.PORT || 3000;
const app = express();

let messenger = new TxtMsg(credentials.email, credentials.password)
  .add(credentials.phone, credentials.carrier);
let callbacks = [handler.consolePrint, handler.toText(messenger)];

/* Adorama and B&H need captcha handlers*/
let fx = [];

Object.keys(products).forEach((key) => {
  products[key].forEach(async (id) => {
    fx.push(await Stocker[key]?.(id, callbacks));
  });
});

setInterval(async () => {
  for(let f of fx) {
    f?.next();
  }
}, 30000);

app.get('/', (req, res) => {
  res.send('Online.');
});

app.listen(PORT);
