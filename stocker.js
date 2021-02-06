const puppeteer = require('puppeteer');
const TxtMsg = require('./txtmsg.js');

// Convenient constants
const SITE = {
  'Adorama': 'https://adorama.com',
  'Amazon': 'https://amazon.com',
  'BestBuy': 'https://www.bestbuy.com',
  'BnH': 'https://www.bhphotovideo.com',
  'Newegg': 'https://www.newegg.com',
  'OfficeDepot': 'https://www.officedepot.com',
  'Staples': 'https://www.staples.com'
};
const AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.96 Safari/537.36';
const PERMISSIONS = ['notifications', 'geolocation'];
const INTERVAL = 30000;

// Hides the fact that we're using puppeteer
function hide() {
  Object.defineProperty(navigator, "languages", {
    get: function() {
      return ["en-US", "en"];
    }
  });

  Object.defineProperty(navigator, 'webdriver', {
    "get": () => false,
  });

  Object.defineProperty(navigator, 'plugins', {
    "get": () => [1, 2, 3, 4, 5]
  });

  window.chrome = {
    "runtime": {},
  };

  const originalQuery = window.navigator.permissions.query;
  return window.navigator.permissions.query = (parameters) => {
    return (parameters.name === 'notifications')
    ? Promise.resolve({ state: Notification.permission })
    : originalQuery(parameters);
  };
}

// Initializes only a single browser
// Generator function that creates a new page with universal settings
const pages = (async function* pager() {
  let browser = await puppeteer.launch({
    'headless': false,
    'defaultViewport': null,
    ignoreHTTPSErrors: true,
    'args': [
      '--no-sandbox',
      '--disable-notifications',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--window-position=0,0',
      '--ignore-certifcate-errors',
      '--ignore-certifcate-errors-spki-list',
      `--user-agent="${AGENT}"`
    ]
  });
  let context = browser.defaultBrowserContext();

  context.overridePermissions(SITE.Adorama, PERMISSIONS);
  context.overridePermissions(SITE.BestBuy, PERMISSIONS);

  let zero = (await browser.pages())[0];
  await zero.evaluateOnNewDocument(hide);
  await zero.setUserAgent(AGENT);

  zero.setDefaultNavigationTimeout(0);
  zero.setDefaultTimeout(0);

  yield zero;

  while(true) {
    let page = await browser.newPage();

    await page.evaluateOnNewDocument(hide);

    page.setDefaultNavigationTimeout(0);
    page.setDefaultTimeout(0);

    yield page;
  }
})();

/*
 * @Param Array of SKUs
 * @Param Callback functions
 */
// Monitors Adorama inventory based on SKUs
async function Adorama(skus, callbacks) {
  let page = (await pages.next()).value;

  return setInterval(async () => {
    for(let sku of skus) {
      try {
        if(!(await page.goto(SITE.Adorama + `/${sku}.html`)).ok()) {
          continue;
        }
      } catch(e) {
        continue;
      }

      await page.waitForSelector('.primary-info > h1');
      await page.waitForSelector(`#${sku.toUpperCase()}_btn`);

      let header = await page.$('.primary-info > h1');
      let button = await page.$(`#${sku.toUpperCase()}_btn`);
      let name = await page.evaluate(element => {
        let text = element.innerText;

        return text;
      }, header);
      let stocked = await page.evaluate(element => {
        let text = element.innerText;

        return !text.includes('Temporarily not available');
      }, button);

      for(let cb of callbacks) {
        cb(page, name, stocked);
      }
    }
  }, INTERVAL);
}

/*
 * @Param Array of ASINs
 * @Param Callback functions
 */
// Monitors Amazon inventory based on ASINs
async function Amazon(asins, callbacks) {
  let page = (await pages.next()).value;

  return setInterval(async () => {
    for(let asin of asins) {
      try {
        if(!(await page.goto(SITE.Amazon + `/dp/${asin}`)).ok()) {
          continue;
        }
      } catch(e) {
        continue;
      }

      await page.waitForSelector('#productTitle');
      await page.waitForSelector('#availability');

      let header = await page.$('#productTitle');
      let div = await page.$('#availability');
      let name = await page.evaluate(element => {
        let text = element.innerText;

        return text;
      }, header);
      let stocked = await page.evaluate(element => {
        let text = element.innerText;

        return !(text.includes('Currently unavailable') || text.includes('Available from these sellers.'));
      }, div);

      for(let cb of callbacks) {
        cb(page, name, stocked);
      }
    }
  }, INTERVAL);
}

/*
 * @Param Array of SKUs
 * @Param Callback functions
 */
// Monitors BestBuy inventory based on SKUs
async function BestBuy(skus, callbacks) {
  let page = (await pages.next()).value;

  return setInterval(async () => {
    for(let sku of skus) {
      try {
        if(!(await page.goto(SITE.BestBuy + `/site/${sku}.p`)).ok()) {
          continue;
       }
      } catch(e) {
        continue;
      }

      await page.waitForSelector('h1');
      await page.waitForSelector(`button[data-sku-id="${sku}"]`);

      let header = await page.$('h1');
      let button = await page.$(`button[data-sku-id="${sku}"]`);
      let name = await page.evaluate(element => {
        let text = element.innerText;

        return text;
      }, header);
      let stocked = await page.evaluate(element => {
        let text = element.innerText;

        return !text.includes('Sold Out');
      }, button);

      for(let cb of callbacks) {
        cb(page, name, stocked);
      }
    }
  }, INTERVAL);
}

/*
 * @Param Array of BH URL IDs
 * @Param Callback functions
 */
// Monitors B&H Photo Video inventory based on IDs
async function BnH(ids, callbacks) {
  let page = (await pages.next()).value;

  return setInterval(async () => {
    for(let id of ids) {
      try {
        if(!(await page.goto(SITE.BnH + `/c/product/${id}`)).ok()) {
          continue;
        }
      } catch(e) {
        continue;
      }

      await page.waitForSelector('h1[data-selenium="productTitle"]');
      await page.waitForSelector('div[data-selenium="stockInfo"]');

      let header = await page.$('h1[data-selenium="productTitle"]');
      let div = await page.$('div[data-selenium="stockInfo"]');
      let name = await page.evaluate(element => {
        let text = element.innerText;

        return text;
      }, header);
      let stocked = await page.evaluate(element => {
        let text = element.innerText;

        return text.includes('In Stock');
      }, div);

      for(let cb of callbacks) {
        cb(page, name, stocked);
      }
    }
  }, INTERVAL);
}


/*
 * @Param Array of Newegg item numbers
 * @Param Callback functions
 */
// Monitors Newegg inventory based on item numbers
async function Newegg(itemNums, callbacks) {
  let page = (await pages.next()).value;

  return setInterval(async () => {
    for(let itemNum of itemNums) {
      try {
        if(!(await page.goto(SITE.Newegg + `/p/${itemNum}`)).ok()) {
          continue;
        }
      } catch(e) {
        continue;
      }

      await page.waitForSelector('h1.product-title');
      await page.waitForSelector('div.product-inventory');

      let header = await page.$('h1.product-title');
      let div = await page.$('div.product-inventory');
      let name = await page.evaluate(element => {
        let text = element.innerText;

        return text;
      }, header);
      let stocked = await page.evaluate(element => {
        let text = element.innerText;

        return !text.includes('OUT OF STOCK.');
      }, div);

      for(let cb of callbacks) {
        cb(page, name, stocked);
      }
    }
  }, INTERVAL);
}

/*
 * @Param Array of Office Depot item numbers
 * @Param Callback functions
 */
// Monitors Office Depot inventory based on item numbers
async function OfficeDepot(itemNums, callbacks) {
  let page = (await pages.next()).value;

  return setInterval(async () => {
    for(let itemNum of itemNums) {
      try {
        if(!(await page.goto(SITE.OfficeDepot + `/a/products/${itemNum}`)).ok()) {
          continue;
        }
      } catch(e) {
        continue;
      }

      await page.waitForSelector('#skuHeading');
      await page.waitForSelector('#skuAvailability');

      let header = await page.$('#skuHeading');
      let div = await page.$('#skuAvailability');
      let name = await page.evaluate(element => {
        let text = element.innerText;

        return text;
      }, header);
      let stocked = await page.evaluate(element => {
        let text = element.innerText;

        return !text.includes('Out of stock');
      }, div);

      for(let cb of callbacks) {
        cb(page, name, stocked);
      }
    }
  }, INTERVAL);
}

/*
 * @Param Array of Staples item numbers
 * @Param Callback functions
 */
// Monitors Staples inventory based on item numbers
// Work in progress
async function Staples(itemNums, callbacks) {
  let page = (await pages.next()).value;

  return setInterval(async () => {
    for(let itemNum of itemNums) {
      try {
        if(!(await page.goto(SITE.Staples + `/product_${itemNum}`)).ok()) {
          continue;
        }
      } catch(e) {
        continue;
      }

      await page.waitForSelector('#productTitle');
      await page.waitForSelector('#skuAvailability'); // Needs to be changed

      let header = await page.$('#productTitle');
      let div = await page.$('#skuAvailability'); // Needs to be changed
      let name = await page.evaluate(element => {
        let text = element.innerText;

        return text;
      }, header);
      let stocked = await page.evaluate(element => {
        let text = element.innerText;

        return !text.includes('Out of stock'); // Needs to be changed
      }, div);

      for(let cb of callbacks) {
        cb(page, name, stocked);
      }
    }
  }, INTERVAL);
}

module.exports = {
  'Adorama': Adorama,
  'Amazon': Amazon,
  'BestBuy': BestBuy,
  'BnH': BnH,
  'Newegg': Newegg,
  'OfficeDepot': OfficeDepot
};
