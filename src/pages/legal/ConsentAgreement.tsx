import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AlertCircle } from "lucide-react";

export default function ConsentAgreement() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-primary">User Consent & Communication Agreement</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">Version 1.0 | Last updated: January 20, 2025</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This policy is provided for general informational purposes and does not constitute legal advice. 
                You should consult with your own legal counsel before relying on this document.
              </AlertDescription>
            </Alert>

            <section id="introduction">
              <h2 className="text-2xl font-semibold text-foreground mb-3">1. Introduction & Purpose</h2>
              <p className="text-foreground leading-relaxed mb-3">
                This User Consent & Communication Agreement ("Agreement") explains the types of consents you provide when using TrueSpend, 
                what data processing and communications you authorize, and how you can manage or withdraw your consent.
              </p>
              <p className="text-foreground leading-relaxed mb-3">
                By creating a TrueSpend account and using the Service, you provide explicit, informed consent for:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Processing and analyzing your financial and personal data to provide insights and recommendations</li>
                <li>Receiving transactional, verification, security, and essential product emails</li>
                <li>Optional marketing and promotional communications (which you can opt out of at any time)</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                This Agreement should be read in conjunction with our Privacy Policy, Terms of Service, and Data Processing Policy.
              </p>
            </section>

            <Separator />

            <section id="data-processing-consent">
              <h2 className="text-2xl font-semibold text-foreground mb-3">2. Consent to Data Processing & Analysis</h2>
              
              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">2.1 What You're Consenting To</h3>
              <p className="text-foreground leading-relaxed mb-3">
                By using TrueSpend, you consent to the collection, storage, processing, and analysis of your:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li><strong>Financial Data:</strong> Transaction history, credit card metadata, spending patterns, merchant information, 
                  and account balances (accessed through integrations with financial data aggregators like Plaid or MX)
                </li>
                <li><strong>Personal Information:</strong> Name, email address, account preferences, and contact details</li>
                <li><strong>Location Data:</strong> GPS coordinates and geofence events (if you enable location-based features)</li>
                <li><strong>Device & Usage Data:</strong> Device information, IP address, app usage patterns, and error logs</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">2.2 Purpose of Processing</h3>
              <p className="text-foreground leading-relaxed mb-3">
                We process your data to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Generate personalized spending insights and credit card reward optimization recommendations</li>
                <li>Categorize transactions and identify spending patterns</li>
                <li>Track budgets and send alerts when you approach spending limits</li>
                <li>Detect anomalous or potentially fraudulent activity</li>
                <li>Improve the Service through machine learning and analytics</li>
                <li>Provide customer support and respond to your inquiries</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">2.3 Voluntary Nature of Consent</h3>
              <p className="text-foreground leading-relaxed mb-3">
                Providing this consent is voluntary, but it is necessary to use TrueSpend's core features. Without consent to process your financial data:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>We cannot analyze your spending patterns or generate recommendations</li>
                <li>Budget tracking and alerts will not function</li>
                <li>You will not receive personalized insights</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                In other words, data processing consent is essential to the Service's functionality.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">2.4 How to Withdraw Consent</h3>
              <p className="text-foreground leading-relaxed">
                You can withdraw your consent for data processing at any time by:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Unlinking your financial accounts from the Service</li>
                <li>Disabling specific features (e.g., location tracking, budget alerts)</li>
                <li>Closing your TrueSpend account entirely</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3 font-semibold">
                Note: Withdrawing consent will limit or terminate your access to the Service, as data processing is fundamental to how TrueSpend operates.
              </p>
            </section>

            <Separator />

            <section id="transactional-emails">
              <h2 className="text-2xl font-semibold text-foreground mb-3">3. Consent to Transactional & Essential Emails</h2>
              
              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">3.1 Types of Transactional Emails</h3>
              <p className="text-foreground leading-relaxed mb-3">
                By creating a TrueSpend account, you consent to receive the following types of essential, transactional emails:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li><strong>Account Verification:</strong> Email verification links and confirmation of account creation</li>
                <li><strong>Authentication & Security:</strong> Multi-factor authentication (MFA) codes, password reset links, 
                  login alerts, and security notifications (e.g., new device login detected)
                </li>
                <li><strong>Subscription & Billing:</strong> Payment receipts, subscription renewal notices, failed payment alerts, 
                  and account status updates
                </li>
                <li><strong>Service Updates:</strong> Critical announcements about changes to the Service, Terms of Service updates, 
                  privacy policy changes, or system maintenance notifications
                </li>
                <li><strong>Budget Alerts:</strong> Notifications when you approach or exceed budget thresholds (if you have enabled budget tracking)</li>
                <li><strong>Support & Account Management:</strong> Responses to your customer support inquiries, password change confirmations, 
                  and account setting update notifications
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">3.2 Why These Emails Are Essential</h3>
              <p className="text-foreground leading-relaxed mb-3">
                Transactional emails are necessary for the operation, security, and legal compliance of the Service. They are not promotional 
                in nature and cannot be opted out of without closing your account.
              </p>
              <p className="text-foreground leading-relaxed mt-3">
                For example:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>You must receive email verification links to activate your account</li>
                <li>MFA codes are required for secure login if you enable multi-factor authentication</li>
                <li>Payment receipts are legally required documentation of financial transactions</li>
                <li>Security alerts protect you from unauthorized account access</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">3.3 Cannot Be Disabled</h3>
              <p className="text-foreground leading-relaxed">
                You cannot unsubscribe from transactional and essential emails without closing your TrueSpend account. However, you can manage 
                certain preferences (e.g., disabling budget alert emails) through your account settings.
              </p>
            </section>

            <Separator />

            <section id="marketing-communications">
              <h2 className="text-2xl font-semibold text-foreground mb-3">4. Marketing & Promotional Communications (Optional)</h2>
              
              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">4.1 Types of Marketing Emails</h3>
              <p className="text-foreground leading-relaxed mb-3">
                In addition to transactional emails, TrueSpend may send optional marketing and promotional communications, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Product updates and new feature announcements</li>
                <li>Tips and best practices for maximizing credit card rewards</li>
                <li>Personalized recommendations for new credit cards or financial products</li>
                <li>Surveys, feedback requests, and user research invitations</li>
                <li>Promotional offers, discounts, or referral program information</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">4.2 Opting In & Opting Out</h3>
              <p className="text-foreground leading-relaxed mb-3">
                Marketing communications are optional. You can:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li><strong>Opt In:</strong> During account creation or in your account settings, you can choose to receive marketing emails</li>
                <li><strong>Opt Out:</strong> Click the "Unsubscribe" link at the bottom of any marketing email, or adjust your preferences 
                  in account settings
                </li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3 font-semibold">
                Opting out of marketing emails will NOT affect your ability to receive transactional emails or use the Service.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">4.3 Frequency & Relevance</h3>
              <p className="text-foreground leading-relaxed">
                We strive to send marketing emails that are relevant to your interests and to avoid overwhelming your inbox. 
                If you opt in, you can expect to receive marketing emails no more than once per week on average.
              </p>
            </section>

            <Separator />

            <section id="push-notifications">
              <h2 className="text-2xl font-semibold text-foreground mb-3">5. Push Notifications (Optional)</h2>
              <p className="text-foreground leading-relaxed mb-3">
                If you use the TrueSpend mobile app or browser extension, you may enable push notifications for:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Real-time budget alerts</li>
                <li>Transaction categorization reminders</li>
                <li>Geofence entry/exit notifications (if location tracking is enabled)</li>
                <li>Security alerts (e.g., unusual login activity)</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                Push notifications are entirely optional and can be enabled or disabled through:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Your device settings (iOS Settings → Notifications, Android Settings → Apps → TrueSpend)</li>
                <li>In-app notification preferences within TrueSpend</li>
              </ul>
            </section>

            <Separator />

            <section id="withdrawing-consent">
              <h2 className="text-2xl font-semibold text-foreground mb-3">6. How to Withdraw Consent</h2>
              
              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">6.1 Partial Withdrawal</h3>
              <p className="text-foreground leading-relaxed mb-3">
                You can withdraw consent for specific types of data processing or communications without closing your account:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li><strong>Location Data:</strong> Disable location tracking through your device settings or within the app</li>
                <li><strong>Budget Alerts:</strong> Turn off budget alert emails or push notifications in account settings</li>
                <li><strong>Marketing Emails:</strong> Click "Unsubscribe" in any marketing email or adjust preferences in account settings</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">6.2 Full Withdrawal (Account Closure)</h3>
              <p className="text-foreground leading-relaxed mb-3">
                To fully withdraw consent for all data processing and communications:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Navigate to Settings → Account → Close Account</li>
                <li>Follow the account closure prompts</li>
                <li>Confirm your decision to delete your account</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                Upon account closure:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Your access to the Service will be terminated immediately (or at the end of your current paid billing period if you have an active subscription)</li>
                <li>We will delete your personal data in accordance with our data retention policies and legal obligations</li>
                <li>Some data may be retained for compliance, fraud prevention, or legal purposes (see Privacy Policy for details)</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">6.3 Impact of Withdrawal</h3>
              <p className="text-foreground leading-relaxed">
                Withdrawing consent may limit or eliminate your ability to use certain features:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Disabling location tracking will prevent geofence-based spending insights</li>
                <li>Turning off budget alerts means you won't receive overspending notifications</li>
                <li>Unlinking financial accounts will stop transaction analysis and recommendations</li>
              </ul>
            </section>

            <Separator />

            <section id="required-vs-optional">
              <h2 className="text-2xl font-semibold text-foreground mb-3">7. Required vs. Optional Consents</h2>
              
              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">7.1 Required Consents (Cannot Opt Out Without Closing Account)</h3>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Processing of account information (name, email, password)</li>
                <li>Processing of financial data necessary to provide core Service functionality</li>
                <li>Receipt of transactional and security-related emails</li>
                <li>Use of cookies and similar technologies for authentication and session management</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">7.2 Optional Consents (Can Opt In/Out)</h3>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Location data collection and geofencing</li>
                <li>Marketing and promotional emails</li>
                <li>Push notifications</li>
                <li>Participation in user research or surveys</li>
                <li>Use of non-essential cookies for analytics and advertising</li>
              </ul>
            </section>

            <Separator />

            <section id="contact">
              <h2 className="text-2xl font-semibold text-foreground mb-3">8. Contact Information</h2>
              <p className="text-foreground leading-relaxed">
                If you have any questions about your consents, how to manage your communication preferences, or how to withdraw consent, 
                please contact us at:
              </p>
              <p className="text-foreground leading-relaxed mt-3 font-medium">
                Email: <a href="mailto:support@truespend.org" className="text-primary hover:underline">support@truespend.org</a>
              </p>
              <p className="text-foreground leading-relaxed mt-3">
                We will respond to your inquiries as promptly as possible.
              </p>
            </section>

            <Separator className="my-8" />

            <p className="text-sm text-muted-foreground text-center">
              © 2025 TrueSpend. All rights reserved.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}