const puppeteer = require('puppeteer');
const TxtMsg = require('./txtmsg.js');

// Convenient constants
const SITE = {
  'Amazon': 'https://amazon.com',
  'BestBuy': 'https://www.bestbuy.com',
  'BnH': 'https://www.bhphotovideo.com/'
}
const AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.96 Safari/537.36';
const INTERVAL = 30000;

/*
 * @Param Boolean for in stock
 */
// Makes terminal output colorful
function colorText(stocked) {
  const RED = '\033[38;2;255;0;0m';
  const GRN = '\033[38;2;0;255;0m';
  const RST = '\033[0m';

  if(stocked) {
    return `${GRN}In Stock${RST}`;
  } else {
    return `${RED}Out of Stock${RST}`
  }
}

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

// Gets local time
function time() {
  const options = {
    'year': 'numeric',
    'month': 'numeric',
    'day': 'numeric',
    'hour': 'numeric',
    'minute': 'numeric',
    'second': 'numeric',
    'hour12': false,
    'timeZoneName': 'short'
  };
  const formatter = new Intl.DateTimeFormat('en-US', options).format;

  return formatter(new Date());
}

/*
 * @Param Array of ASINs
 * @Param TxtMsg instance
 */
// Monitors Amazon inventory based on ASINs
async function Amazon(asins, messenger) {
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

      if(stocked) {
        messenger?.sendAll(`${name}\n${page.url()}`);
      }
      console.log(`[${time()}][Amazon] ${name}: ${colorText(stocked)}`);
    }
  }, INTERVAL);
}

/*
 * @Param Array of SKUs
 * @Param TxtMsg instance
 */
// Monitors BestBuy inventory based on SKUs
async function BestBuy(skus, messenger) {
  let page = (await pages.next()).value;

  return setInterval(async () => {
    for(sku of skus) {
      if(!(await page.goto(SITE.BestBuy + `/site/searchpage.jsp?st=${sku}`)).ok()) {
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

      if(stocked) {
        messenger?.sendAll(`${name}\n${page.url()}`);
      }
      console.log(`[${time()}][BestBuy] ${name}: ${colorText(stocked)}`);
    }
  }, INTERVAL);
}

/*
 * @Param Array of BH URL IDs
 * @Param TxtMsg instance
 */
// Monitors B&H Photo Video inventory based on IDs
async function BnH(ids, messenger) {
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

      if(stocked) {
        messenger?.sendAll(`${name}\n${page.url()}`);
      }
      console.log(`[${time()}][B&H Photo Video] ${name}: ${colorText(stocked)}`);
    }
  }, INTERVAL);
}

module.exports = {
  "Amazon": Amazon,
  "BestBuy": BestBuy,
  "BnH": BnH,
};
