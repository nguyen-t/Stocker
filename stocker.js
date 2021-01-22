const puppeteer = require('puppeteer');
const TxtMsg = require('./txtmsg.js');

// Convenient constants
const SITE = {
  'Amazon': 'https://amazon.com',
  'BestBuy': 'https://www.bestbuy.com',
  'BnH': 'https://www.bhphotovideo.com',
  'Newegg': 'https://www.newegg.com'
};
const AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.96 Safari/537.36';
const INTERVAL = 30000;

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
 * @Param Array of ASINs
 * @Param Callback function
 */
// Monitors Amazon inventory based on ASINs
async function Amazon(asins, callbacks) {
  let page = (await pages.next()).value;

  return setInterval(async () => {
    for(asin of asins) {
      if(!(await page.goto(SITE.Amazon + `/dp/${asin}`)).ok()) {
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

        return text.includes('Currently unavailable') || text.includes('Available from these sellers.')
          ? false
          : true;
      }, div);

      for(let cb of callbacks) {
        cb(page, name, stocked);
      }
    }
  }, INTERVAL);
}

/*
 * @Param Array of SKUs
 * @Param TxtMsg instance
 */
// Monitors BestBuy inventory based on SKUs
async function BestBuy(skus, callbacks) {
  let page = (await pages.next()).value;

  return setInterval(async () => {
    for(sku of skus) {
      if(!(await page.goto(SITE.BestBuy + `/site/${sku}.p`)).ok()) {
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

        return text.includes('Sold Out')
          ? false
          : true;
      }, button);

      for(let cb of callbacks) {
        cb(page, name, stocked);
      }
    }
  }, INTERVAL);
}

/*
 * @Param Array of BH URL IDs
 * @Param Callback function
 */
// Monitors B&H Photo Video inventory based on IDs
async function BnH(ids, callbacks) {
  let page = (await pages.next()).value;

  return setInterval(async () => {
    for(id of ids) {
      if(!(await page.goto(SITE.BnH + `/c/product/${id}`)).ok()) {
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

        return text.includes('In Stock')
          ? true
          : false;
      }, div);

      for(let cb of callbacks) {
        cb(page, name, stocked);
      }
    }
  }, INTERVAL);
}


/*
 * @Param Array of Newegg item numbers
 * @Param Callback function
 */
// Monitors B&H Photo Video inventory based on IDs
async function Newegg(itemNums, callbacks) {
  let page = (await pages.next()).value;

  return setInterval(async () => {
    for(itemNum of itemNums) {
      if(!(await page.goto(SITE.Newegg + `/p/${itemNum}`)).ok()) {
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

        return text.includes('OUT OF STOCK.')
          ? false
          : true;
      }, div);

      for(let cb of callbacks) {
        cb(page, name, stocked);
      }
    }
  }, INTERVAL);
}

module.exports = {
  "Amazon": Amazon,
  "BestBuy": BestBuy,
  "BnH": BnH,
  "Newegg": Newegg
};
