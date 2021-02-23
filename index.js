const { Worker } = require('worker_threads');
const Stocker = require('./stocker.js');
const TxtMsg = require('./txtmsg.js');
const auth = require('./auth.js');
const handler = require('./handler.js');
const products = require('./limited.json');
const credentials = process.env;

async function monitor() {
  let account = await auth(credentials.email, credentials.client_id, credentials.client_secret, credentials.refresh_token);
  let messenger = new TxtMsg(account)
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

}

let worker = new Worker('./server.js');
monitor();
