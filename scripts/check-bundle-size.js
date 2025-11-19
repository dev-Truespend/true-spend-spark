const fs = require('fs');
const path = require('path');

const LIMITS = {
  'popup.js': 500 * 1024, // 500KB
  'options.js': 500 * 1024,
  'background.js': 300 * 1024,
  'content-merchant.js': 100 * 1024,
};

const distPath = path.join(__dirname, '../dist');
let failed = false;

console.log('\n📦 Bundle Size Check\n');

Object.entries(LIMITS).forEach(([file, limit]) => {
  const filePath = path.join(distPath, file);
  if (fs.existsSync(filePath)) {
    const size = fs.statSync(filePath).size;
    const sizeKB = (size / 1024).toFixed(2);
    const limitKB = (limit / 1024).toFixed(2);
    const percentage = ((size / limit) * 100).toFixed(1);
    
    if (size > limit) {
      console.error(`❌ ${file}: ${sizeKB}KB exceeds limit of ${limitKB}KB (${percentage}%)`);
      failed = true;
    } else {
      console.log(`✅ ${file}: ${sizeKB}KB / ${limitKB}KB (${percentage}%)`);
    }
  } else {
    console.warn(`⚠️  ${file}: File not found`);
  }
});

console.log('');

if (failed) {
  console.error('❌ Bundle size check failed!\n');
  process.exit(1);
} else {
  console.log('✅ All bundles within size limits!\n');
}
