import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Separator } from "@/shared/components/ui/separator";
import { AlertCircle } from "lucide-react";

export default function DataProcessingPolicy() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-primary">Data Processing & Analytics Policy</CardTitle>
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
              <h2 className="text-2xl font-semibold text-foreground mb-3">1. What is Data Processing?</h2>
              <p className="text-foreground leading-relaxed mb-3">
                Data processing refers to the collection, storage, analysis, transformation, and use of your personal and financial information 
                to provide you with insights, recommendations, and services through the TrueSpend platform ("Service").
              </p>
              <p className="text-foreground leading-relaxed mb-3">
                This Data Processing & Analytics Policy explains in detail how TrueSpend processes your data to deliver the core functionality 
                of the Service, improve our algorithms, and generate personalized insights about your spending behavior and credit card usage.
              </p>
              <p className="text-foreground leading-relaxed">
                By using the Service and providing your explicit consent, you authorize TrueSpend to process your data as described in this policy.
              </p>
            </section>

            <Separator />

            <section id="types-of-data">
              <h2 className="text-2xl font-semibold text-foreground mb-3">2. Types of Data We Process</h2>
              <p className="text-foreground leading-relaxed mb-3">
                TrueSpend processes multiple categories of data to provide you with comprehensive spending analysis and recommendations:
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">2.1 Spending Patterns</h3>
              <p className="text-foreground leading-relaxed mb-3">
                We analyze your transaction history to identify:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Frequency and timing of purchases across different merchants and categories</li>
                <li>Average transaction amounts in various spending categories (groceries, dining, travel, entertainment, etc.)</li>
                <li>Seasonal spending trends and recurring expenses</li>
                <li>Payment method preferences (which credit cards you use for different types of purchases)</li>
                <li>Merchant loyalty and repeat purchase behavior</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">2.2 Merchant Categories & Metadata</h3>
              <p className="text-foreground leading-relaxed mb-3">
                We process merchant-related information to understand where and how you spend:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Merchant names, industry categories, and business types</li>
                <li>Merchant Category Codes (MCCs) assigned by payment networks</li>
                <li>Geographic locations of merchants and spending heatmaps</li>
                <li>Merchant acceptance of specific credit cards and payment methods</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">2.3 Card Metadata & Rewards Programs</h3>
              <p className="text-foreground leading-relaxed mb-3">
                We analyze your credit card information (without storing full card numbers) to optimize recommendations:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Card issuer, network (Visa, Mastercard, Amex, Discover), and card type</li>
                <li>Rewards program structures (cashback percentages, points multipliers, bonus categories)</li>
                <li>Annual fees, interest rates, and other card terms (where publicly available or provided by you)</li>
                <li>Card activation dates and usage frequency</li>
                <li>Estimated rewards earnings based on your spending patterns</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">2.4 Device & Usage Data</h3>
              <p className="text-foreground leading-relaxed mb-3">
                To improve the Service and ensure security, we process:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Device identifiers, IP addresses, and browser information</li>
                <li>App usage patterns, feature interactions, and session durations</li>
                <li>Error logs, crash reports, and performance metrics</li>
                <li>Location data (if you enable geofencing or location-based features)</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">2.5 Budget & Financial Goals</h3>
              <p className="text-foreground leading-relaxed">
                If you set budgets or financial goals within the Service, we process:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Budget limits and thresholds by category or merchant</li>
                <li>Spending progress relative to your defined goals</li>
                <li>Budget alerts and notifications preferences</li>
                <li>Historical budget adherence and overspending patterns</li>
              </ul>
            </section>

            <Separator />

            <section id="purposes-of-processing">
              <h2 className="text-2xl font-semibold text-foreground mb-3">3. Purposes of Data Processing</h2>
              <p className="text-foreground leading-relaxed mb-3">
                TrueSpend processes your data for the following specific purposes:
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">3.1 Personalized Recommendations</h3>
              <p className="text-foreground leading-relaxed mb-3">
                We analyze your spending data to provide tailored recommendations, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Which credit card to use for specific merchants or categories to maximize rewards</li>
                <li>Opportunities to switch cards for better rewards alignment with your spending behavior</li>
                <li>Alerts when you're using a suboptimal card for a purchase</li>
                <li>Suggestions for new credit cards that may better fit your spending profile</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">3.2 Spending Analytics & Insights</h3>
              <p className="text-foreground leading-relaxed mb-3">
                We generate visual and analytical insights to help you understand your financial behavior:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Spending breakdowns by category, merchant, time period, and payment method</li>
                <li>Trend analysis and comparative spending reports (e.g., this month vs. last month)</li>
                <li>Identification of unusual spending patterns or potential fraudulent activity</li>
                <li>Rewards earnings summaries and optimization opportunities</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">3.3 Budget Tracking & Alerts</h3>
              <p className="text-foreground leading-relaxed mb-3">
                We process your transaction data to track spending against budgets and notify you when:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>You approach or exceed budget thresholds</li>
                <li>Unusual spending activity is detected in a category</li>
                <li>Recurring expenses are due or have changed</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">3.4 Service Improvement & Innovation</h3>
              <p className="text-foreground leading-relaxed mb-3">
                We use aggregated and anonymized data (which cannot identify you individually) to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Improve our recommendation algorithms and machine learning models</li>
                <li>Develop new features and enhance existing functionality</li>
                <li>Understand broader user behavior trends and usage patterns</li>
                <li>Conduct research and development on financial technology solutions</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">3.5 Fraud Detection & Security</h3>
              <p className="text-foreground leading-relaxed">
                We analyze transaction patterns and account activity to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Detect suspicious or anomalous spending behavior</li>
                <li>Identify potential account compromise or unauthorized access</li>
                <li>Monitor for unusual login patterns or device usage</li>
                <li>Protect your account and personal information from security threats</li>
              </ul>
            </section>

            <Separator />

            <section id="aggregated-data">
              <h2 className="text-2xl font-semibold text-foreground mb-3">4. Use of Aggregated & Anonymized Data</h2>
              <p className="text-foreground leading-relaxed mb-3">
                In addition to processing your individual data to provide personalized services, TrueSpend aggregates and anonymizes user data 
                to generate insights that cannot identify any individual user.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">4.1 What is Aggregated Data?</h3>
              <p className="text-foreground leading-relaxed mb-3">
                Aggregated data is information that combines data from multiple users in a way that no individual user can be identified. For example:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>"25% of TrueSpend users spend more on dining in December compared to other months"</li>
                <li>"The average rewards earning per transaction for grocery purchases is 2.3%"</li>
                <li>"Users who link 3 or more credit cards earn 40% more rewards on average"</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">4.2 How We Use Aggregated Data</h3>
              <p className="text-foreground leading-relaxed mb-3">
                We use aggregated, anonymized data to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Improve the accuracy and relevance of our recommendation algorithms</li>
                <li>Benchmark your spending behavior against similar user cohorts (e.g., "You spend 15% more on travel than similar users")</li>
                <li>Understand market trends in credit card usage and rewards optimization</li>
                <li>Develop industry insights and reports (which may be shared publicly or with partners)</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                Aggregated data is not considered personal information under most privacy laws because it cannot reasonably be used to identify you. 
                However, we take steps to ensure that aggregated data remains anonymous and cannot be re-identified.
              </p>
            </section>

            <Separator />

            <section id="security-measures">
              <h2 className="text-2xl font-semibold text-foreground mb-3">5. Technical & Organizational Security Measures</h2>
              <p className="text-foreground leading-relaxed mb-3">
                We implement robust technical and organizational measures to protect your data during processing:
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">5.1 Data Encryption</h3>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li><strong>In Transit:</strong> All data transmitted between your device and our servers is encrypted using TLS/SSL</li>
                <li><strong>At Rest:</strong> Sensitive data stored in our databases is encrypted using AES-256 encryption</li>
                <li><strong>Tokenization:</strong> Credit card numbers and bank account numbers are tokenized and never stored in plaintext</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">5.2 Access Controls</h3>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Role-based access control (RBAC) ensures that only authorized personnel can access specific types of data</li>
                <li>Multi-factor authentication (MFA) is required for all internal access to production systems</li>
                <li>Access logs are maintained and regularly audited for suspicious activity</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">5.3 Data Minimization</h3>
              <p className="text-foreground leading-relaxed mb-3">
                We adhere to the principle of data minimization by:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Collecting only the data necessary to provide the Service</li>
                <li>Retaining data only for as long as needed for the purposes outlined in this policy</li>
                <li>Securely deleting or anonymizing data that is no longer required</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">5.4 Regular Security Audits</h3>
              <p className="text-foreground leading-relaxed">
                We conduct regular security assessments, penetration testing, and vulnerability scans to identify and address potential security risks.
              </p>
            </section>

            <Separator />

            <section id="third-party-processors">
              <h2 className="text-2xl font-semibold text-foreground mb-3">6. Third-Party Data Processors</h2>
              <p className="text-foreground leading-relaxed mb-3">
                To deliver the Service, we rely on trusted third-party processors who handle specific aspects of data processing on our behalf:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li><strong>Supabase / AWS:</strong> Cloud infrastructure for data storage, database management, and backend services</li>
                <li><strong>Plaid / MX:</strong> Financial data aggregation and secure account linking</li>
                <li><strong>Stripe:</strong> Payment processing and subscription billing</li>
                <li><strong>Resend:</strong> Transactional and notification email delivery</li>
                <li><strong>Analytics Providers:</strong> Usage analytics and error tracking</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                All third-party processors are contractually required to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Process data only for the purposes specified by TrueSpend</li>
                <li>Implement appropriate security measures to protect your data</li>
                <li>Comply with applicable data protection laws and regulations</li>
                <li>Not use your data for their own independent purposes</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                We carefully vet all third-party processors and regularly review their security practices and compliance posture.
              </p>
            </section>

            <Separator />

            <section id="your-control">
              <h2 className="text-2xl font-semibold text-foreground mb-3">7. Your Control Over Data Processing</h2>
              <p className="text-foreground leading-relaxed mb-3">
                You have control over how your data is processed within the Service:
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">7.1 Consent & Authorization</h3>
              <p className="text-foreground leading-relaxed mb-3">
                By creating a TrueSpend account and linking your financial accounts, you provide explicit consent for us to process your data 
                as described in this policy. You can withdraw your consent at any time by:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Unlinking financial accounts from the Service</li>
                <li>Disabling specific features (e.g., location tracking, budget alerts)</li>
                <li>Closing your TrueSpend account</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3 font-semibold">
                Note: Withdrawing consent or closing your account will limit or terminate your access to the Service, as data processing is essential 
                to core functionality.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">7.2 Data Access & Correction</h3>
              <p className="text-foreground leading-relaxed mb-3">
                You can:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>View your transaction data and spending analytics at any time through the Service</li>
                <li>Request a copy of your personal data by contacting support@truespend.org</li>
                <li>Correct inaccurate or outdated information through your account settings</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">7.3 Data Deletion</h3>
              <p className="text-foreground leading-relaxed">
                You can request deletion of your data by closing your account or contacting us at support@truespend.org. 
                Note that certain data may be retained for legal or regulatory compliance purposes even after account closure.
              </p>
            </section>

            <Separator />

            <section id="contact">
              <h2 className="text-2xl font-semibold text-foreground mb-3">8. Contact Information</h2>
              <p className="text-foreground leading-relaxed">
                If you have any questions, concerns, or requests regarding how we process your data, please contact us at:
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