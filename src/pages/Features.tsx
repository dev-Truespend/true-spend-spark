import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, Smartphone, Laptop, Tablet, Globe, Brain, 
  TrendingUp, Sparkles, Lock, Database, Eye, Shield, Chrome,
  ShoppingCart, Zap, RefreshCw, Camera, ScanLine, Bot,
  CloudOff, MapPin, Bell
} from "lucide-react";
import multiDevice from "@/assets/multi-device-ecosystem.png";
import aiCards from "@/assets/ai-card-recommendations.png";
import localData from "@/assets/local-first-data.png";
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
            <Badge variant="secondary" className="mb-6 text-base px-6 py-2">
              Platform Features
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Works <span className="bg-gradient-to-r from-brand-blue via-brand-purple to-brand-teal bg-clip-text text-transparent">Everywhere</span> You Need It
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              One account. All your devices. Seamlessly synced in real-time with bank-level security. Available on mobile, desktop, tablet, and web.
            </p>
          </div>
          
          {/* Multi-Device Hero Image */}
          <div className="relative group max-w-4xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/20 via-brand-purple/20 to-brand-teal/20 blur-3xl rounded-full group-hover:blur-2xl transition-all animate-pulse-slow"></div>
            <img 
              src={multiDevice} 
              alt="Multi-device ecosystem" 
              className="relative w-full h-auto drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-500 animate-float-slow"
            />
          </div>
        </div>
      </section>

      {/* Platform Overview */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 hover:from-brand-blue/10 hover:to-brand-purple/10 transition-all duration-300 hover:scale-105 hover:shadow-medium">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-blue/20 to-brand-purple/20 flex items-center justify-center">
                <Smartphone className="w-8 h-8 text-brand-purple" />
              </div>
              <div className="text-center">
                <div className="font-bold text-lg mb-1">iOS & Android</div>
                <div className="text-sm text-muted-foreground">Native mobile apps</div>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 hover:from-brand-purple/10 hover:to-brand-teal/10 transition-all duration-300 hover:scale-105 hover:shadow-medium">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-purple/20 to-brand-teal/20 flex items-center justify-center">
                <Laptop className="w-8 h-8 text-brand-teal" />
              </div>
              <div className="text-center">
                <div className="font-bold text-lg mb-1">Desktop</div>
                <div className="text-sm text-muted-foreground">Windows, Mac, Linux</div>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 hover:from-brand-teal/10 hover:to-brand-blue/10 transition-all duration-300 hover:scale-105 hover:shadow-medium">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-teal/20 to-brand-blue/20 flex items-center justify-center">
                <Tablet className="w-8 h-8 text-brand-blue" />
              </div>
              <div className="text-center">
                <div className="font-bold text-lg mb-1">Tablet</div>
                <div className="text-sm text-muted-foreground">iPad & Android tablets</div>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 hover:from-brand-blue/10 hover:to-brand-purple/10 transition-all duration-300 hover:scale-105 hover:shadow-medium">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-blue/20 to-brand-purple/20 flex items-center justify-center">
                <Globe className="w-8 h-8 text-brand-purple" />
              </div>
              <div className="text-center">
                <div className="font-bold text-lg mb-1">Web</div>
                <div className="text-sm text-muted-foreground">Any modern browser</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform-Specific Features */}
      <section className="py-24 px-6 bg-gradient-to-br from-brand-blue/5 via-background to-brand-purple/5">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 text-base px-6 py-2">Platform Features</Badge>
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

      {/* Feature Showcase with Animated Images */}
      <section className="py-24 px-6 bg-gradient-to-br from-brand-purple/5 via-background to-brand-blue/5">
        <div className="container mx-auto max-w-6xl">
          <div className="space-y-24">
            {/* AI Features Section */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6 order-2 lg:order-1">
                <Badge variant="secondary" className="text-sm px-4 py-1">AI-Powered</Badge>
                <h3 className="text-3xl font-bold">Smart Recommendations That Save You Money</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Our AI analyzes your spending patterns and recommends the best credit cards for maximum rewards on every purchase. Stop leaving money on the table.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                      <Brain className="w-5 h-5 text-brand-blue" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">Personalized Card Matching</div>
                      <div className="text-sm text-muted-foreground">Get recommendations based on your unique spending habits</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-5 h-5 text-brand-purple" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">Maximize Rewards</div>
                      <div className="text-sm text-muted-foreground">Earn 2-5x more cashback and points automatically</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-teal/10 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-brand-teal" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">Real-Time Optimization</div>
                      <div className="text-sm text-muted-foreground">Instantly know which card to use for every transaction</div>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="relative group order-1 lg:order-2">
                <div className="absolute inset-0 bg-gradient-to-r from-brand-purple/20 to-brand-teal/20 blur-3xl rounded-full group-hover:blur-2xl transition-all"></div>
                <img 
                  src={aiCards} 
                  alt="AI card recommendations" 
                  className="relative w-full h-auto drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-500 animate-float-slow"
                  style={{ animationDelay: '1s' }}
                />
              </div>
            </div>

            {/* Privacy Section */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-brand-teal/20 to-brand-blue/20 blur-3xl rounded-full group-hover:blur-2xl transition-all"></div>
                <img 
                  src={localData} 
                  alt="Local-first data flow" 
                  className="relative w-full h-auto drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-500 animate-float-slow"
                  style={{ animationDelay: '2s' }}
                />
              </div>
              <div className="space-y-6">
                <Badge variant="secondary" className="text-sm px-4 py-1">Privacy-First</Badge>
                <h3 className="text-3xl font-bold">Your Data Never Leaves Your Control</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Unlike other apps, we don't sell your data. Everything is encrypted end-to-end and stored locally on your device first. Cloud sync is optional and always private.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                      <Lock className="w-5 h-5 text-brand-blue" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">End-to-End Encryption</div>
                      <div className="text-sm text-muted-foreground">Military-grade encryption for all your data</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center flex-shrink-0">
                      <Eye className="w-5 h-5 text-brand-purple" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">Zero Data Tracking</div>
                      <div className="text-sm text-muted-foreground">We don't track, analyze, or sell your information</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-teal/10 flex items-center justify-center flex-shrink-0">
                      <Database className="w-5 h-5 text-brand-teal" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">Local-First Storage</div>
                      <div className="text-sm text-muted-foreground">Your data lives on your device, backed up optionally</div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
