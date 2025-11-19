// Content script for detecting merchants and prices on e-commerce sites
// Runs on all HTTPS pages

console.log('[TrueSpend] Merchant detector loaded on:', window.location.hostname);

// Known merchant patterns
const MERCHANTS: Record<string, string> = {
  'amazon.com': 'Amazon',
  'walmart.com': 'Walmart',
  'target.com': 'Target',
  'bestbuy.com': 'Best Buy',
  'ebay.com': 'eBay',
  'etsy.com': 'Etsy',
  'homedepot.com': 'Home Depot',
  'lowes.com': "Lowe's",
  'wayfair.com': 'Wayfair',
  'macys.com': "Macy's",
  'nordstrom.com': 'Nordstrom',
  'kohls.com': "Kohl's",
  'costco.com': 'Costco',
  'samsclub.com': "Sam's Club",
  'newegg.com': 'Newegg',
};

// Price detection selectors (common patterns)
const PRICE_SELECTORS = [
  '[data-price]',
  '.price',
  '.product-price',
  '.price-current',
  '.price-now',
  '.price-tag',
  '.sale-price',
  '.current-price',
  '#priceblock_ourprice', // Amazon
  '#priceblock_dealprice', // Amazon
  '.a-price-whole', // Amazon
  '[itemprop="price"]',
  '[data-testid*="price"]',
  '[class*="price"]',
];

function detectMerchant() {
  const hostname = window.location.hostname;
  
  // Find matching merchant
  const merchantEntry = Object.entries(MERCHANTS).find(([domain]) => 
    hostname.includes(domain)
  );

  if (!merchantEntry) {
    return; // Not a tracked merchant
  }

  const merchantName = merchantEntry[1];
  console.log('[TrueSpend] Detected merchant:', merchantName);

  // Try to extract price from page
  let price: string | null = null;
  
  for (const selector of PRICE_SELECTORS) {
    const priceElement = document.querySelector(selector);
    if (priceElement) {
      const text = priceElement.textContent || '';
      const match = text.match(/\$?[\d,]+\.?\d*/);
      if (match) {
        price = match[0];
        console.log('[TrueSpend] Found price:', price, 'using selector:', selector);
        break;
      }
    }
  }

  // Send detection to background worker
  chrome.runtime.sendMessage({
    type: 'MERCHANT_DETECTED',
    data: {
      merchant: merchantName,
      price: price || 'unknown',
      url: window.location.href,
      timestamp: Date.now(),
    },
  });
}

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', detectMerchant);
} else {
  detectMerchant();
}

// Watch for dynamic price updates (for SPA sites)
let detectionTimeout: number | null = null;

const observer = new MutationObserver(() => {
  // Debounce detection to avoid too many calls
  if (detectionTimeout) {
    clearTimeout(detectionTimeout);
  }
  
  detectionTimeout = window.setTimeout(() => {
    detectMerchant();
  }, 1000);
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

console.log('[TrueSpend] Merchant detector initialized');
