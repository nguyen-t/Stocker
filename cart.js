const puppeteer = require('puppeteer');

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
const TIMEOUT = 0;
const USED = new Set();

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

const pages = (async function*() {
  browser = await puppeteer.launch({
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

  context.overridePermissions('https://www.bestbuy.com', PERMISSIONS);

  let zero = (await browser.pages())[0];

  await zero.evaluateOnNewDocument(hide);

  zero.setDefaultNavigationTimeout(TIMEOUT);
  zero.setDefaultTimeout(TIMEOUT);

  yield zero;

  while(true) {
    let page = await browser.newPage();

    await page.evaluateOnNewDocument(hide);

    page.setDefaultNavigationTimeout(TIMEOUT);
    page.setDefaultTimeout(TIMEOUT);

    yield page;
  }
})();

async function BestBuy(url, name, stocked) {
  if(!stocked) {
    return;
  }
  if(!url.includes(SITE.BestBuy)) {
    return;
  }
  if(USED.has(url)) {
    return;
  }

  USED.add(url);

  let page = (await pages.next()).value;

  await page.goto(url);
  await page.waitForSelector('.btn-primary.add-to-cart-button');

  do {
    await page.click('.btn-primary.add-to-cart-button');
    await page.waitForTimeout(2000);
  } while((await page.$('.c-overlay-fullscreen')) == null);

  await page.goto(SITE.BestBuy + '/cart');
}

module.exports = {
  BestBuy
};
