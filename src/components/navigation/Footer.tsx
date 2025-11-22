import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Twitter, 
  Linkedin, 
  Github, 
  MessageSquare, 
  Globe, 
  Shield, 
  Lock, 
  Database,
  ArrowUp
} from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Security & Privacy", href: "/legal/privacy" },
      { label: "How It Works", href: "/" },
    ],
    company: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Contact Support", href: "mailto:support@truespend.org" },
      { label: "Brand Assets", href: "/brand" },
    ],
    legal: [
      { label: "Terms of Service", href: "/legal/terms" },
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Data Processing", href: "/legal/data-processing" },
      { label: "AI Recommendations", href: "/legal/ai-recommendations" },
      { label: "Affiliate Transparency", href: "/legal/affiliate-transparency" },
      { label: "Consent Agreement", href: "/legal/consent" },
    ],
  };

  const socialLinks = [
    { icon: Twitter, href: "https://twitter.com/truespend", label: "Twitter" },
    { icon: Linkedin, href: "https://linkedin.com/company/truespend", label: "LinkedIn" },
    { icon: Github, href: "https://github.com/truespend", label: "GitHub" },
    { icon: MessageSquare, href: "https://discord.gg/truespend", label: "Discord" },
  ];

  const trustBadges = [
    { icon: Lock, text: "256-bit Encryption" },
    { icon: Shield, text: "GDPR Compliant" },
    { icon: Database, text: "SOC 2 Type II" },
    { icon: Shield, text: "Privacy First" },
  ];

  return (
    <footer className="border-t border-border bg-background mt-auto">
      <div className="container mx-auto px-4 py-16">
        
        {/* Newsletter Section */}
        <div className="bg-gradient-to-r from-brand-blue/10 via-brand-purple/10 to-brand-teal/10 rounded-2xl p-8 mb-16">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h3 className="text-2xl font-bold">Stay Updated</h3>
            <p className="text-muted-foreground">
              Get the latest features and tips delivered to your inbox
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input 
                type="email" 
                placeholder="Enter your email" 
                className="bg-background border-border focus:border-primary"
              />
              <Button className="bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90 text-white font-semibold px-6 whitespace-nowrap">
                Subscribe
              </Button>
            </div>
          </div>
        </div>

        {/* Main Footer Content - 4 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          
          {/* Column 1 - Brand */}
          <div className="lg:col-span-1">
            <h3 className="font-bold text-lg mb-4">TrueSpend</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Smart spending, smarter rewards. Your financial data, your control.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social, idx) => (
                <a
                  key={idx}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="w-10 h-10 rounded-full bg-muted hover:bg-brand-blue/10 flex items-center justify-center transition-all duration-300 hover:scale-110"
                >
                  <social.icon className="w-4 h-4 text-muted-foreground hover:text-brand-blue transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Column 2 - Product */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Product</h4>
            <ul className="space-y-3 text-sm">
              {footerLinks.product.map((link, idx) => (
                <li key={idx}>
                  <Link 
                    to={link.href} 
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 - Company */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-3 text-sm">
              {footerLinks.company.map((link, idx) => (
                <li key={idx}>
                  <Link 
                    to={link.href} 
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 - Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-3 text-sm">
              {footerLinks.legal.map((link, idx) => (
                <li key={idx}>
                  <Link 
                    to={link.href} 
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8 border-y border-border">
          {trustBadges.map((badge, idx) => (
            <div key={idx} className="flex items-center gap-3 justify-center">
              <badge.icon className="w-5 h-5 text-brand-blue" />
              <span className="text-sm text-muted-foreground">{badge.text}</span>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8">
          <div className="text-sm text-muted-foreground">
            © {currentYear} TrueSpend. All rights reserved.
          </div>
          
          <div className="flex items-center gap-6">
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
              <Globe className="w-4 h-4" />
              <span>English (US)</span>
            </button>
            
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <span>Back to top</span>
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
