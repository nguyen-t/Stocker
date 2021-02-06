const Stocker = require('./stocker.js');
const TxtMsg = require('./txtmsg.js');
const handler = require('./handler.js');
const credentials = require('./credentials.json');
const products = require('./products.json')

let messenger = new TxtMsg(credentials.email, credentials.password)
  .add(credentials.phone, credentials.carrier);
let callbacks = [handler.consolePrint, handler.toText(messenger)];

/* Adorama and B&H need captcha handlers*/

Stocker.Adorama(products.adorama, callbacks);
// Stocker.Amazon(products.amazon, callbacks);
Stocker.BestBuy(products.bestbuy, callbacks);
// Stocker.BnH(products.bnh, callbacks);
// Stocker.Newegg(products.newegg, callbacks);
Stocker.OfficeDepot(products.officedepot, callbacks);
