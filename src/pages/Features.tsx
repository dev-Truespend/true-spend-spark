import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, Smartphone, Laptop, Tablet, Globe, Brain, 
  TrendingUp, Sparkles, Lock, Database, Eye, Shield, Chrome,
  ShoppingCart, Zap, RefreshCw, Camera, ScanLine, Bot,
  CloudOff, MapPin, Bell
} from "lucide-react";
import ecosystemProfessional from "@/assets/ecosystem-professional.png";
import browserShoppingTracker from "@/assets/browser-shopping-tracker.png";
import browserMerchantDetect from "@/assets/browser-merchant-detect.png";
import browserAutoSync from "@/assets/browser-auto-sync.png";
import webReceiptScanner from "@/assets/web-receipt-scanner.png";
import webOfflineMode from "@/assets/web-offline-mode.png";
import webAiBudget from "@/assets/web-ai-budget.png";
import mobileGeofencing from "@/assets/mobile-geofencing.png";
import mobilePushNotify from "@/assets/mobile-push-notify.png";
import mobileCameraScan from "@/assets/mobile-camera-scan.png";

export default function Features() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/10">
      
      {/* Hero Section with Multi-Device Image */}
      <section className="pt-32 pb-16 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Works <span className="bg-gradient-to-r from-brand-blue via-brand-purple to-brand-teal bg-clip-text text-transparent">Everywhere</span> You Need It
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              One account. All your devices. Seamlessly synced in real-time with bank-level security. Available on mobile, desktop, tablet, and web.
            </p>
          </div>
          
          {/* Ecosystem Diagram */}
          <div className="relative group max-w-5xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/10 via-brand-purple/10 to-brand-teal/10 blur-3xl rounded-full animate-pulse-slow"></div>
            <img 
              src={ecosystemProfessional} 
              alt="TrueSpend comprehensive ecosystem across all platforms" 
              className="relative w-full h-auto drop-shadow-2xl transform group-hover:scale-[1.02] transition-transform duration-700"
            />
          </div>
        </div>
      </section>


      {/* Platform-Specific Features */}
      <section className="py-24 px-6 bg-gradient-to-br from-brand-blue/5 via-background to-brand-purple/5">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            
            <h2 className="text-4xl font-bold mb-4">Powerful Features on Every Platform</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Experience the full power of TrueSpend on your favorite device with platform-optimized features
            </p>
          </div>

          <div className="space-y-32">
            {/* Browser Extension Features */}
            <div className="space-y-12">
              <div className="text-center">
                <Badge variant="outline" className="mb-4 border-brand-blue text-brand-blue">
                  <Chrome className="w-4 h-4 mr-2" />
                  Browser Extension
                </Badge>
                <h3 className="text-3xl font-bold mb-4">Track While You Shop</h3>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Real-time budget tracking and merchant detection directly in your browser as you shop online
                </p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-8">
                <div className="group">
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 p-6 h-full hover:shadow-premium transition-all duration-300 hover:scale-105 card-3d">
                    <img src={browserShoppingTracker} alt="Shopping Budget Tracker" className="w-full h-48 object-cover rounded-lg mb-6" />
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center">
                        <ShoppingCart className="w-5 h-5 text-brand-blue" />
                      </div>
                      <h4 className="font-bold text-lg">Real-Time Budget Alerts</h4>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Get instant notifications when you're approaching budget limits while browsing Amazon, eBay, or any shopping site
                    </p>
                    <Badge variant="secondary" className="mt-4">Available Now</Badge>
                  </div>
                </div>

                <div className="group">
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 p-6 h-full hover:shadow-premium transition-all duration-300 hover:scale-105 card-3d">
                    <img src={browserMerchantDetect} alt="Smart Merchant Detection" className="w-full h-48 object-cover rounded-lg mb-6" />
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-brand-purple" />
                      </div>
                      <h4 className="font-bold text-lg">Smart Merchant Detection</h4>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Automatically identifies merchants and categorizes purchases as you shop, saving you time on manual entry
                    </p>
                    <Badge variant="secondary" className="mt-4">Available Now</Badge>
                  </div>
                </div>

                <div className="group">
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 p-6 h-full hover:shadow-premium transition-all duration-300 hover:scale-105 card-3d">
                    <img src={browserAutoSync} alt="Auto Sync" className="w-full h-48 object-cover rounded-lg mb-6" />
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-teal/10 flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 text-brand-teal" />
                      </div>
                      <h4 className="font-bold text-lg">Instant Cloud Sync</h4>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      All purchases automatically sync to your mobile and desktop apps in real-time for unified tracking
                    </p>
                    <Badge variant="secondary" className="mt-4">Available Now</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Web App Features */}
            <div className="space-y-12">
              <div className="text-center">
                <Badge variant="outline" className="mb-4 border-brand-purple text-brand-purple">
                  <Globe className="w-4 h-4 mr-2" />
                  Web Application
                </Badge>
                <h3 className="text-3xl font-bold mb-4">Advanced Analytics & AI</h3>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Access powerful insights and AI-powered features from any browser, anywhere in the world
                </p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-8">
                <div className="group">
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 p-6 h-full hover:shadow-premium transition-all duration-300 hover:scale-105 card-3d">
                    <img src={webReceiptScanner} alt="Receipt Scanner" className="w-full h-48 object-cover rounded-lg mb-6" />
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center">
                        <ScanLine className="w-5 h-5 text-brand-blue" />
                      </div>
                      <h4 className="font-bold text-lg">Smart Receipt Scanning</h4>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Upload receipts and let AI extract all details - merchant, items, prices, and categories instantly
                    </p>
                    <Badge variant="secondary" className="mt-4">Available Now</Badge>
                  </div>
                </div>

                <div className="group">
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 p-6 h-full hover:shadow-premium transition-all duration-300 hover:scale-105 card-3d">
                    <img src={webOfflineMode} alt="Real-Time Sync" className="w-full h-48 object-cover rounded-lg mb-6 transform group-hover:rotate-1 transition-transform" />
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 text-brand-purple" />
                      </div>
                      <h4 className="font-bold text-lg">Real-Time Sync</h4>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      All your data syncs instantly across devices with bank-level security and encryption
                    </p>
                    <Badge variant="secondary" className="mt-4">Available Now</Badge>
                  </div>
                </div>

                <div className="group">
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 p-6 h-full hover:shadow-premium transition-all duration-300 hover:scale-105 card-3d">
                    <img src={webAiBudget} alt="AI Budget Optimization" className="w-full h-48 object-cover rounded-lg mb-6" />
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-teal/10 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-brand-teal" />
                      </div>
                      <h4 className="font-bold text-lg">AI Budget Optimization</h4>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Machine learning analyzes your spending patterns and suggests optimal budget allocations for maximum savings
                    </p>
                    <Badge variant="secondary" className="mt-4">Available Now</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile App Features */}
            <div className="space-y-12">
              <div className="text-center">
                <Badge variant="outline" className="mb-4 border-brand-teal text-brand-teal">
                  <Smartphone className="w-4 h-4 mr-2" />
                  Mobile Apps (iOS & Android)
                </Badge>
                <h3 className="text-3xl font-bold mb-4">Track On-The-Go</h3>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Native mobile apps with location tracking, push notifications, and camera scanning
                </p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-8">
                <div className="group">
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 p-6 h-full hover:shadow-premium transition-all duration-300 hover:scale-105 card-3d">
                    <img src={mobileGeofencing} alt="Geofencing Alerts" className="w-full h-48 object-cover rounded-lg mb-6" />
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-brand-blue" />
                      </div>
                      <h4 className="font-bold text-lg">Geofencing Alerts</h4>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Set location-based budgets and get notified when entering areas where you tend to overspend
                    </p>
                    <Badge variant="secondary" className="mt-4">Available Now</Badge>
                  </div>
                </div>

                <div className="group">
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 p-6 h-full hover:shadow-premium transition-all duration-300 hover:scale-105 card-3d">
                    <img src={mobilePushNotify} alt="Push Notifications" className="w-full h-48 object-cover rounded-lg mb-6" />
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-brand-purple" />
                      </div>
                      <h4 className="font-bold text-lg">Smart Push Notifications</h4>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Receive intelligent alerts for budget limits, unusual spending, and personalized savings opportunities
                    </p>
                    <Badge variant="secondary" className="mt-4">Available Now</Badge>
                  </div>
                </div>

                <div className="group">
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 p-6 h-full hover:shadow-premium transition-all duration-300 hover:scale-105 card-3d">
                    <img src={mobileCameraScan} alt="Camera Scanning" className="w-full h-48 object-cover rounded-lg mb-6" />
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-teal/10 flex items-center justify-center">
                        <Camera className="w-5 h-5 text-brand-teal" />
                      </div>
                      <h4 className="font-bold text-lg">Instant Camera Capture</h4>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Snap photos of receipts with your phone camera for instant OCR processing and automatic transaction logging
                    </p>
                    <Badge variant="secondary" className="mt-4">Available Now</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


    </div>
  );
}
