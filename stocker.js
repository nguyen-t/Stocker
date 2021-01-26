const puppeteer = require('puppeteer');
const TxtMsg = require('./txtmsg.js');

// Convenient constants
const SITE = {
  'Adorama': 'https://adorama.com',
  'Amazon': 'https://amazon.com',
  'BestBuy': 'https://www.bestbuy.com',
  'BnH': 'https://www.bhphotovideo.com',
  'Newegg': 'https://www.newegg.com',
  'OfficeDepot': 'https://www.officedepot.com'
};
const AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.96 Safari/537.36';
const INTERVAL = 15000;

// Hides the fact that we're using puppeteer
function hide() {
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
    'headless': true,
    'defaultViewport': null
  });
  let context = browser.defaultBrowserContext();

  context.overridePermissions(SITE.BestBuy, ['geolocation']);

  while(true) {
    let page = await browser.newPage();

    await page.evaluateOnNewDocument(hide);
    await page.setUserAgent(AGENT);

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

	    console.log(sku.toUpperCase());
      await page.waitForSelector('.primary-info > h1');
      await page.waitForSelector(`${sku.toUpperCase()}_btn`);

      let header = await page.$('.primary-info > h1');
      let button = await page.$(`${sku.toUpperCase()}_btn`);
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

module.exports = {
  'Adorama': Adorama,
  'Amazon': Amazon,
  'BestBuy': BestBuy,
  'BnH': BnH,
  'Newegg': Newegg,
  'OfficeDepot': OfficeDepot
};
 
