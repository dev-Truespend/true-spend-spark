import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { MessageSquare, Users, HelpCircle, Sparkles, TrendingUp, Shield } from "lucide-react";

export default function Community() {
  const categories = [
    {
      icon: HelpCircle,
      title: "General Questions",
      posts: 1234,
      description: "Ask anything about TrueSpend features and usage",
    },
    {
      icon: Shield,
      title: "Privacy & Security",
      posts: 567,
      description: "Discussions about data privacy and security",
    },
    {
      icon: Sparkles,
      title: "Feature Requests",
      posts: 890,
      description: "Suggest new features and improvements",
    },
    {
      icon: TrendingUp,
      title: "Tips & Tricks",
      posts: 456,
      description: "Share your best practices and workflows",
    },
  ];

  const popularTopics = [
    {
      title: "How to maximize credit card rewards?",
      replies: 45,
      views: 1200,
    },
    {
      title: "Best practices for budget categories",
      replies: 32,
      views: 890,
    },
    {
      title: "Feature Request: Multi-currency support",
      replies: 67,
      views: 2100,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/10">
      <section className="pt-32 pb-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-6">Community Forum</Badge>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-6">
              Join the <span className="bg-gradient-to-r from-brand-blue via-brand-purple to-brand-teal bg-clip-text text-transparent">Community</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Connect with other TrueSpend users, share tips, ask questions, and help shape the future of the product.
            </p>
          </div>

          <div className="space-y-12">
            {/* Community Stats */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-2">
                <CardContent className="pt-8 text-center">
                  <Users className="w-12 h-12 text-brand-blue mx-auto mb-4" />
                  <div className="text-4xl font-bold mb-2">12,345</div>
                  <p className="text-sm text-muted-foreground">Community Members</p>
                </CardContent>
              </Card>
              <Card className="border-2">
                <CardContent className="pt-8 text-center">
                  <MessageSquare className="w-12 h-12 text-brand-purple mx-auto mb-4" />
                  <div className="text-4xl font-bold mb-2">3,456</div>
                  <p className="text-sm text-muted-foreground">Total Discussions</p>
                </CardContent>
              </Card>
              <Card className="border-2">
                <CardContent className="pt-8 text-center">
                  <Sparkles className="w-12 h-12 text-brand-teal mx-auto mb-4" />
                  <div className="text-4xl font-bold mb-2">890</div>
                  <p className="text-sm text-muted-foreground">Feature Requests</p>
                </CardContent>
              </Card>
            </div>

            {/* Categories */}
            <div>
              <h2 className="text-3xl font-bold mb-8">Browse Categories</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {categories.map((category, idx) => (
                  <Card key={idx} className="border-2 hover:border-brand-blue/50 transition-all duration-300 hover:shadow-premium group cursor-pointer">
                    <CardContent className="pt-8">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          <category.icon className="w-6 h-6 text-brand-blue" />
                        </div>
                        <div className="flex-grow">
                          <h3 className="text-xl font-bold mb-2 group-hover:text-brand-blue transition-colors">{category.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{category.description}</p>
                          <p className="text-xs text-muted-foreground">{category.posts} posts</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Popular Topics */}
            <div>
              <h2 className="text-3xl font-bold mb-8">Popular Topics</h2>
              <div className="space-y-4">
                {popularTopics.map((topic, idx) => (
                  <Card key={idx} className="border-2 hover:border-brand-blue/50 transition-all duration-300 cursor-pointer group">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="text-lg font-semibold group-hover:text-brand-blue transition-colors">{topic.title}</h3>
                        <div className="flex gap-6 text-sm text-muted-foreground whitespace-nowrap">
                          <span>{topic.replies} replies</span>
                          <span>{topic.views} views</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* CTA */}
            <Card className="border-2 bg-gradient-to-br from-brand-blue/5 via-background to-brand-purple/5">
              <CardContent className="pt-8 text-center">
                <h2 className="text-3xl font-bold mb-4">Ready to Join the Discussion?</h2>
                <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto leading-relaxed">
                  Sign up for a free account to start participating in the community. Share your knowledge, ask questions, and connect with fellow TrueSpend users.
                </p>
                <button className="px-8 py-3 rounded-lg bg-gradient-to-r from-brand-blue to-brand-purple text-white font-semibold hover:opacity-90 transition-opacity">
                  Join Community Forum
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
