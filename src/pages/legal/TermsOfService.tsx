import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Separator } from "@/shared/components/ui/separator";
import { AlertCircle } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-primary">TrueSpend Terms of Service</CardTitle>
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
              <h2 className="text-2xl font-semibold text-foreground mb-3">1. Introduction & Acceptance of Terms</h2>
              <p className="text-foreground leading-relaxed mb-3">
                Welcome to TrueSpend ("we," "our," or "us"). These Terms of Service ("Terms") govern your access to and use of the TrueSpend platform, 
                including our website, mobile applications, browser extensions, and all related services (collectively, the "Service").
              </p>
              <p className="text-foreground leading-relaxed mb-3">
                By creating an account, accessing, or using the Service, you agree to be bound by these Terms and our Privacy Policy. 
                If you do not agree to these Terms, you may not use the Service.
              </p>
              <p className="text-foreground leading-relaxed">
                We may modify these Terms at any time. We will notify you of material changes by posting the updated Terms with a new "Last Updated" date. 
                Your continued use of the Service after such changes constitutes acceptance of the modified Terms.
              </p>
            </section>

            <Separator />

            <section id="eligibility">
              <h2 className="text-2xl font-semibold text-foreground mb-3">2. Eligibility & Account Registration</h2>
              <p className="text-foreground leading-relaxed mb-3">
                You must be at least 18 years old and reside in the United States to use the Service. By using the Service, you represent and warrant 
                that you meet these eligibility requirements.
              </p>
              <p className="text-foreground leading-relaxed mb-3">
                When you register for an account, you agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and promptly update your account information to keep it accurate and current</li>
                <li>Maintain the security and confidentiality of your login credentials</li>
                <li>Immediately notify us of any unauthorized use of your account</li>
                <li>Accept full responsibility for all activities that occur under your account</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                We reserve the right to suspend or terminate accounts that provide false information or violate these Terms.
              </p>
            </section>

            <Separator />

            <section id="service-description">
              <h2 className="text-2xl font-semibold text-foreground mb-3">3. Description of the Service</h2>
              <p className="text-foreground leading-relaxed mb-3">
                TrueSpend is a financial technology platform that analyzes your spending patterns, transaction data, and credit card metadata 
                to provide insights and recommendations designed to optimize your credit card rewards and spending efficiency.
              </p>
              <p className="text-foreground leading-relaxed mb-3">
                The Service includes, but is not limited to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Analysis of transaction history and spending patterns across multiple payment methods</li>
                <li>Credit card rewards optimization recommendations based on your spending behavior</li>
                <li>Budget tracking and alerts to help you manage spending in various categories</li>
                <li>Geofence-based spending insights and location-aware recommendations</li>
                <li>Suggestions for which credit card to use at specific merchants or for specific purchase categories</li>
                <li>Alerts and notifications about spending trends, budget thresholds, and opportunities</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                TrueSpend may integrate with third-party services (such as Plaid, MX, or similar financial data aggregators) to access your financial data 
                with your explicit authorization.
              </p>
            </section>

            <Separator />

            <section id="no-financial-advice">
              <h2 className="text-2xl font-semibold text-foreground mb-3">4. No Financial, Investment, Legal, or Tax Advice</h2>
              <p className="text-foreground leading-relaxed mb-3 font-semibold">
                TRUESPEND IS NOT A FINANCIAL ADVISOR, INVESTMENT ADVISOR, LEGAL ADVISOR, OR TAX ADVISOR. THE SERVICE IS PROVIDED FOR INFORMATIONAL 
                AND ANALYTICAL PURPOSES ONLY.
              </p>
              <p className="text-foreground leading-relaxed mb-3">
                All insights, recommendations, suggestions, and analyses provided by TrueSpend are based on algorithmic processing of your data and 
                publicly available information about credit card terms, rewards programs, and merchant categories. These outputs:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Do not constitute professional financial, investment, legal, or tax advice</li>
                <li>Should not be relied upon as a substitute for consultation with qualified professionals</li>
                <li>Are not guaranteed to be accurate, complete, or suitable for your individual circumstances</li>
                <li>May not reflect the most current terms or offerings from financial institutions</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                You are solely responsible for evaluating the accuracy, completeness, and usefulness of all information and recommendations provided 
                by the Service. You bear all risks associated with your use of the Service and any decisions you make based on the Service's outputs.
              </p>
              <p className="text-foreground leading-relaxed mt-3">
                Before making any financial decision, we strongly encourage you to consult with a qualified financial advisor, tax professional, 
                or attorney who can provide advice tailored to your specific situation.
              </p>
            </section>

            <Separator />

            <section id="subscription">
              <h2 className="text-2xl font-semibold text-foreground mb-3">5. Subscription Plans & Billing</h2>
              <p className="text-foreground leading-relaxed mb-3">
                TrueSpend offers both free and paid subscription plans. The specific features, limitations, and pricing of each plan are described 
                on our website and in the Service. We reserve the right to change our pricing and plan features at any time.
              </p>
              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">5.1 Free Basic Plan</h3>
              <p className="text-foreground leading-relaxed mb-3">
                The Free Basic plan provides limited access to core features of the Service. We may modify or discontinue the Free Basic plan 
                at any time without notice.
              </p>
              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">5.2 Paid Subscription Plans</h3>
              <p className="text-foreground leading-relaxed mb-3">
                Paid plans (such as Plus, Elite, or other tiers) unlock additional features, higher usage limits, and premium functionality. 
                When you subscribe to a paid plan:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>You authorize us to charge your payment method on a recurring basis (monthly or annually, as selected)</li>
                <li>Your subscription will automatically renew at the end of each billing period unless you cancel before the renewal date</li>
                <li>You will be charged the then-current subscription price at each renewal</li>
                <li>Subscription fees are billed in advance for each billing cycle</li>
              </ul>
              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">5.3 STRICT NO-REFUND POLICY</h3>
              <p className="text-foreground leading-relaxed mb-3 font-semibold">
                ALL SUBSCRIPTION PAYMENTS ARE FINAL AND NON-REFUNDABLE, EXCEPT WHERE REQUIRED BY APPLICABLE LAW.
              </p>
              <p className="text-foreground leading-relaxed mb-3">
                Once a billing period has begun and your payment has been processed, you are not entitled to a refund for that period, 
                even if you cancel your subscription, stop using the Service, or are dissatisfied with the Service. This no-refund policy applies 
                to all subscription plans and billing cycles.
              </p>
              <p className="text-foreground leading-relaxed mb-3">
                If you cancel your paid subscription, you will retain access to paid features until the end of your current billing period. 
                After that period expires, your account will revert to the Free Basic plan (if available) or will be downgraded accordingly.
              </p>
              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">5.4 Payment Processing</h3>
              <p className="text-foreground leading-relaxed mb-3">
                We use third-party payment processors (such as Stripe) to handle subscription billing. By providing payment information, 
                you agree to the terms and privacy policies of our payment processor. You are responsible for ensuring that your payment method 
                is valid and has sufficient funds or credit available for each billing cycle.
              </p>
              <p className="text-foreground leading-relaxed">
                If a payment fails, we may retry the charge or suspend your access to paid features until payment is successfully processed.
              </p>
            </section>

            <Separator />

            <section id="user-responsibilities">
              <h2 className="text-2xl font-semibold text-foreground mb-3">6. User Responsibilities</h2>
              <p className="text-foreground leading-relaxed mb-3">
                As a user of the Service, you agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Use the Service only for lawful purposes and in compliance with these Terms</li>
                <li>Provide accurate and truthful information when connecting financial accounts or entering data</li>
                <li>Keep your login credentials confidential and secure</li>
                <li>Not share your account with others or allow unauthorized access</li>
                <li>Not attempt to reverse-engineer, decompile, or disassemble any part of the Service</li>
                <li>Not use automated means (bots, scrapers, etc.) to access the Service without our express written permission</li>
                <li>Not interfere with or disrupt the integrity or performance of the Service</li>
                <li>Not violate any applicable local, state, national, or international law or regulation</li>
              </ul>
            </section>

            <Separator />

            <section id="prohibited-activities">
              <h2 className="text-2xl font-semibold text-foreground mb-3">7. Prohibited Activities & Fraud Prevention</h2>
              <p className="text-foreground leading-relaxed mb-3">
                You may not use the Service to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Engage in fraudulent activity, money laundering, or any form of illegal financial behavior</li>
                <li>Misrepresent your identity, affiliation, or the source of funds</li>
                <li>Upload, transmit, or distribute malicious code, viruses, or harmful software</li>
                <li>Infringe upon the intellectual property rights of TrueSpend or any third party</li>
                <li>Harass, abuse, or harm other users or employees of TrueSpend</li>
                <li>Collect or harvest personal information of other users</li>
                <li>Use the Service for any commercial purpose without our prior written consent</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                We reserve the right to investigate suspected violations of these Terms and to cooperate with law enforcement authorities 
                in the event of suspected illegal activity.
              </p>
            </section>

            <Separator />

            <section id="third-party-services">
              <h2 className="text-2xl font-semibold text-foreground mb-3">8. Third-Party Services & Links</h2>
              <p className="text-foreground leading-relaxed mb-3">
                The Service may integrate with or link to third-party services, websites, or platforms, including but not limited to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Financial data aggregators (e.g., Plaid, MX)</li>
                <li>Payment processors (e.g., Stripe)</li>
                <li>Email service providers (e.g., Resend)</li>
                <li>Cloud infrastructure providers (e.g., Supabase, AWS)</li>
                <li>Analytics and monitoring services</li>
                <li>Credit card issuer websites and applications</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                We are not responsible for the content, privacy practices, or terms of service of any third-party services. Your use of third-party 
                services is subject to their respective terms and policies. We encourage you to review the terms and privacy policies of any third-party 
                services before providing them with your information or using their features.
              </p>
              <p className="text-foreground leading-relaxed mt-3">
                Any links to third-party websites or services are provided for your convenience only and do not constitute an endorsement or recommendation 
                by TrueSpend.
              </p>
            </section>

            <Separator />

            <section id="ai-automation">
              <h2 className="text-2xl font-semibold text-foreground mb-3">9. AI, Automation & Limitations</h2>
              <p className="text-foreground leading-relaxed mb-3">
                TrueSpend uses artificial intelligence (AI), machine learning models, and automated algorithms to analyze your spending data and generate 
                insights, recommendations, and predictions. You acknowledge and agree that:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>AI-generated outputs are probabilistic and may contain errors, inaccuracies, or incomplete information</li>
                <li>AI models are trained on historical data and may not account for recent changes in credit card terms, rewards programs, or market conditions</li>
                <li>Automated categorization of transactions may sometimes be incorrect or inconsistent</li>
                <li>Recommendations are based on patterns in your data and general assumptions, not on a comprehensive understanding of your unique financial situation</li>
                <li>AI outputs should be independently verified by you before making any financial decisions</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                We do not guarantee the accuracy, completeness, timeliness, or reliability of any AI-generated content. You use AI-generated 
                insights and recommendations at your own risk.
              </p>
            </section>

            <Separator />

            <section id="affiliate-disclosure">
              <h2 className="text-2xl font-semibold text-foreground mb-3">10. Affiliate & Compensation Disclosure</h2>
              <p className="text-foreground leading-relaxed mb-3 font-semibold">
                TRUESPEND'S RECOMMENDATIONS ARE NEVER INFLUENCED BY AFFILIATE REVENUE OR COMMISSIONS.
              </p>
              <p className="text-foreground leading-relaxed mb-3">
                All credit card recommendations, merchant suggestions, and spending insights are based solely on:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Analysis of your spending behavior and transaction history</li>
                <li>Publicly available information about credit card rewards programs, terms, and benefits</li>
                <li>Algorithmic optimization to maximize your rewards earnings based on your usage patterns</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                While TrueSpend may participate in affiliate programs or receive referral compensation from financial institutions, 
                <strong> these financial relationships do NOT influence which products we recommend to you.</strong> We do not prioritize, 
                rank, or highlight products based on the commissions or affiliate revenue we may receive.
              </p>
              <p className="text-foreground leading-relaxed mt-3">
                For full details on our affiliate relationships and compensation practices, please see our{" "}
                <a href="/legal/affiliate-transparency" className="text-primary hover:underline">
                  Affiliate Transparency Policy
                </a>.
              </p>
            </section>

            <Separator />

            <section id="intellectual-property">
              <h2 className="text-2xl font-semibold text-foreground mb-3">11. Intellectual Property</h2>
              <p className="text-foreground leading-relaxed mb-3">
                The Service, including all content, features, functionality, software, code, designs, graphics, logos, and trademarks, is owned 
                by TrueSpend or our licensors and is protected by United States and international copyright, trademark, patent, trade secret, 
                and other intellectual property laws.
              </p>
              <p className="text-foreground leading-relaxed mb-3">
                You are granted a limited, non-exclusive, non-transferable, revocable license to access and use the Service for your personal, 
                non-commercial purposes in accordance with these Terms. You may not:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Copy, modify, distribute, sell, or lease any part of the Service</li>
                <li>Reverse-engineer or attempt to extract source code from the Service</li>
                <li>Remove, alter, or obscure any proprietary notices (copyright, trademark, etc.) on the Service</li>
                <li>Use the Service to create a competing product or service</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                All rights not expressly granted to you are reserved by TrueSpend.
              </p>
            </section>

            <Separator />

            <section id="termination">
              <h2 className="text-2xl font-semibold text-foreground mb-3">12. Termination & Suspension of Accounts</h2>
              <p className="text-foreground leading-relaxed mb-3">
                We reserve the right to suspend or terminate your account and your access to the Service, with or without notice, for any reason, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Violation of these Terms or any applicable laws or regulations</li>
                <li>Fraudulent, abusive, or harmful behavior</li>
                <li>Failure to pay subscription fees</li>
                <li>Inactivity for an extended period of time</li>
                <li>At our sole discretion if we believe termination is necessary to protect the Service, other users, or TrueSpend</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                You may terminate your account at any time by following the account closure process in your account settings. 
                Upon termination, your access to the Service will end, and we may delete your account data in accordance with our Privacy Policy 
                and applicable law.
              </p>
              <p className="text-foreground leading-relaxed mt-3">
                Termination does not relieve you of any obligations incurred prior to termination, including payment obligations. 
                All provisions of these Terms that by their nature should survive termination shall survive, including intellectual property provisions, 
                warranty disclaimers, indemnity, and limitations of liability.
              </p>
            </section>

            <Separator />

            <section id="disclaimers">
              <h2 className="text-2xl font-semibold text-foreground mb-3">13. Disclaimer of Warranties</h2>
              <p className="text-foreground leading-relaxed mb-3 font-semibold uppercase">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO 
                WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, ACCURACY, COMPLETENESS, OR RELIABILITY.
              </p>
              <p className="text-foreground leading-relaxed mb-3">
                TrueSpend does not warrant that:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>The Service will be uninterrupted, secure, or error-free</li>
                <li>The results obtained from using the Service will be accurate or reliable</li>
                <li>Any errors or defects in the Service will be corrected</li>
                <li>The Service will meet your specific requirements or expectations</li>
                <li>Recommendations or insights will result in financial savings or rewards optimization</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                You acknowledge that your use of the Service is at your sole risk. No oral or written information or advice given by TrueSpend or 
                its representatives shall create a warranty.
              </p>
            </section>

            <Separator />

            <section id="limitation-of-liability">
              <h2 className="text-2xl font-semibold text-foreground mb-3">14. Limitation of Liability</h2>
              <p className="text-foreground leading-relaxed mb-3 font-semibold uppercase">
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, TRUESPEND AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AFFILIATES, AND LICENSORS 
                SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, 
                USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATED TO YOUR USE OF OR INABILITY TO USE THE SERVICE.
              </p>
              <p className="text-foreground leading-relaxed mb-3">
                This limitation applies regardless of the legal theory (contract, tort, negligence, strict liability, or otherwise) and whether or not 
                TrueSpend has been advised of the possibility of such damages.
              </p>
              <p className="text-foreground leading-relaxed mb-3">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, TRUESPEND'S TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR 
                THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) $100 USD OR (B) THE AMOUNT YOU PAID TO TRUESPEND IN SUBSCRIPTION FEES DURING THE 
                SIX MONTHS PRECEDING THE EVENT GIVING RISE TO LIABILITY.
              </p>
              <p className="text-foreground leading-relaxed">
                Some jurisdictions do not allow the exclusion or limitation of certain warranties or the limitation of liability for certain types of damages. 
                Therefore, some of the above limitations may not apply to you. In such cases, our liability will be limited to the fullest extent permitted by law.
              </p>
            </section>

            <Separator />

            <section id="indemnification">
              <h2 className="text-2xl font-semibold text-foreground mb-3">15. Indemnification</h2>
              <p className="text-foreground leading-relaxed mb-3">
                You agree to indemnify, defend, and hold harmless TrueSpend and its officers, directors, employees, agents, affiliates, licensors, 
                and service providers from and against any and all claims, liabilities, damages, losses, costs, expenses, or fees (including reasonable 
                attorneys' fees) arising out of or related to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Your use or misuse of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any rights of another person or entity</li>
                <li>Your violation of any applicable laws or regulations</li>
                <li>Any content or data you submit to the Service</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                This indemnification obligation will survive the termination of your account and these Terms.
              </p>
            </section>

            <Separator />

            <section id="governing-law">
              <h2 className="text-2xl font-semibold text-foreground mb-3">16. Governing Law & Dispute Resolution</h2>
              <p className="text-foreground leading-relaxed mb-3">
                These Terms and any dispute or claim arising out of or related to these Terms or the Service shall be governed by and construed in 
                accordance with the laws of the State of Colorado, United States, without regard to its conflict of law provisions.
              </p>
              <p className="text-foreground leading-relaxed mb-3">
                Any legal action or proceeding arising out of or related to these Terms or the Service shall be brought exclusively in the federal or 
                state courts located in Denver, Colorado. You consent to the personal jurisdiction of such courts and waive any objection to venue in such courts.
              </p>
              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">16.1 Informal Dispute Resolution</h3>
              <p className="text-foreground leading-relaxed mb-3">
                Before filing a formal legal claim, you agree to first contact us at support@truespend.org to attempt to resolve the dispute informally. 
                We will work with you in good faith to resolve any issues.
              </p>
              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">16.2 Class Action Waiver</h3>
              <p className="text-foreground leading-relaxed">
                To the extent permitted by law, you agree that any dispute resolution proceedings will be conducted only on an individual basis and not 
                in a class, consolidated, or representative action. You waive any right to participate in a class action lawsuit or class-wide arbitration.
              </p>
            </section>

            <Separator />

            <section id="changes-to-terms">
              <h2 className="text-2xl font-semibold text-foreground mb-3">17. Changes to These Terms</h2>
              <p className="text-foreground leading-relaxed mb-3">
                We reserve the right to modify or replace these Terms at any time at our sole discretion. If we make material changes, we will notify you by:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Posting the updated Terms on this page with a new "Last Updated" date</li>
                <li>Sending you an email notification to the email address associated with your account</li>
                <li>Displaying a prominent notice within the Service</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                Your continued use of the Service after the effective date of the modified Terms constitutes your acceptance of the changes. 
                If you do not agree to the modified Terms, you must stop using the Service and may close your account.
              </p>
              <p className="text-foreground leading-relaxed mt-3">
                It is your responsibility to review these Terms periodically for updates.
              </p>
            </section>

            <Separator />

            <section id="contact">
              <h2 className="text-2xl font-semibold text-foreground mb-3">18. Contact Information</h2>
              <p className="text-foreground leading-relaxed">
                If you have any questions, concerns, or comments about these Terms of Service, please contact us at:
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