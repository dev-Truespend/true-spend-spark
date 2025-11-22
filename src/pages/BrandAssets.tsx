import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Palette, Type, Image as ImageIcon } from "lucide-react";

export default function BrandAssets() {
  const colors = [
    { name: "Brand Blue", value: "#3B82F6", variable: "brand-blue" },
    { name: "Brand Purple", value: "#8B5CF6", variable: "brand-purple" },
    { name: "Brand Teal", value: "#14B8A6", variable: "brand-teal" },
  ];

  const guidelines = [
    {
      title: "Logo Usage",
      rules: [
        "Always maintain clear space around the logo",
        "Never distort, rotate, or modify the logo",
        "Use approved color variations only",
        "Minimum size: 120px wide for digital, 1 inch for print",
      ],
    },
    {
      title: "Color Usage",
      rules: [
        "Use brand colors consistently across all materials",
        "Maintain proper contrast ratios for accessibility",
        "Primary brand color is Brand Blue",
        "Purple and Teal are accent colors",
      ],
    },
    {
      title: "Typography",
      rules: [
        "Primary font: Inter",
        "Use font weights 400 (Regular), 600 (Semibold), and 700 (Bold)",
        "Maintain consistent hierarchy in headings",
        "Ensure readable line heights (1.5x minimum)",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/10">
      <section className="pt-32 pb-24 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-6">Brand Assets</Badge>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-6">
              TrueSpend <span className="bg-gradient-to-r from-brand-blue via-brand-purple to-brand-teal bg-clip-text text-transparent">Brand Guidelines</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Download our logos, learn about our brand identity, and discover how to properly represent TrueSpend.
            </p>
          </div>

          <div className="space-y-12">
            {/* Logo Downloads */}
            <div>
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <ImageIcon className="w-8 h-8 text-brand-blue" />
                Logo Downloads
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-2 hover:border-brand-blue/50 transition-all duration-300 hover:shadow-premium">
                  <CardContent className="pt-8">
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-8 mb-4 border-2 border-dashed">
                      <div className="text-center">
                        <h3 className="text-2xl font-bold text-brand-blue">TrueSpend</h3>
                        <p className="text-sm text-muted-foreground mt-2">Full Color Logo</p>
                      </div>
                    </div>
                    <Button className="w-full bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90 text-white">
                      <Download className="w-4 h-4 mr-2" />
                      Download PNG
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 hover:border-brand-blue/50 transition-all duration-300 hover:shadow-premium">
                  <CardContent className="pt-8">
                    <div className="bg-black rounded-lg p-8 mb-4 border-2 border-dashed">
                      <div className="text-center">
                        <h3 className="text-2xl font-bold text-white">TrueSpend</h3>
                        <p className="text-sm text-gray-400 mt-2">White Logo</p>
                      </div>
                    </div>
                    <Button className="w-full" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download PNG
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Brand Colors */}
            <div>
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Palette className="w-8 h-8 text-brand-purple" />
                Brand Colors
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {colors.map((color, idx) => (
                  <Card key={idx} className="border-2">
                    <CardContent className="pt-8">
                      <div 
                        className="w-full h-32 rounded-lg mb-4" 
                        style={{ backgroundColor: color.value }}
                      ></div>
                      <h3 className="text-xl font-bold mb-2">{color.name}</h3>
                      <p className="text-sm text-muted-foreground font-mono mb-1">{color.value}</p>
                      <p className="text-xs text-muted-foreground">CSS: var(--{color.variable})</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Typography */}
            <Card className="border-2">
              <CardContent className="pt-8">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <Type className="w-8 h-8 text-brand-teal" />
                  Typography
                </h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Primary Font Family</p>
                    <p className="text-4xl font-bold">Inter</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Regular</p>
                      <p className="text-2xl font-normal">Aa</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Semibold</p>
                      <p className="text-2xl font-semibold">Aa</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Bold</p>
                      <p className="text-2xl font-bold">Aa</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Brand Guidelines */}
            <div>
              <h2 className="text-3xl font-bold mb-6">Brand Guidelines</h2>
              <div className="space-y-6">
                {guidelines.map((section, idx) => (
                  <Card key={idx} className="border-2">
                    <CardContent className="pt-8">
                      <h3 className="text-2xl font-bold mb-4">{section.title}</h3>
                      <ul className="space-y-3">
                        {section.rules.map((rule, ruleIdx) => (
                          <li key={ruleIdx} className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-brand-blue mt-2"></div>
                            <span className="text-muted-foreground leading-relaxed">{rule}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="border-2 bg-gradient-to-br from-brand-blue/5 via-background to-brand-purple/5">
              <CardContent className="pt-8 text-center">
                <h3 className="text-2xl font-bold mb-4">Need More Assets?</h3>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto leading-relaxed">
                  For additional brand assets, media kit, or press inquiries, please contact our team.
                </p>
                <Button variant="outline" size="lg">
                  Contact Brand Team
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
