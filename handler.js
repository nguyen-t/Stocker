const IN_STOCK = true;
const OUT_OF_STOCK = false;

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

// Callback for printing to console
function consolePrint(page, name, stocked) {
  let hostname = new URL(page.url()).hostname;
  let source;

  switch(hostname) {
    case 'amazon.com':
      source = 'Amazon';
      break;

    case 'bestbuy.com':
      source = 'BestBuy';
      break;

    case 'bhphotovideo.com':
      source = 'B&H Photo Video';
      break;

    case 'newegg.com':
      cource = 'Newegg';
      break;

    default:
      source = hostname.substring(0, hostname.lastIndexOf('.'));
  }

  console.log(`[${time()}][${source}] ${name}: ${colorText(stocked)}`);
}

// Callback for sending a text message
function toText(messenger) {
  return (page, name, stocked) => {
    if(stocked) {
      messenger?.sendAll(`${name}\n${page.url()}`);
    }
  };
}

module.exports = {
  consolePrint,
  toText
};
