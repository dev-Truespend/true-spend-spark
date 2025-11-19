// Notification service for real-time alerts
// Handles budget alerts, deal notifications, and user preferences

interface NotificationOptions {
  title: string;
  message: string;
  iconUrl?: string;
  type?: 'basic' | 'image' | 'list' | 'progress';
  priority?: number;
  requireInteraction?: boolean;
  buttons?: Array<{ title: string; iconUrl?: string }>;
}

class NotificationService {
  private readonly ICON_PATH = 'icons/icon128.png';

  async show(id: string, options: NotificationOptions): Promise<void> {
    // Check if notifications are enabled
    const settings = await chrome.storage.local.get('settings');
    if (settings.settings?.desktopNotifications === false) {
      console.log('[Notifications] Desktop notifications disabled');
      return;
    }

    // Create notification
    await chrome.notifications.create(id, {
      type: options.type || 'basic',
      iconUrl: options.iconUrl || this.ICON_PATH,
      title: options.title,
      message: options.message,
      priority: options.priority || 1,
      requireInteraction: options.requireInteraction || false,
      buttons: options.buttons,
    });

    console.log('[Notifications] Shown:', id);
  }

  async showBudgetAlert(data: {
    category: string;
    spent: number;
    limit: number;
    percentage: number;
  }): Promise<void> {
    const id = `budget-alert-${Date.now()}`;
    const emoji = data.percentage >= 100 ? '🚨' : data.percentage >= 90 ? '⚠️' : '📊';
    
    await this.show(id, {
      title: `${emoji} Budget Alert: ${data.category}`,
      message: `You've spent $${data.spent.toFixed(2)} of $${data.limit.toFixed(2)} (${data.percentage.toFixed(0)}%)`,
      priority: data.percentage >= 100 ? 2 : 1,
      requireInteraction: data.percentage >= 100,
      buttons: [
        { title: 'View Budget' },
        { title: 'Dismiss' }
      ]
    });
  }

  async showDealAlert(data: {
    merchantName: string;
    dealDescription: string;
    distance: number;
    savingsAmount?: number;
  }): Promise<void> {
    const id = `deal-alert-${Date.now()}`;
    const distanceText = data.distance < 1 
      ? `${(data.distance * 5280).toFixed(0)} ft away`
      : `${data.distance.toFixed(1)} mi away`;
    
    const message = data.savingsAmount
      ? `${data.dealDescription} - Save $${data.savingsAmount.toFixed(2)}! (${distanceText})`
      : `${data.dealDescription} (${distanceText})`;

    await this.show(id, {
      title: `💰 Deal at ${data.merchantName}`,
      message,
      buttons: [
        { title: 'Get Directions' },
        { title: 'Dismiss' }
      ]
    });
  }

  async showMerchantDetected(data: {
    merchant: string;
    price?: string;
    budgetStatus?: { category: string; remaining: number };
  }): Promise<void> {
    const id = `merchant-${Date.now()}`;
    
    let message = `Shopping at ${data.merchant}`;
    if (data.price && data.price !== 'unknown') {
      message += ` - Item: ${data.price}`;
    }
    
    if (data.budgetStatus) {
      message += `\n💵 ${data.budgetStatus.category} budget: $${data.budgetStatus.remaining.toFixed(2)} remaining`;
    }

    await this.show(id, {
      title: '🛍️ Merchant Detected',
      message,
      buttons: [
        { title: 'Track Purchase' },
        { title: 'Dismiss' }
      ]
    });
  }

  async checkBudgetStatus(merchant: string, price: string): Promise<void> {
    try {
      const session = await chrome.storage.local.get('session');
      if (!session.session?.access_token) {
        console.log('[Notifications] No session for budget check');
        return;
      }

      // Call edge function to check budget status
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-budget-status`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ merchant, price }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        
        // Show alerts if budget thresholds crossed
        if (result.alerts && result.alerts.length > 0) {
          for (const alert of result.alerts) {
            await this.showBudgetAlert(alert);
          }
        }
        
        // Show merchant detection with budget info
        if (result.budgetStatus) {
          await this.showMerchantDetected({
            merchant,
            price,
            budgetStatus: result.budgetStatus
          });
        }
      }
    } catch (error) {
      console.error('[Notifications] Budget check failed:', error);
    }
  }

  setupListeners(): void {
    // Handle notification clicks
    chrome.notifications.onClicked.addListener((notificationId) => {
      console.log('[Notifications] Clicked:', notificationId);
      
      if (notificationId.startsWith('budget-alert')) {
        // Open budgets page
        chrome.tabs.create({ url: chrome.runtime.getURL('popup.html#budgets') });
      } else if (notificationId.startsWith('deal-alert')) {
        // Open deals/location page
        chrome.tabs.create({ url: chrome.runtime.getURL('popup.html#deals') });
      }
      
      chrome.notifications.clear(notificationId);
    });

    // Handle notification button clicks
    chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
      console.log('[Notifications] Button clicked:', notificationId, buttonIndex);
      
      if (notificationId.startsWith('budget-alert') && buttonIndex === 0) {
        chrome.tabs.create({ url: chrome.runtime.getURL('popup.html#budgets') });
      } else if (notificationId.startsWith('deal-alert') && buttonIndex === 0) {
        // Get directions - would need to implement with stored deal location
        console.log('[Notifications] Opening directions');
      }
      
      chrome.notifications.clear(notificationId);
    });
  }
}

export const notifications = new NotificationService();
