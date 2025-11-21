# TrueSpend - Smart Budget Tracking

A production-ready, offline-first budget tracking application with AI-powered features and intelligent geofencing.

## 🚀 Features

### Phase 1 (Production Ready) ✅
- **Offline-First Architecture**: Full CRUD operations work offline with automatic sync
- **OCR Receipt Scanning**: Camera integration with Google Vision OCR
- **Adaptive Loading**: Network-aware content delivery with skeleton loaders
- **Performance Monitoring**: Built-in metrics tracking and optimization
- **Batch Operations**: Efficient bulk data processing
- **Manual Sync Controls**: User-controlled synchronization with status panel
- **Data Management**: GDPR-compliant export/import and storage monitoring
- **Comprehensive Error Handling**: User-friendly error messages and recovery
- **Security Hardened**: RLS policies, mutable search_path fixes, sanitized triggers

### Core Functionality
- 🔐 Secure authentication with Supabase Auth
- 💳 Transaction tracking with categories and merchants
- 📊 Budget management with alerts and geofencing
- 🗺️ Location-based spending insights
- 🤖 AI-powered transaction categorization
- 📱 Mobile-responsive PWA-ready design
- 🌐 Offline-first with IndexedDB storage
- ⚡ Real-time sync with conflict resolution

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **State Management**: TanStack Query (React Query)
- **Database**: Supabase (PostgreSQL)
- **Storage**: IndexedDB for offline data
- **OCR**: Google Vision API via Edge Functions
- **Maps**: Google Maps & Foursquare Places API
- **Testing**: Playwright E2E tests

### Key Components

#### Offline Storage
- `src/lib/db/indexedDB.ts` - Core storage layer
- `src/lib/db/batchOperations.ts` - Optimized bulk operations
- `src/services/syncManager.ts` - Intelligent sync with retry logic
- `src/services/offlineSync.ts` - Background sync coordination

#### Performance
- `src/lib/performance/performanceMonitor.ts` - Metrics collection
- `src/hooks/useAdaptiveContent.tsx` - Network-aware rendering
- `src/components/ui/SkeletonLoader.tsx` - Loading states
- `src/components/ui/LowDataModeIndicator.tsx` - Network status

#### Features
- `src/components/receipts/ReceiptCapture.tsx` - OCR integration
- `src/components/sync/SyncControlPanel.tsx` - Manual sync UI
- `src/components/settings/DataManagement.tsx` - Data export/import
- `src/components/errors/ErrorBoundary.tsx` - Error handling

## 🧪 Testing

### E2E Test Coverage (37 tests)
```bash
npm run test:e2e
```

**Test Suites:**
- ✅ Authentication (6 tests)
- ✅ Camera/OCR Integration (6 tests)
- ✅ Adaptive Loading (5 tests)
- ✅ Offline CRUD Operations (7 tests)
- ✅ IndexedDB Migration (3 tests)
- ✅ Stress & Performance (8 tests)
- ⚠️ Sync Conflicts (2 tests - requires UI)

### Performance Benchmarks
- Bulk operations: < 60s for 20 items
- Page navigation: < 30s for 15 transitions
- Scrolling stress: < 10s
- Memory pressure: < 2min for 50 items
- Offline/online cycling: 5+ cycles

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or bun
- Supabase account (for backend)
- Google Cloud account (for Maps & Vision APIs)

### Installation
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Run development server
npm run dev

# Run tests
npm run test:e2e
```

### Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_maps_key
```

## 📖 Documentation

### Implementation Docs
- [Phase 1 Production Plan](docs/PHASE1_PRODUCTION_PLAN.md)
- [Day 1: Bugs & Security](docs/DAY1_IMPLEMENTATION_COMPLETE.md)
- [Day 2: OCR & Controls](docs/DAY2_IMPLEMENTATION_COMPLETE.md)
- [Day 3: Performance](docs/DAY3_IMPLEMENTATION_COMPLETE.md)
- [Day 4: Testing & Polish](docs/DAY4_IMPLEMENTATION_COMPLETE.md)

### Key Concepts

#### Offline-First Flow
1. User makes changes → Saved to IndexedDB
2. Changes queued for sync
3. Background sync attempts when online
4. Retry logic with exponential backoff
5. Manual sync available via control panel

#### Performance Optimization
1. Network quality detection
2. Adaptive content loading
3. Skeleton loaders on slow connections
4. Batch operations for bulk data
5. Performance metrics tracking

#### Error Handling
1. React Error Boundary catches crashes
2. ErrorHandler provides user-friendly messages
3. Specific error messages for common issues
4. Silent logging for debugging
5. Toast notifications for user feedback

## 🔒 Security

### Implemented
- ✅ Row Level Security (RLS) on all tables
- ✅ Mutable search_path fixes
- ✅ Input sanitization
- ✅ Secure error messages (no data leaks)
- ✅ HTTPS-only in production
- ✅ CSP violation monitoring

### Best Practices
- Never expose sensitive data in error messages
- Always use parameterized queries
- Validate and sanitize user input
- Use secure session management
- Regular security audits

## 📊 Performance

### Monitoring
```typescript
import { performanceMonitor } from '@/lib/performance/performanceMonitor';

// View all metrics
console.log(performanceMonitor.getAllMetrics());

// Export for analysis
const metricsJson = performanceMonitor.exportMetrics();
```

### Optimization Tips
1. Use batch operations for bulk data
2. Enable adaptive loading on slow connections
3. Monitor sync queue size
4. Clear old data periodically
5. Use skeleton loaders for perceived performance

## 🤝 Contributing

### Development Workflow
1. Create feature branch
2. Implement with tests
3. Run E2E tests
4. Update documentation
5. Submit pull request

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- Semantic component names
- Comprehensive error handling
- Performance-conscious coding

## 📝 License

MIT License - see LICENSE file for details

## 🎯 Roadmap

### Phase 2 (Planned)
- [ ] Conflict resolution UI
- [ ] Advanced analytics dashboard
- [ ] Push notifications
- [ ] Merchant intelligence
- [ ] Budget optimization AI
- [ ] Multi-currency support
- [ ] Team/family budgets

### Phase 3 (Future)
- [ ] Bank API integration
- [ ] Investment tracking
- [ ] Bill payment reminders
- [ ] Financial goal planning
- [ ] Tax document generation

## 📞 Support

- Documentation: `/docs`
- Issues: GitHub Issues
- E2E Tests: `npm run test:e2e`
- Performance: Check `performanceMonitor.getAllMetrics()`

---

**Status**: ✅ Production Ready (Phase 1 Complete)
**Last Updated**: 2024-11-21

## Original Lovable Project Info

**URL**: https://lovable.dev/projects/d4487a59-0405-4f34-88da-4c7979cc73d3

## How can I edit this code?

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/d4487a59-0405-4f34-88da-4c7979cc73d3) and start prompting.

**Use your preferred IDE**

```sh
# Clone and install
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm i
npm run dev
```

**Use GitHub Codespaces**

Navigate to the main page → Click "Code" button → Select "Codespaces" → "New codespace"

## Deployment

Simply open [Lovable](https://lovable.dev/projects/d4487a59-0405-4f34-88da-4c7979cc73d3) and click Share → Publish.

## Custom Domain

Navigate to Project > Settings > Domains → Connect Domain

Read more: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
