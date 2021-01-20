const Stocker = require('./stocker.js');
const TxtMsg = require('./txtmsg.js');
const credentials = require('./credentials.json');
const products = require('./products.json')

let messenger = new TxtMsg(credentials.email, credentials.password)
  .add(credentials.phone, credentials.carrier);

Stocker.Amazon(products.amazon, messenger);
Stocker.BestBuy(products.bestbuy, messenger);
Stocker.BnH(products.bnh, messenger);
Stocker.Newegg(products.newegg, messenger);
