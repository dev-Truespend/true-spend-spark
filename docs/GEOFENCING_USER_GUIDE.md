# Geofencing User Guide

Welcome to TrueSpend's location-based budgeting! This guide will help you set up and use geofences to track your spending by location.

---

## 🎯 What is a Geofence?

A **geofence** is a virtual boundary around a real-world location. When you enter or exit this area, TrueSpend automatically tags your transactions with that location.

**Example**: Create a geofence for "Starbucks on Main St" with a 50-meter radius. Any transaction you make while inside this area will be automatically tagged as "Starbucks" spending.

---

## 🚀 Quick Start

### Step 1: Create Your First Geofence

1. Navigate to **Dashboard → Geofences**
2. Click **"Add Geofence"**
3. Enter a name (e.g., "Downtown Starbucks")
4. Search for the address or drop a pin on the map
5. Set the radius (recommended: 50-100 meters)
6. Choose type:
   - **Place**: General location (coffee shop, gym, etc.)
   - **Spending**: For budget tracking (more on this below)
7. Click **"Create"**

**✅ Pro Tip**: Start with 3-5 locations you visit frequently (work, gym, favorite restaurant).

---

### Step 2: Enable GPS Tracking

For geofences to work, your device needs location access:

1. When prompted, allow **TrueSpend** to access your location
2. Choose **"While Using the App"** (recommended) or **"Always"** (for background tracking)
3. You'll see a GPS icon in the header when tracking is active

**🔋 Battery Note**: GPS tracking only runs when the app is open. Background tracking requires native apps (coming in Phase 12).

---

### Step 3: Create a Transaction

1. Go to **Transactions** page
2. While inside a geofence, click **"Add Transaction"**
3. Notice the **"Inside [Geofence Name]"** indicator at the top
4. Fill in transaction details
5. Click **"Add Transaction"**

**Result**: Transaction is automatically tagged with the geofence. You'll see a location badge on the transaction card.

---

## 💰 Budget Tracking by Location

### Creating a Location-Linked Budget

Want to limit spending at a specific location? Here's how:

1. Navigate to **Budgets** page
2. Click **"Create Budget"**
3. Choose a category (e.g., "Dining")
4. Set your limit (e.g., $200/month)
5. Under **"Link to Location"**, select a geofence (e.g., "Downtown Starbucks")
6. Click **"Create Budget"**

**What Happens**:
- Budget only tracks spending **inside that geofence**
- Transactions at other locations don't count toward this budget
- You'll get alerts when you hit 80% (customizable in Settings)

**Example**:
- Budget: "$50/month at Starbucks"
- After spending $40, you get an alert: "⚠️ Starbucks budget 80% used"
- Helps you avoid overspending at specific locations

---

### Viewing Spending by Location

The **Budgets** page shows a "Spending by Location" card with:
- Total spent at each geofence (last 30 days)
- Number of transactions
- Progress bars comparing locations

**Use Case**: Identify which locations drain your budget the most.

---

## 🔔 Notification Preferences

Configure alerts for geofence events:

1. Navigate to **Settings → Notifications**
2. Enable/disable:
   - **Entry Alerts**: Notify when you enter a geofence
   - **Exit Alerts**: Notify when you leave a geofence
   - **Budget Alerts**: Notify when budget threshold is reached
3. Set **Alert Threshold** (default: 80%)
4. Click **"Save Preferences"**

**Example Notification**:
- Entry: "You're at Downtown Starbucks. Budget limit: $50"
- Exit: "You left Downtown Starbucks. Spent: $5.75"
- Budget: "⚠️ Starbucks budget 80% used ($40/$50)"

---

## 🎨 Filtering Transactions by Location

On the **Transactions** page:

1. Click the **location filter dropdown** (top right)
2. Choose:
   - **All Locations**: Show all transactions
   - **No Location**: Only untagged transactions
   - **[Geofence Name]**: Transactions at that specific location

**Use Case**: Review spending at a specific location (e.g., "How much did I spend at Starbucks this month?")

---

## 🔒 Privacy & Security

### How Your Location Data is Protected

1. **JWT Signing**: All GPS coordinates are cryptographically signed to prevent spoofing
2. **Secure Tokens**: Location tokens expire after 5 minutes
3. **Local Storage**: Location data is stored securely on your device
4. **No Tracking**: We only record location when you're actively using the app
5. **User Control**: You can disable GPS tracking anytime

**What We Don't Do**:
- ❌ Track your location in the background (unless you enable native apps in Phase 12)
- ❌ Sell or share your location data
- ❌ Use location data for advertising

---

## 💡 Best Practices

### 1. Choose Meaningful Names
- ❌ Bad: "Place 1", "Location ABC"
- ✅ Good: "Downtown Starbucks", "24 Hour Fitness Gym"

### 2. Set Appropriate Radii
- **Small locations** (coffee shop, ATM): 50-100 meters
- **Large areas** (mall, airport): 200-500 meters
- **Neighborhoods**: 500-1000 meters

### 3. Avoid Overlapping Geofences
If two geofences overlap, TrueSpend uses the **smaller** one. Keep them separate for accurate tracking.

### 4. Review Spending Monthly
Check the "Spending by Location" card to identify high-spend areas.

### 5. Use Location-Linked Budgets Strategically
Create budgets for locations where you tend to overspend (fast food, coffee shops, online shopping pickup locations).

---

## 📊 Example Use Cases

### Use Case 1: Coffee Shop Budget
**Goal**: Limit Starbucks spending to $100/month

1. Create geofence: "Downtown Starbucks" (50m radius)
2. Create budget: $100/month, category "Dining", linked to "Downtown Starbucks"
3. Enable alerts at 80% threshold
4. **Result**: Automatic alerts when you hit $80, preventing overspend

---

### Use Case 2: Gym Membership Tracking
**Goal**: Track transactions at the gym

1. Create geofence: "24 Hour Fitness" (100m radius)
2. Enable entry/exit notifications
3. **Result**: Get notified when you arrive at the gym, see all gym-related spending in one place

---

### Use Case 3: Work Cafeteria Spending
**Goal**: See how much you spend at work

1. Create geofence: "Work Cafeteria" (50m radius)
2. Filter transactions by "Work Cafeteria"
3. **Result**: Quickly see daily/weekly spending at work

---

## 🐛 Troubleshooting

### GPS Not Working
1. Check that location permissions are enabled in device settings
2. Make sure you're using a supported browser (Chrome, Safari, Edge)
3. Try refreshing the page
4. If indoors, GPS accuracy may be reduced (move near a window)

### Transaction Not Tagged
1. Ensure GPS tracking is enabled (look for GPS icon in header)
2. Check that you're **inside** the geofence radius (not just near it)
3. Verify geofence is marked as **active**
4. Try creating the transaction again

### Budget Not Calculating Correctly
1. Check that budget is linked to the correct geofence
2. Verify transactions are tagged with the geofence
3. Ensure budget date range covers the transactions
4. Refresh the page to recalculate

### Notifications Not Appearing
1. Check notification preferences in **Settings → Notifications**
2. Ensure browser/device notifications are enabled
3. Try toggling the preference off and back on

---

## 🆘 Need Help?

- 📧 Email: support@truespend.org
- 💬 In-app chat: Click the help icon (coming in Phase 5)
- 📖 Docs: [https://docs.truespend.org](https://docs.truespend.org)

---

## 🔮 Coming Soon

- 📍 Visual map showing geofence boundaries (Phase 5)
- 🗺️ Tap-to-create geofences on map (Phase 5)
- 🔔 Native background geofencing (Phase 12 - iOS/Android)
- 📊 Advanced location analytics (Phase 13)
- 📤 Export geofence spending reports (Phase 6)

---

**Enjoy location-based budgeting! 🎉**
