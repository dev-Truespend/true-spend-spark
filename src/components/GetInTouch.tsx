import { Mail, MessageCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function GetInTouch() {
  return (
    <section className="py-24 px-6 bg-gradient-to-br from-muted/30 via-background to-muted/20">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Get in Touch
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Have questions? We're here to help you maximize your credit card rewards.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Email Support */}
          <Card className="border-2 hover:shadow-premium transition-all duration-300 hover:scale-105 hover:border-brand-blue/50">
            <CardContent className="pt-8 text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-950/50 dark:to-blue-900/30 flex items-center justify-center">
                  <Mail className="w-10 h-10 text-brand-blue" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Email Support</h3>
                <p className="text-muted-foreground mb-4">Get help via email</p>
                <a 
                  href="mailto:support@truespend.com"
                  className="text-lg font-semibold text-foreground hover:text-brand-blue transition-colors"
                >
                  support@truespend.com
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Live Chat */}
          <Card className="border-2 hover:shadow-premium transition-all duration-300 hover:scale-105 hover:border-brand-purple/50">
            <CardContent className="pt-8 text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-950/50 dark:to-purple-900/30 flex items-center justify-center">
                  <MessageCircle className="w-10 h-10 text-brand-purple" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Live Chat</h3>
                <p className="text-muted-foreground mb-6">Chat with our team</p>
                <Button 
                  size="lg"
                  className="bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold"
                >
                  Start Chat
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Response Time */}
          <Card className="border-2 hover:shadow-premium transition-all duration-300 hover:scale-105 hover:border-brand-teal/50">
            <CardContent className="pt-8 text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-100 to-teal-50 dark:from-teal-950/50 dark:to-teal-900/30 flex items-center justify-center">
                  <Clock className="w-10 h-10 text-brand-teal" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Response Time</h3>
                <p className="text-muted-foreground mb-2">
                  We typically respond within 24 hours
                </p>
                <p className="text-sm text-muted-foreground">
                  Mon-Fri: 9AM - 6PM EST
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
