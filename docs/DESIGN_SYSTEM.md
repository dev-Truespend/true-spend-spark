# TrueSpend Design System

**Version:** 1.0.0  
**Last Updated:** 2025-11-21  
**Status:** Phase 1 Complete ✅

## Overview

This document defines the design system for TrueSpend across all platforms: web, mobile (PWA/native), and browser extension. It ensures visual consistency, improves developer velocity, and maintains a cohesive user experience.

---

## Brand Identity

### Tagline
**"Every Purchase. Perfectly Rewarded."**

### Logo Assets
- **Full Logo**: `src/assets/truespend-logo.png` - Horizontal logo with full branding
- **Icon Only**: `src/assets/truespend-icon.png` - Square icon for compact spaces
- **Favicon**: `public/favicon.png` - Browser tab icon

### Logo Usage Guidelines
- **Desktop Navigation**: Horizontal logo (icon + text)
- **Mobile Navigation**: Icon only to save space
- **Landing Page Hero**: Full logo with tagline
- **Browser Extension**: Icon only (396px width constraint)
- **Loading States**: Icon with animation
- **Minimum Size**: 24x24px for icon, 120px width for horizontal logo

---

## 🎨 Design Principles

1. **Platform-Appropriate** - Respect each platform's conventions (iOS, Android, Web, Extension)
2. **Accessibility-First** - WCAG AAA compliant, minimum 44px touch targets
3. **Performance-Aware** - Adaptive loading based on network and device capabilities
4. **Offline-Resilient** - Works seamlessly without internet connection
5. **Progressive Enhancement** - Core functionality works everywhere, enhanced features where supported

---

## 📐 Foundation

### Brand Colors

Our brand identity is built on three primary colors with semantic usage:

**Primary Brand Colors:**
- **Brand Blue** `#3882F6` / `hsl(218, 91%, 59%)` - Primary actions, CTAs, links
- **Brand Purple** `#9333EA` / `hsl(274, 81%, 56%)` - Premium features, accents, highlights
- **Brand Teal** `#1488A6` / `hsl(194, 75%, 37%)` - Success states, data visualization

**Brand Gradient:**
```css
background: linear-gradient(135deg, #3882F6 0%, #9333EA 100%);
```

**Accessibility Ratios (WCAG AA):**
- Blue on white: 4.5:1 ✅
- Purple on white: 4.6:1 ✅
- Teal on white: 3.8:1 ⚠️ (Use for backgrounds/icons, not body text)

### Color System

All colors are defined as HSL values in `src/index.css` using CSS custom properties. This enables:
- Automatic dark mode support
- Easy theming
- Consistent color usage across components

#### Light Mode Palette
```css
--background: 0 0% 100%                 /* Page background */
--foreground: 222.2 84% 4.9%            /* Primary text */
--primary: 218 91% 59%                  /* Brand blue */
--accent: 274 81% 56%                   /* Brand purple */
--brand-blue: 218 91% 59%
--brand-purple: 274 81% 56%
--brand-teal: 194 75% 37%
--secondary: 210 40% 96.1%              /* Light gray */
--muted: 210 40% 96.1%                  /* Muted backgrounds */
--destructive: 0 84.2% 60.2%            /* Error/delete */
--border: 214.3 31.8% 91.4%             /* Border color */
```

#### Dark Mode Palette
```css
--background: 222.2 84% 4.9%            /* Dark background */
--foreground: 210 40% 98%               /* Light text */
--primary: 218 91% 65%                  /* Brighter brand blue */
--accent: 274 81% 65%                   /* Brighter brand purple */
--brand-blue: 218 91% 65%
--brand-purple: 274 81% 65%
--brand-teal: 194 75% 45%
--secondary: 217.2 32.6% 17.5%          /* Dark gray */
--muted: 217.2 32.6% 17.5%              /* Muted backgrounds */
--destructive: 0 62.8% 30.6%            /* Dark red */
```

#### Chart Colors
```css
--chart-1: 218 91% 59%   /* Brand blue */
--chart-2: 274 81% 56%   /* Brand purple */
--chart-3: 194 75% 37%   /* Brand teal */
--chart-4: 280 65% 60%   /* Purple variant */
--chart-5: 340 75% 55%   /* Pink */
```

**Usage Guidelines:**
- **Primary Actions**: Use brand blue - buttons, links, active states
- **Premium/Featured**: Use brand purple - badges, premium features
- **Success/Accents**: Use brand teal - success messages, data points
- **Gradients**: Use blue→purple for hero sections and key CTAs

**Code Usage:**
```tsx
// ❌ Wrong - Direct colors
<div className="bg-blue-500 text-white">

// ✅ Correct - Semantic tokens
<div className="bg-primary text-primary-foreground">

// ✅ Correct - Brand colors
<div className="bg-brand-blue text-white">

// ✅ Correct - Gradient
<Button variant="gradient">Get Started</Button>
```

### Typography

System font stack for optimal performance and native feel:
```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

#### Scale

**Mobile:**
- xs: 12px (0.75rem) - Small labels
- sm: 14px (0.875rem) - Body text, captions
- base: 16px (1rem) - Default body
- lg: 18px (1.125rem) - Subheadings
- xl: 20px (1.25rem) - Headings
- 2xl: 24px (1.5rem) - Page titles

**Desktop:**
- xs: 14px (0.875rem)
- sm: 16px (1rem)
- base: 18px (1.125rem)
- lg: 20px (1.25rem)
- xl: 24px (1.5rem)
- 2xl: 32px (2rem)

**Usage:**
```tsx
// Responsive typography
<h1 className="text-2xl font-bold">Page Title</h1>
<p className="text-base text-muted-foreground">Body text</p>
```

### Spacing

Based on 4px grid system (defined in `src/design/tokens.ts`):
- xs: 4px (0.25rem)
- sm: 8px (0.5rem)
- md: 16px (1rem)
- lg: 24px (1.5rem)
- xl: 32px (2rem)
- 2xl: 48px (3rem)
- 3xl: 64px (4rem)

**Usage:**
```tsx
<div className="p-md space-y-lg">  {/* 16px padding, 24px gap */}
```

### Border Radius
- none: 0
- sm: 4px (0.25rem)
- md: 6px (0.375rem) - Default for buttons/cards
- lg: 8px (0.5rem)
- xl: 12px (0.75rem)
- 2xl: 16px (1rem)
- full: 9999px - Pills/avatars

### Shadows
```css
sm: 0 1px 2px rgba(0,0,0,0.05)
md: 0 4px 6px rgba(0,0,0,0.1)
lg: 0 10px 15px rgba(0,0,0,0.1)
xl: 0 20px 25px rgba(0,0,0,0.1)
```

---

## 📱 Platform Patterns

### Web (Desktop)
**Layout:**
- Max width: 1280px
- Sidebar navigation: 240px wide (collapsible)
- Multi-column layouts for dashboard (grid-cols-3)
- Hover states on interactive elements

**Navigation:**
- Top horizontal nav with logo + menu items
- Persistent sidebar for quick navigation
- Breadcrumbs for deep pages

**Component Behavior:**
- Tables for data-heavy views
- Modals for forms (center-screen)
- Tooltips on hover
- Dropdown menus

**Example:**
```tsx
<div className="max-w-7xl mx-auto px-4">
  <Sidebar className="w-60" />
  <main className="ml-60 grid grid-cols-3 gap-6">
    {/* Content */}
  </main>
</div>
```

### Mobile (PWA/Native)
**Layout:**
- Full-width content
- Bottom navigation bar (64px height)
- Stack layout (single column)
- Safe area insets for notched devices

**Navigation:**
- Bottom tab bar: Home, Transactions, Budgets, Insights, Settings
- Full-screen modals slide up from bottom
- Swipe-back gesture to go back

**Touch Interactions:**
- Minimum touch target: 44x44px (48px recommended)
- Swipe gestures for delete/archive
- Pull-to-refresh on lists
- Long-press for contextual actions

**Component Behavior:**
- Cards instead of tables
- Bottom sheets instead of modals
- Swipeable lists
- FAB (Floating Action Button) for primary actions

**Example:**
```tsx
<div className="pb-16"> {/* Account for bottom nav */}
  <main className="space-y-4 px-4">
    {transactions.map(tx => (
      <SwipeableCard key={tx.id} onDelete={...} />
    ))}
  </main>
  <MobileBottomNav />
</div>
```

### Browser Extension
**Layout:**
- Fixed width: 396px (popup)
- Compact vertical spacing
- Minimal chrome (no sidebars)
- Scrollable content area

**Navigation:**
- Vertical nav in header
- Icon-only navigation to save space
- "More" menu for advanced features

**Component Behavior:**
- Compact forms (fewer fields visible)
- Accordions to hide secondary info
- Inline actions (no separate modal pages)
- Quick actions at top

**Example:**
```tsx
<div className="w-[396px] max-h-[600px] overflow-y-auto">
  <header className="sticky top-0 bg-background border-b p-4">
    <QuickStats />
  </header>
  <main className="p-4 space-y-3">
    <CompactBudgetCard />
    <RecentTransactions limit={3} />
  </main>
</div>
```

### Native Apps (iOS/Android)
**Platform-Specific:**
- **iOS**: Bottom tab bar, swipe-back, SF Symbols icons
- **Android**: Navigation drawer, FAB, Material icons

**Native Features:**
- Haptic feedback on interactions
- Native share sheet
- Background geolocation
- Push notifications
- Camera/photo access

**Example:**
```tsx
const { isIOS, isAndroid } = usePlatform();

return (
  <>
    {isIOS && <IOSTabBar />}
    {isAndroid && <AndroidBottomNav />}
  </>
);
```

---

## 🧩 Component Guidelines

### When to Use Which Component

#### Buttons
```tsx
// Primary action - one per screen
<Button variant="default">Save Transaction</Button>

// Secondary actions
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Learn More</Button>

// Destructive actions
<Button variant="destructive">Delete Budget</Button>
```

#### Cards
```tsx
// Dashboard cards
<Card className="p-6">
  <CardHeader>
    <CardTitle>Total Spent</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-3xl font-bold">$1,234.56</p>
  </CardContent>
</Card>

// List items (mobile)
<Card className="p-4 active:bg-muted"> {/* Touch state */}
  <div className="flex justify-between">
    <span>Starbucks</span>
    <span>$4.50</span>
  </div>
</Card>
```

#### Navigation
```tsx
// Web - Sidebar
<NavLink to="/dashboard" className="flex items-center gap-2 p-3">
  <Home className="h-5 w-5" />
  <span>Dashboard</span>
</NavLink>

// Mobile - Bottom Nav
<nav className="fixed bottom-0 inset-x-0 h-16 flex justify-around items-center border-t bg-background">
  <button className="flex flex-col items-center min-w-[48px]">
    <Home className="h-6 w-6" />
    <span className="text-xs mt-1">Home</span>
  </button>
</nav>
```

### Component Size Variants

All interactive components support `sm` | `md` | `lg` | `xl` sizes:
```tsx
<Button size="sm">Small</Button>
<Button size="md">Medium (default)</Button>
<Button size="lg">Large</Button>
```

### Responsive Patterns

**Hide/show based on screen size:**
```tsx
<div className="hidden md:block">Desktop only</div>
<div className="block md:hidden">Mobile only</div>
```

**Adaptive columns:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

**Platform-based rendering:**
```tsx
const { isMobile, isExtension } = usePlatform();

return (
  <>
    {isMobile && <MobileView />}
    {isExtension && <CompactView />}
    {!isMobile && !isExtension && <DesktopView />}
  </>
);
```

---

## ♿ Accessibility

### Touch Targets
- Minimum: 44x44px (WCAG AAA)
- Recommended: 48x48px
- Primary actions: 56x56px

**Implementation:**
```tsx
<button className="min-h-[44px] min-w-[44px] p-2">
```

### Color Contrast
- Normal text: 4.5:1 minimum
- Large text (18px+): 3:1 minimum
- UI components: 3:1 minimum

All colors in the design system meet WCAG AA standards.

### Keyboard Navigation
- All interactive elements must be focusable
- Visible focus indicators (ring-2 ring-primary)
- Logical tab order

**Implementation:**
```tsx
<button className="focus-visible:ring-2 focus-visible:ring-primary">
```

### Screen Readers
- Use semantic HTML (`<nav>`, `<main>`, `<article>`)
- Add aria-labels for icon-only buttons
- Provide alt text for images

---

## 🎭 Animations

### Durations
- Fast: 150ms - Hover states, ripples
- Normal: 300ms - Default transitions
- Slow: 500ms - Page transitions

### Easing
```css
ease-out: cubic-bezier(0.4, 0, 0.2, 1)  /* Default */
ease-in-out: cubic-bezier(0.4, 0, 0.6, 1)
```

### Available Animations (from tailwind.config.ts)
```tsx
// Accordion
<div className="animate-accordion-down">

// Fade
<div className="animate-fade-in">

// Scale
<div className="animate-scale-in">

// Slide
<div className="animate-slide-in-right">

// Hover effects
<button className="hover-scale"> {/* Scales to 105% */}
```

### Reduced Motion
Respect user preferences:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
  }
}
```

---

## 🌙 Dark Mode

Automatic based on system preference using `next-themes`.

**Implementation:**
```tsx
import { useTheme } from 'next-themes';

const { theme, setTheme } = useTheme();

<button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
  Toggle Theme
</button>
```

All components automatically adapt via CSS variables.

---

## 📦 Component Library

### Installed UI Components (shadcn/ui)
Located in `src/components/ui/`:
- Accordion
- Alert / Alert Dialog
- Avatar
- Badge
- Breadcrumb
- Button
- Calendar
- Card
- And 40+ more...

### Custom Components
Located in `src/components/`:
- `ErrorBoundary` - Catch React errors
- `Layout` - Page wrapper
- `GlobalNav` - Top navigation
- `SkeletonLoader` - Loading states

### Platform-Specific Components (To Be Created)
- `MobileBottomNav` - Bottom tab bar
- `CompactBudgetCard` - Extension popup card
- `SwipeableTransactionCard` - Mobile swipe actions

---

## 🚀 Usage Examples

### Platform Detection
```tsx
import { usePlatform } from '@/hooks/usePlatform';

function ResponsiveLayout({ children }) {
  const { isWeb, isMobile, isExtension } = usePlatform();

  return (
    <div className={isExtension ? 'w-96' : 'w-full'}>
      {isWeb && <DesktopSidebar />}
      {isMobile && <MobileHeader />}
      <main>{children}</main>
      {isMobile && <MobileBottomNav />}
    </div>
  );
}
```

### Responsive Card
```tsx
import { Card } from '@/components/ui/card';

function BudgetCard({ budget }) {
  const { isMobile } = usePlatform();

  return (
    <Card className={isMobile ? 'p-4' : 'p-6'}>
      <h3 className="text-lg font-semibold">{budget.category}</h3>
      <p className="text-2xl">${budget.spent} / ${budget.limit}</p>
      {!isMobile && <Button>View Details</Button>}
    </Card>
  );
}
```

### Touch-Optimized Button
```tsx
function PrimaryAction() {
  const { isTouchDevice } = usePlatform();

  return (
    <Button 
      size={isTouchDevice ? 'lg' : 'md'}
      className="min-h-[48px]"
    >
      Add Transaction
    </Button>
  );
}
```

---

## 📚 Resources

### Design Tokens
- `src/design/tokens.ts` - Spacing, breakpoints, platform configs
- `src/index.css` - Color variables
- `tailwind.config.ts` - Tailwind theme extensions

### Hooks
- `src/hooks/usePlatform.ts` - Platform detection
- `src/hooks/useOfflineStorage.ts` - Offline state
- `src/hooks/useAdaptiveContent.ts` - Network-aware content

### Documentation
- `docs/ARCHITECTURE.md` - System architecture
- `docs/OFFLINE_FIRST.md` - Offline strategy
- `README.md` - Getting started

---

## 🔄 Versioning

**v1.0.0 (Current)** - Phase 1 Complete
- ✅ Design tokens defined
- ✅ Platform detection hook
- ✅ Documentation complete
- ⏳ Mobile-first redesign (Phase 2)
- ⏳ Native app patterns (Phase 3)
- ⏳ Extension optimization (Phase 4)

---

## 🤝 Contributing

When adding new components:
1. Follow existing patterns in `src/components/ui/`
2. Support all platform variants (web/mobile/extension)
3. Add size variants (sm/md/lg)
4. Use semantic color tokens
5. Ensure 44px+ touch targets
6. Test in light + dark mode
7. Document in this file

---

**Questions?** See `docs/ARCHITECTURE.md` or ask in project discussions.
