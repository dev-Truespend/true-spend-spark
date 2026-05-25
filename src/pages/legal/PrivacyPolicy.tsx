import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Separator } from "@/shared/components/ui/separator";
import { AlertCircle } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-primary">TrueSpend Privacy Policy</CardTitle>
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
              <h2 className="text-2xl font-semibold text-foreground mb-3">1. Introduction & Scope</h2>
              <p className="text-foreground leading-relaxed mb-3">
                TrueSpend ("we," "our," or "us") is committed to protecting your privacy and handling your personal information with care and transparency. 
                This Privacy Policy explains how we collect, use, share, store, and protect your information when you use the TrueSpend platform, 
                including our website, mobile applications, browser extensions, and all related services (collectively, the "Service").
              </p>
              <p className="text-foreground leading-relaxed mb-3">
                By using the Service, you acknowledge that you have read, understood, and agree to the practices described in this Privacy Policy. 
                If you do not agree with our privacy practices, please do not use the Service.
              </p>
              <p className="text-foreground leading-relaxed">
                This Privacy Policy should be read in conjunction with our Terms of Service and other applicable agreements.
              </p>
            </section>

            <Separator />

            <section id="information-collected">
              <h2 className="text-2xl font-semibold text-foreground mb-3">2. Information We Collect</h2>
              <p className="text-foreground leading-relaxed mb-3">
                We collect various types of information to provide, maintain, and improve the Service. The categories of information we collect include:
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">2.1 Account Information</h3>
              <p className="text-foreground leading-relaxed mb-3">
                When you register for a TrueSpend account, we collect:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Name (first and last)</li>
                <li>Email address</li>
                <li>Password (stored in hashed format)</li>
                <li>Account preferences and settings</li>
                <li>Authentication provider information (if you sign up using Google or other third-party authentication)</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">2.2 Financial Data & Transaction Information</h3>
              <p className="text-foreground leading-relaxed mb-3">
                With your explicit authorization, we collect and process financial data from linked accounts, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Transaction history (merchant names, transaction amounts, dates, and categories)</li>
                <li>Credit card metadata (card type, last four digits, issuer, rewards program details)</li>
                <li>Bank account information (via integrations with Plaid, MX, or similar services)</li>
                <li>Spending patterns and categorizations</li>
                <li>Budget settings and limits</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                We do not have direct access to your full credit card numbers, bank account numbers, or online banking credentials. 
                These are securely managed by our trusted third-party financial data aggregators.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">2.3 Location Data</h3>
              <p className="text-foreground leading-relaxed mb-3">
                If you enable location-based features (such as geofencing or location-aware merchant recommendations), we collect:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>GPS coordinates and location data from your device</li>
                <li>Geofence entry and exit events</li>
                <li>Location-based spending insights and patterns</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                Location data collection is entirely optional. You can enable or disable location tracking at any time through your device settings 
                or within the Service.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">2.4 Usage Data</h3>
              <p className="text-foreground leading-relaxed mb-3">
                We automatically collect information about how you interact with the Service, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Device information (device type, operating system, browser type and version)</li>
                <li>IP address and general geographic location</li>
                <li>Pages visited, features used, and time spent within the Service</li>
                <li>Error logs, crash reports, and diagnostic data</li>
                <li>Referral sources and navigation patterns</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">2.5 Communication Data</h3>
              <p className="text-foreground leading-relaxed">
                If you communicate with us via email, support requests, or in-app messaging, we collect the content of your messages, 
                your contact information, and related metadata to respond to your inquiries and improve our customer support.
              </p>
            </section>

            <Separator />

            <section id="how-we-use">
              <h2 className="text-2xl font-semibold text-foreground mb-3">3. How We Use Your Information</h2>
              <p className="text-foreground leading-relaxed mb-3">
                We use the information we collect for the following purposes:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>
                  <strong>To Provide and Maintain the Service:</strong> Process transactions, analyze spending patterns, generate insights, 
                  and deliver personalized recommendations
                </li>
                <li>
                  <strong>To Improve the Service:</strong> Analyze usage trends, conduct research and development, test new features, 
                  and optimize the user experience
                </li>
                <li>
                  <strong>To Communicate with You:</strong> Send transactional emails (e.g., account verification, password resets, payment receipts), 
                  security alerts, product updates, and (with your consent) marketing communications
                </li>
                <li>
                  <strong>To Secure Your Account:</strong> Detect and prevent fraud, unauthorized access, account abuse, and security threats. 
                  Implement multi-factor authentication (MFA) and login monitoring
                </li>
                <li>
                  <strong>To Comply with Legal Obligations:</strong> Respond to legal requests, enforce our Terms of Service, protect our rights, 
                  and comply with applicable laws and regulations
                </li>
                <li>
                  <strong>To Analyze Spending Behavior:</strong> Use AI and machine learning models to identify spending patterns, 
                  optimize reward strategies, and generate personalized insights
                </li>
                <li>
                  <strong>To Provide Customer Support:</strong> Respond to your inquiries, troubleshoot issues, and resolve disputes
                </li>
              </ul>
            </section>

            <Separator />

            <section id="legal-bases">
              <h2 className="text-2xl font-semibold text-foreground mb-3">4. Legal Bases for Processing</h2>
              <p className="text-foreground leading-relaxed mb-3">
                We process your personal information based on the following legal grounds:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>
                  <strong>Consent:</strong> You have given explicit consent for us to process your financial data, location data, 
                  and other sensitive information for the purposes described in this Privacy Policy
                </li>
                <li>
                  <strong>Contractual Necessity:</strong> Processing is necessary to fulfill our obligations under the Terms of Service 
                  and to provide you with the Service
                </li>
                <li>
                  <strong>Legitimate Interests:</strong> We have a legitimate interest in improving the Service, preventing fraud, 
                  ensuring security, and communicating with users about important updates
                </li>
                <li>
                  <strong>Legal Compliance:</strong> Processing is necessary to comply with legal obligations, such as responding to lawful 
                  requests from government authorities or enforcing our legal rights
                </li>
              </ul>
            </section>

            <Separator />

            <section id="sharing">
              <h2 className="text-2xl font-semibold text-foreground mb-3">5. Sharing of Information</h2>
              <p className="text-foreground leading-relaxed mb-3">
                We do not sell, rent, or trade your personal information to third parties for their marketing purposes. 
                However, we may share your information in the following circumstances:
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">5.1 Service Providers</h3>
              <p className="text-foreground leading-relaxed mb-3">
                We share information with trusted third-party service providers who perform services on our behalf, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li><strong>Cloud Infrastructure:</strong> Supabase, AWS (for hosting, data storage, and backend services)</li>
                <li><strong>Financial Data Aggregators:</strong> Plaid, MX (for securely connecting and accessing your financial accounts)</li>
                <li><strong>Payment Processing:</strong> Stripe (for processing subscription payments)</li>
                <li><strong>Email Services:</strong> Resend (for transactional and notification emails)</li>
                <li><strong>Analytics and Monitoring:</strong> Service providers for usage analytics, error tracking, and performance monitoring</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                These service providers are contractually obligated to use your information only for the purposes we specify and to protect 
                your information in accordance with industry standards.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">5.2 Legal Requirements</h3>
              <p className="text-foreground leading-relaxed mb-3">
                We may disclose your information if required by law or if we believe in good faith that such disclosure is necessary to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Comply with legal process, court orders, or government requests</li>
                <li>Enforce our Terms of Service or other agreements</li>
                <li>Protect the rights, property, or safety of TrueSpend, our users, or the public</li>
                <li>Detect, prevent, or address fraud, security issues, or technical problems</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">5.3 Business Transfers</h3>
              <p className="text-foreground leading-relaxed">
                In the event of a merger, acquisition, reorganization, bankruptcy, or sale of assets, your information may be transferred 
                to the acquiring entity. We will notify you of any such change in ownership or control of your personal information.
              </p>
            </section>

            <Separator />

            <section id="cookies">
              <h2 className="text-2xl font-semibold text-foreground mb-3">6. Cookies & Similar Technologies</h2>
              <p className="text-foreground leading-relaxed mb-3">
                We use cookies, web beacons, and similar tracking technologies to collect information about your usage of the Service and to improve your experience.
              </p>
              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">Types of Cookies We Use:</h3>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li><strong>Essential Cookies:</strong> Necessary for the Service to function properly (e.g., authentication, session management)</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how users interact with the Service and identify areas for improvement</li>
                <li><strong>Preference Cookies:</strong> Remember your settings and preferences for a more personalized experience</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                You can manage cookie preferences through your browser settings. However, disabling certain cookies may affect the functionality of the Service.
              </p>
            </section>

            <Separator />

            <section id="data-retention">
              <h2 className="text-2xl font-semibold text-foreground mb-3">7. Data Retention</h2>
              <p className="text-foreground leading-relaxed mb-3">
                We retain your personal information for as long as necessary to provide the Service, fulfill the purposes described in this Privacy Policy, 
                and comply with legal obligations. Retention periods vary depending on the type of data:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li><strong>Account Information:</strong> Retained for the duration of your account and for a reasonable period after account closure</li>
                <li><strong>Transaction Data:</strong> Retained for at least 7 years to comply with financial record-keeping requirements</li>
                <li><strong>Usage Logs:</strong> Typically retained for 30-90 days for analytics and troubleshooting</li>
                <li><strong>Marketing Communications:</strong> Retained until you unsubscribe or request deletion</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                When information is no longer needed, we securely delete or anonymize it in accordance with our data retention policies.
              </p>
            </section>

            <Separator />

            <section id="data-security">
              <h2 className="text-2xl font-semibold text-foreground mb-3">8. Data Security</h2>
              <p className="text-foreground leading-relaxed mb-3">
                We implement industry-standard technical and organizational security measures to protect your information from unauthorized access, 
                disclosure, alteration, and destruction. These measures include:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Encryption of data in transit (TLS/SSL) and at rest</li>
                <li>Multi-factor authentication (MFA) for account access</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Access controls and role-based permissions for internal systems</li>
                <li>Secure credential storage and password hashing</li>
                <li>Monitoring and logging of suspicious activity</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                While we take reasonable precautions to protect your information, no method of transmission over the internet or electronic storage 
                is 100% secure. We cannot guarantee absolute security, and you acknowledge that you provide your information at your own risk.
              </p>
            </section>

            <Separator />

            <section id="your-rights">
              <h2 className="text-2xl font-semibold text-foreground mb-3">9. Your Rights & Choices</h2>
              <p className="text-foreground leading-relaxed mb-3">
                Depending on your location and applicable privacy laws, you may have certain rights regarding your personal information:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information, subject to legal retention requirements</li>
                <li><strong>Data Portability:</strong> Request a machine-readable copy of your data to transfer to another service</li>
                <li><strong>Withdraw Consent:</strong> Withdraw your consent for certain types of data processing (note: this may limit Service functionality)</li>
                <li><strong>Opt-Out of Marketing:</strong> Unsubscribe from marketing communications at any time</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                To exercise any of these rights, please contact us at support@truespend.org. We will respond to your request within a reasonable timeframe 
                and in accordance with applicable laws.
              </p>
            </section>

            <Separator />

            <section id="international-transfers">
              <h2 className="text-2xl font-semibold text-foreground mb-3">10. International Transfers</h2>
              <p className="text-foreground leading-relaxed mb-3">
                TrueSpend is based in the United States, and your information may be transferred to, stored, and processed in the United States or other 
                countries where our service providers operate. Data protection laws in these countries may differ from those in your country of residence.
              </p>
              <p className="text-foreground leading-relaxed">
                By using the Service, you consent to the transfer of your information to countries outside your country of residence, including the United States. 
                We take appropriate measures to ensure that your information receives adequate protection in accordance with this Privacy Policy and applicable laws.
              </p>
            </section>

            <Separator />

            <section id="childrens-privacy">
              <h2 className="text-2xl font-semibold text-foreground mb-3">11. Children's Privacy</h2>
              <p className="text-foreground leading-relaxed mb-3">
                The Service is not directed to individuals under the age of 18. We do not knowingly collect personal information from children under 18. 
                If we become aware that we have inadvertently collected information from a child under 18, we will take steps to delete such information as quickly as possible.
              </p>
              <p className="text-foreground leading-relaxed">
                If you are a parent or guardian and believe that your child has provided us with personal information, please contact us at support@truespend.org.
              </p>
            </section>

            <Separator />

            <section id="changes-to-policy">
              <h2 className="text-2xl font-semibold text-foreground mb-3">12. Changes to This Privacy Policy</h2>
              <p className="text-foreground leading-relaxed mb-3">
                We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. 
                If we make material changes, we will notify you by:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Posting the updated Privacy Policy on this page with a new "Last Updated" date</li>
                <li>Sending you an email notification</li>
                <li>Displaying a prominent notice within the Service</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                Your continued use of the Service after the effective date of the updated Privacy Policy constitutes your acceptance of the changes. 
                We encourage you to review this Privacy Policy periodically.
              </p>
            </section>

            <Separator />

            <section id="contact">
              <h2 className="text-2xl font-semibold text-foreground mb-3">13. Contact Information</h2>
              <p className="text-foreground leading-relaxed">
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:
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