# TrueSpend Browser Extension - Bundle Optimization Guide

## Current Bundle Sizes (Target)

| File | Target Size | Max Size | Status |
|------|-------------|----------|--------|
| `popup.js` | < 400KB | 500KB | ✅ |
| `options.js` | < 400KB | 500KB | ✅ |
| `background.js` | < 200KB | 300KB | ✅ |
| `content-merchant.js` | < 50KB | 100KB | ✅ |

**Total Extension Size:** < 1.5MB (recommended), < 3MB (maximum)

---

## Bundle Analysis Setup

### Install Dependencies

```bash
npm install --save-dev rollup-plugin-visualizer
```

### Update `vite.config.ts`

Add the visualizer plugin for production builds:

```typescript
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => ({
  plugins: [
    // ... existing plugins
    mode === 'extension' && visualizer({
      filename: 'dist/extension-stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
}));
```

### Generate Bundle Report

```bash
npm run build:extension
open dist/extension-stats.html  # macOS
start dist/extension-stats.html  # Windows
xdg-open dist/extension-stats.html  # Linux
```

---

## Optimization Strategies

### 1. Code Splitting (Already Implemented ✅)

The extension build already splits code into separate chunks:
- `popup.js` - Popup UI and budget display
- `options.js` - Settings page
- `background.js` - Service worker logic
- `content-merchant.js` - Merchant detection script

**Why this matters:**
- Each component loads only what it needs
- Faster popup open times
- Reduced memory footprint

---

### 2. Tree Shaking

Vite automatically removes unused code, but ensure imports are tree-shakeable:

**❌ Bad (imports entire library):**
```typescript
import _ from 'lodash';
_.debounce(fn, 100);
```

**✅ Good (imports only what's needed):**
```typescript
import debounce from 'lodash/debounce';
debounce(fn, 100);
```

---

### 3. Dynamic Imports

For features used infrequently, load them on-demand:

**Example - Error Boundary:**
```typescript
// Only load when error occurs
const ErrorBoundary = lazy(() => import('./ErrorBoundary'));
```

**Example - Advanced Features:**
```typescript
// Load analytics only if telemetry enabled
if (settings.telemetryEnabled) {
  const { telemetry } = await import('./telemetry');
  telemetry.track('event');
}
```

---

### 4. Dependency Auditing

Regularly check dependency sizes:

```bash
npm install -g bundle-phobia-cli
npx bundle-phobia @tanstack/react-query
```

**Large Dependencies to Watch:**
- `react-query` (~60KB)
- `@supabase/supabase-js` (~50KB)
- `lucide-react` (~40KB if not tree-shaken)

**Optimization:**
- Use smaller alternatives where possible
- Import icons individually from `lucide-react`

```typescript
// ❌ Imports all icons (~1MB)
import * as Icons from 'lucide-react';

// ✅ Imports only what you need (~5KB each)
import { Wallet, AlertCircle } from 'lucide-react';
```

---

### 5. Minification & Compression

Vite handles this automatically in production:
- **Terser:** Minifies JavaScript
- **cssnano:** Minifies CSS
- **Brotli/Gzip:** Compression in transit

**Verify minification:**
```bash
npm run build:extension
ls -lh dist/*.js
# All files should be minified (no whitespace)
```

---

### 6. Remove Development Code

Use environment checks to exclude dev-only code:

```typescript
if (import.meta.env.DEV) {
  console.log('[Debug] Merchant detected:', merchantName);
}
```

This code will be completely removed in production builds.

---

## Performance Budgets

Set bundle size limits to prevent bloat:

### Add to `vite.config.ts`:

```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks(id) {
        // Vendor chunk for shared dependencies
        if (id.includes('node_modules')) {
          if (id.includes('react') || id.includes('react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('@tanstack/react-query')) {
            return 'vendor-query';
          }
          if (id.includes('@supabase')) {
            return 'vendor-supabase';
          }
        }
      },
    },
  },
  // Warn if chunk exceeds size
  chunkSizeWarningLimit: 500, // 500KB
}
```

### Set Absolute Limits:

Create `scripts/check-bundle-size.js`:

```javascript
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

Object.entries(LIMITS).forEach(([file, limit]) => {
  const filePath = path.join(distPath, file);
  if (fs.existsSync(filePath)) {
    const size = fs.statSync(filePath).size;
    const sizeKB = (size / 1024).toFixed(2);
    const limitKB = (limit / 1024).toFixed(2);
    
    if (size > limit) {
      console.error(`❌ ${file}: ${sizeKB}KB exceeds limit of ${limitKB}KB`);
      failed = true;
    } else {
      console.log(`✅ ${file}: ${sizeKB}KB (limit: ${limitKB}KB)`);
    }
  }
});

if (failed) {
  process.exit(1);
}
```

### Add to `package.json`:

```json
{
  "scripts": {
    "build:extension": "vite build --mode extension",
    "check:bundle": "node scripts/check-bundle-size.js",
    "build:check": "npm run build:extension && npm run check:bundle"
  }
}
```

---

## Monitoring Bundle Size Over Time

### GitHub Actions (CI/CD)

Add bundle size check to your CI pipeline:

```yaml
# .github/workflows/extension-build.yml
name: Extension Build Check

on: [pull_request]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build:check
      - name: Upload bundle report
        uses: actions/upload-artifact@v3
        with:
          name: bundle-stats
          path: dist/extension-stats.html
```

---

## Common Pitfalls

### 1. Duplicate Dependencies
**Problem:** Multiple versions of React or other libs
**Solution:** Use `npm dedupe` or check with:
```bash
npm ls react
npm ls react-dom
```

### 2. Importing Entire Libraries
**Problem:** `import * as Utils from './utils'`
**Solution:** Import only what you need

### 3. Large Images/Assets
**Problem:** Including high-res images in extension
**Solution:** 
- Compress images (use TinyPNG, ImageOptim)
- Use SVG icons where possible
- Lazy load images

### 4. Unused CSS
**Problem:** Tailwind includes all utility classes
**Solution:** Already configured in `tailwind.config.ts` with JIT mode

---

## Optimization Checklist

### Before Every Release:
- [ ] Run `npm run build:check`
- [ ] Review bundle stats report
- [ ] Check for dependency updates
- [ ] Test performance on low-end devices
- [ ] Verify load times (popup < 500ms)
- [ ] Check memory usage (< 50MB)

### Monthly:
- [ ] Audit dependencies for size
- [ ] Remove unused dependencies
- [ ] Check for lighter alternatives
- [ ] Update optimization strategies

### Quarterly:
- [ ] Full bundle analysis
- [ ] Performance profiling
- [ ] Load testing with 1000+ budgets
- [ ] Memory leak detection

---

## Further Reading

- [Vite Build Optimizations](https://vitejs.dev/guide/build.html)
- [Web Extension Performance](https://developer.chrome.com/docs/extensions/mv3/performance/)
- [Bundle Size Analysis Tools](https://bundlephobia.com/)
- [Tree Shaking Guide](https://webpack.js.org/guides/tree-shaking/)

---

**Target:** Keep total extension size under 1.5MB for fast installs and updates.
