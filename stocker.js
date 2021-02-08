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
const TIMEOUT = 0;

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
const pages = (async function*() {
  let browser = await puppeteer.launch({
    'headless': true,
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

async function* queryPage(url, nameSelector, itemSelector) {
  let page = (await pages.next()).value;

  try {
    if(!(await page.goto(url)).ok()) {
      await page.close();
      return;
    }

    await page.waitForSelector(nameSelector);

    let nameElement = await page.$(nameSelector);
    let itemName = await page.evaluate(element => {
      return element.innerText;
    }, nameElement);

    yield itemName;
  } catch(e) {
    await page.close();
    return;
  }

  while(true) {
    try {
      if(!(await page.goto(url)).ok()) {
        yield;
      }

      await page.waitForSelector(itemSelector);

      let itemElement = await page.$(itemSelector);
      let itemStatus = await page.evaluate(element => {
        return element.innerText;
      }, itemElement);

      yield itemStatus;
    } catch(e) {
      yield;
    }
  }
}

/*
 * @Param SKU
 * @Param Callback functions
 */
// Monitors Adorama inventory based on SKU
async function* Adorama(sku, callbacks) {
  let url = SITE.Adorama + `/${sku}.html`;
  let nameSelector = '.primary-info > h1';
  let itemSelector = `#${sku.toUpperCase()}_btn`;
  let query = queryPage(url, nameSelector, itemSelector);
  let itemName = (await query.next()).value;

  if(itemName == null) {
    return;
  }

  while(true) {
    let itemStatus = (await query.next()).value;
    let inStock = !(itemStatus?.includes('Temporarily not available'));

    if(itemStatus !== undefined) {
      for(let callback of callbacks) {
        callback(url, itemName, inStock);
      }
    }
    yield;
  }
}

/*
 * @Param Array of ASINs
 * @Param Callback functions
 */
// Monitors Amazon inventory based on ASINs
async function* Amazon(asin, callbacks) {
  let url = SITE.Amazon + `/dp/${asin}`;
  let nameSelector = '#productTitle';
  let itemSelector = `#availability`;
  let query = queryPage(url, nameSelector, itemSelector);
  let itemName = (await query.next()).value;

  if(itemName == null) {
    return;
  }

  while(true) {
    let itemStatus = (await query.next()).value;
    let inStock = !(itemStatus?.includes('Currently unavailable') || itemStatus?.includes('Available from these sellers.'));

    if(itemStatus !== undefined) {
      for(let callback of callbacks) {
        callback(url, itemName, inStock);
      }
    }
    yield;
  }
}

/*
 * @Param Array of SKUs
 * @Param Callback functions
 */
// Monitors BestBuy inventory based on SKUs
async function* BestBuy(sku, callbacks) {
  let url = SITE.BestBuy + `/site/${sku}.p`;
  let nameSelector = '.sku-title > h1';
  let itemSelector = `button[data-sku-id="${sku}"]`;
  let query = queryPage(url, nameSelector, itemSelector);
  let itemName = (await query.next()).value;

  if(itemName == null) {
    console.log("FAIL");
    return;
  }

  while(true) {
    let itemStatus = (await query.next()).value;
    let inStock = !(itemStatus?.includes('Sold Out'));

    if(itemStatus !== undefined) {
      for(let callback of callbacks) {
        callback(url, itemName, inStock);
      }
    }
    yield;
  }
}

/*
 * @Param Array of BH URL IDs
 * @Param Callback functions
 */
// Monitors B&H Photo Video inventory based on IDs
async function* BnH(id, callbacks) {
  let url = SITE.BnH + `/c/product/${id}`;
  let nameSelector = 'h1[data-selenium="productTitle"]';
  let itemSelector = 'div[data-selenium="stockInfo"]';
  let query = queryPage(url, nameSelector, itemSelector);
  let itemName = (await query.next()).value;

  if(itemName == null) {
    return;
  }

  while(true) {
    let itemStatus = (await query.next()).value;
    let inStock = itemStatus?.includes('In Stock');

    if(itemStatus !== undefined) {
      for(let callback of callbacks) {
        callback(url, itemName, inStock);
      }
    }
    yield;
  }
}

/*
 * @Param Array of Newegg item numbers
 * @Param Callback functions
 */
// Monitors Newegg inventory based on item numbers
async function* Newegg(itemNum, callbacks) {
  let url = SITE.Newegg + `/p/${itemNum}`;
  let nameSelector = 'h1.product-title';
  let itemSelector = 'div.product-inventory';
  let query = queryPage(url, nameSelector, itemSelector);
  let itemName = (await query.next()).value;

  if(itemName == null) {
    console.log("FAIL");
    return;
  }

  while(true) {
    let itemStatus = (await query.next()).value;
    let inStock = !(itemStatus?.includes('OUT OF STOCK.'));

    if(itemStatus !== undefined) {
      for(let callback of callbacks) {
        callback(url, itemName, inStock);
      }
    }
    yield;
  }
}

/*
 * @Param Array of Office Depot item numbers
 * @Param Callback functions
 */
// Monitors Office Depot inventory based on item numbers
async function* OfficeDepot(itemNum, callbacks) {
  let url = SITE.OfficeDepot + `/a/products/${itemNum}`;
  let nameSelector = '#skuHeading';
  let itemSelector = '#skuAvailability';
  let query = queryPage(url, nameSelector, itemSelector);
  let itemName = (await query.next()).value;

  if(itemName == null) {
    console.log("FAIL");
    return;
  }

  while(true) {
    let itemStatus = (await query.next()).value;
    let inStock = !(itemStatus?.includes('Out of stock'));

    if(itemStatus !== undefined) {
      for(let callback of callbacks) {
        callback(url, itemName, inStock);
      }
    }
    yield;
  }
}

/*
 * @Param Array of Staples item numbers
 * @Param Callback functions
 */
// Monitors Staples inventory based on item numbers
// Work in progress
async function* Staples(itemNum, callbacks) {
  let url = SITE.Staples + `products_/${itemNum}`;
  let nameSelector = '#productTitle';
  let itemSelector = '#skuAvailability';
  let query = queryPage(url, nameSelector, itemSelector);
  let itemName = (await query.next()).value;

  if(itemName == null) {
    console.log("FAIL");
    return;
  }

  while(true) {
    let itemStatus = (await query.next()).value;
    let inStock = !(itemStatus?.includes('Out of stock'));

    if(itemStatus !== undefined) {
      for(let callback of callbacks) {
        callback(url, itemName, inStock);
      }
    }
    yield;
  }
}

module.exports = {
  'Adorama': Adorama,
  'Amazon': Amazon,
  'BestBuy': BestBuy,
  'BnH': BnH,
  'Newegg': Newegg,
  'OfficeDepot': OfficeDepot
};
