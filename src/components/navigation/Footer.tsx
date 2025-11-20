import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">TrueSpend</h3>
            <p className="text-sm text-muted-foreground">
              Optimize your credit card rewards and maximize your spending efficiency with intelligent insights.
            </p>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/legal/terms" className="text-muted-foreground hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/legal/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/legal/data-processing" className="text-muted-foreground hover:text-primary transition-colors">
                  Data Processing Policy
                </Link>
              </li>
              <li>
                <Link to="/legal/ai-recommendations" className="text-muted-foreground hover:text-primary transition-colors">
                  AI Recommendations Policy
                </Link>
              </li>
              <li>
                <Link to="/legal/affiliate-transparency" className="text-muted-foreground hover:text-primary transition-colors">
                  Affiliate Transparency
                </Link>
              </li>
              <li>
                <Link to="/legal/consent" className="text-muted-foreground hover:text-primary transition-colors">
                  Consent Agreement
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Contact</h3>
            <p className="text-sm text-muted-foreground">
              Email:{" "}
              <a href="mailto:support@truespend.org" className="text-primary hover:underline">
                support@truespend.org
              </a>
            </p>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="text-center text-sm text-muted-foreground">
          © {currentYear} TrueSpend. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
