import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Separator } from "@/shared/components/ui/separator";
import { AlertCircle, Shield } from "lucide-react";

export default function AffiliateTransparency() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-primary">Affiliate & Compensation Transparency</CardTitle>
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

            <Alert className="bg-primary/10 border-primary">
              <Shield className="h-5 w-5 text-primary" />
              <AlertDescription className="text-foreground font-medium">
                TrueSpend's Core Principle: We NEVER recommend products based on the commissions or affiliate revenue we might receive. 
                All recommendations are based solely on your spending behavior and reward optimization.
              </AlertDescription>
            </Alert>

            <section id="our-commitment">
              <h2 className="text-2xl font-semibold text-foreground mb-3">1. Our Commitment to You</h2>
              <p className="text-foreground leading-relaxed mb-3 font-semibold">
                TrueSpend is committed to putting your financial interests first. We believe in transparency, integrity, and trust. 
                This Affiliate & Compensation Transparency policy explains our approach to affiliate relationships and ensures you understand 
                how we generate revenue without compromising the quality or objectivity of our recommendations.
              </p>
              <p className="text-foreground leading-relaxed mb-3">
                Unlike many financial comparison websites and credit card recommendation platforms, TrueSpend operates under a strict ethical 
                framework:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>We do NOT prioritize, rank, or highlight products based on the commissions or affiliate revenue we might receive</li>
                <li>All credit card recommendations are based on YOUR spending patterns, card terms, and reward optimization algorithms</li>
                <li>We do NOT accept payment from financial institutions to boost the ranking or visibility of their products</li>
                <li>Our algorithms are designed to maximize YOUR rewards earnings, not our affiliate revenue</li>
              </ul>
            </section>

            <Separator />

            <section id="how-recommendations-work">
              <h2 className="text-2xl font-semibold text-foreground mb-3">2. How TrueSpend Recommendations Work</h2>
              <p className="text-foreground leading-relaxed mb-3">
                TrueSpend uses advanced algorithms and machine learning models to analyze your spending behavior and match it with publicly 
                available credit card rewards program data. Here's how the recommendation process works:
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">2.1 Data-Driven Analysis</h3>
              <p className="text-foreground leading-relaxed mb-3">
                Our algorithms analyze:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Your transaction history and spending patterns across merchants and categories</li>
                <li>The rewards rates, cashback percentages, and bonus categories of credit cards you currently hold</li>
                <li>Publicly available information about credit card terms, rewards programs, and benefits</li>
                <li>Merchant Category Codes (MCCs) and their alignment with specific card bonus categories</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">2.2 Optimization Algorithms</h3>
              <p className="text-foreground leading-relaxed mb-3">
                Based on this analysis, TrueSpend's algorithms calculate:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Which of your existing cards will earn the most rewards for a specific merchant or category</li>
                <li>Opportunities to switch to a different card you own for better rewards alignment</li>
                <li>Whether new credit cards on the market might better fit your spending profile</li>
                <li>Estimated rewards earnings if you follow the recommendations</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3 font-semibold">
                At no point in this process do affiliate commissions, referral bonuses, or financial compensation influence which card is recommended first, 
                ranked higher, or presented more prominently.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">2.3 User-Centric Approach</h3>
              <p className="text-foreground leading-relaxed">
                Our recommendation engine is designed to answer a single question: "What is the best card for THIS user to use for THIS purchase?" 
                The answer is determined entirely by:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Your individual spending behavior</li>
                <li>The rewards structure of available cards</li>
                <li>The merchant or category of the purchase</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                Not by how much money TrueSpend could earn from a referral.
              </p>
            </section>

            <Separator />

            <section id="affiliate-relationships">
              <h2 className="text-2xl font-semibold text-foreground mb-3">3. Affiliate Relationships & Revenue Disclosure</h2>
              <p className="text-foreground leading-relaxed mb-3">
                TrueSpend may participate in affiliate programs with financial institutions, credit card issuers, and financial service providers. 
                This means we may receive compensation in the following ways:
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">3.1 Referral Commissions</h3>
              <p className="text-foreground leading-relaxed mb-3">
                If you apply for a credit card through a link or referral provided by TrueSpend and are approved, we may receive a commission 
                from the card issuer. This is a standard practice in the financial technology industry and helps support the ongoing development 
                and operation of the Service.
              </p>
              <p className="text-foreground leading-relaxed mt-3 font-semibold">
                However: The existence of a referral commission does NOT influence whether or not we recommend that card to you. 
                If the card is not a good fit for your spending behavior, we will not suggest it, regardless of the potential commission.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">3.2 Affiliate Links</h3>
              <p className="text-foreground leading-relaxed mb-3">
                When TrueSpend suggests a new credit card that you may want to consider, we may provide an affiliate link to the card issuer's 
                application page. This link allows us to track referrals and receive compensation if you are approved.
              </p>
              <p className="text-foreground leading-relaxed mt-3">
                Important: Using an affiliate link does not cost you anything extra, affect your approval odds, or change the terms of the card. 
                The affiliate relationship is between TrueSpend and the card issuer, not between you and TrueSpend.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">3.3 No Pay-to-Play Model</h3>
              <p className="text-foreground leading-relaxed">
                TrueSpend does NOT operate a "pay-to-play" model. We do not:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Accept payment from card issuers to prioritize their products in recommendations</li>
                <li>Charge card issuers for placement, ranking, or visibility within the Service</li>
                <li>Enter into exclusive agreements that restrict which cards we can recommend</li>
                <li>Allow card issuers to influence our recommendation algorithms</li>
              </ul>
            </section>

            <Separator />

            <section id="no-influence-on-ranking">
              <h2 className="text-2xl font-semibold text-foreground mb-3">4. Affiliate Revenue Does NOT Influence Ranking</h2>
              <p className="text-foreground leading-relaxed mb-3 font-semibold">
                This is the most important point: TrueSpend's recommendation algorithms do not take affiliate revenue into account when 
                determining which card to suggest or how to rank multiple card options.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">4.1 Algorithm Integrity</h3>
              <p className="text-foreground leading-relaxed mb-3">
                Our recommendation algorithms are programmed to optimize for YOUR rewards earnings, not for TrueSpend's affiliate revenue. 
                The algorithm does not have access to data about:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Which cards have affiliate programs with TrueSpend</li>
                <li>How much commission TrueSpend would earn from each card referral</li>
                <li>Whether a card issuer has a partnership or business relationship with TrueSpend</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                In other words, the recommendation engine operates independently from the business development and affiliate relationships team.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">4.2 Examples of How This Works</h3>
              <p className="text-foreground leading-relaxed mb-3">
                <strong>Example 1:</strong> You spend $500/month on groceries. TrueSpend's algorithm identifies that Card A offers 4% cashback 
                on groceries, while Card B offers 2% cashback. Even if Card B's affiliate commission is higher, TrueSpend will recommend Card A 
                because it maximizes YOUR rewards.
              </p>
              <p className="text-foreground leading-relaxed mt-3">
                <strong>Example 2:</strong> You're considering two new cards. Card X has no affiliate relationship with TrueSpend, while Card Y 
                pays a $100 referral commission. If Card X is a better match for your spending profile, TrueSpend will recommend Card X, even though 
                we would earn $0 from that recommendation.
              </p>
            </section>

            <Separator />

            <section id="disclosure-requirements">
              <h2 className="text-2xl font-semibold text-foreground mb-3">5. Disclosure Requirements & Transparency</h2>
              <p className="text-foreground leading-relaxed mb-3">
                TrueSpend is committed to full transparency regarding affiliate relationships:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>When we provide a link to a credit card application or financial product, and that link is an affiliate link, 
                  we will clearly disclose this relationship where required by law or best practices.
                </li>
                <li>We comply with Federal Trade Commission (FTC) guidelines on affiliate marketing and endorsement disclosures.</li>
                <li>If you have questions about whether a specific card recommendation involves an affiliate relationship, 
                  you can contact us at support@truespend.org for clarification.
                </li>
              </ul>
            </section>

            <Separator />

            <section id="revenue-model">
              <h2 className="text-2xl font-semibold text-foreground mb-3">6. How TrueSpend Generates Revenue</h2>
              <p className="text-foreground leading-relaxed mb-3">
                TrueSpend generates revenue through multiple channels to ensure the Service remains financially sustainable:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li><strong>Subscription Fees:</strong> Users pay for access to premium features (e.g., Plus, Elite plans). 
                  This is our primary revenue source and ensures we remain aligned with user interests, not advertiser interests.
                </li>
                <li><strong>Affiliate Commissions:</strong> When users apply for credit cards through TrueSpend and are approved, 
                  we may receive referral commissions from card issuers. However, as stated above, these commissions do not influence recommendations.
                </li>
                <li><strong>Data Insights (Aggregated & Anonymized):</strong> We may sell aggregated, anonymized trend reports to financial 
                  institutions (e.g., "25% of users in this demographic prefer cashback over points"). Individual user data is never sold or shared.
                </li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                By relying primarily on subscription revenue, TrueSpend minimizes the potential conflict of interest inherent in 
                affiliate-only business models.
              </p>
            </section>

            <Separator />

            <section id="user-trust">
              <h2 className="text-2xl font-semibold text-foreground mb-3">7. Why This Matters: Building Trust</h2>
              <p className="text-foreground leading-relaxed mb-3">
                Many financial comparison websites and credit card recommendation platforms prioritize cards that pay the highest affiliate commissions, 
                even if those cards are not the best fit for the user. This creates a fundamental conflict of interest and erodes trust.
              </p>
              <p className="text-foreground leading-relaxed mb-3">
                TrueSpend takes a different approach:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Your trust is more valuable to us than short-term affiliate revenue</li>
                <li>We succeed when you succeed in maximizing your rewards and optimizing your spending</li>
                <li>Our business model (subscription-based) aligns our interests with yours</li>
                <li>We are transparent about affiliate relationships and how we generate revenue</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3 font-semibold">
                If we ever lose your trust by compromising our recommendation integrity for affiliate revenue, we lose the foundation of our business. 
                That's why we're committed to never letting affiliate relationships influence our recommendations.
              </p>
            </section>

            <Separator />

            <section id="contact">
              <h2 className="text-2xl font-semibold text-foreground mb-3">8. Contact Information</h2>
              <p className="text-foreground leading-relaxed">
                If you have any questions, concerns, or feedback about TrueSpend's affiliate relationships or this transparency policy, 
                please contact us at:
              </p>
              <p className="text-foreground leading-relaxed mt-3 font-medium">
                Email: <a href="mailto:support@truespend.org" className="text-primary hover:underline">support@truespend.org</a>
              </p>
              <p className="text-foreground leading-relaxed mt-3">
                We welcome your questions and are happy to provide additional details about how our recommendation algorithms work 
                and how we maintain our commitment to transparency.
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