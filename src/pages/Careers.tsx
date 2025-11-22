import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Briefcase, Clock, ArrowRight } from "lucide-react";

export default function Careers() {
  const openings = [
    {
      title: "Senior Full-Stack Engineer",
      department: "Engineering",
      location: "Remote (US)",
      type: "Full-time",
      description: "Help us build the next generation of privacy-first financial tools. Strong experience with React, TypeScript, and Supabase required.",
    },
    {
      title: "Product Designer",
      department: "Design",
      location: "Remote (Worldwide)",
      type: "Full-time",
      description: "Create beautiful, intuitive interfaces that respect user privacy. Experience with fintech products is a plus.",
    },
    {
      title: "ML Engineer",
      department: "AI/ML",
      location: "Remote (US/EU)",
      type: "Full-time",
      description: "Build AI models that help users optimize their spending without compromising privacy. Experience with privacy-preserving ML techniques preferred.",
    },
  ];

  const benefits = [
    "Competitive salary and equity",
    "Health, dental, and vision insurance",
    "Unlimited PTO",
    "Remote-first culture",
    "Home office stipend",
    "Professional development budget",
    "401(k) matching",
    "Quarterly team retreats",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/10">
      <section className="pt-32 pb-24 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-6">Careers</Badge>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-6">
              Join Our <span className="bg-gradient-to-r from-brand-blue via-brand-purple to-brand-teal bg-clip-text text-transparent">Mission</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Help us build financial tools that respect user privacy and empower people to take control of their money.
            </p>
          </div>

          <div className="space-y-12">
            <Card className="border-2">
              <CardContent className="pt-8">
                <h2 className="text-3xl font-bold mb-6">Why Work at TrueSpend?</h2>
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  We're a fast-growing startup on a mission to change how people manage their finances. Join a team that values privacy, innovation, and user empowerment.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  {benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-brand-blue"></div>
                      <span className="text-muted-foreground">{benefit}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div>
              <h2 className="text-3xl font-bold mb-8">Open Positions</h2>
              <div className="space-y-6">
                {openings.map((job, idx) => (
                  <Card key={idx} className="border-2 hover:border-brand-blue/50 transition-all duration-300 hover:shadow-premium group">
                    <CardContent className="pt-8">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                        <div>
                          <h3 className="text-2xl font-bold mb-2 group-hover:text-brand-blue transition-colors">{job.title}</h3>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Briefcase className="w-4 h-4" />
                              <span>{job.department}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>{job.location}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>{job.type}</span>
                            </div>
                          </div>
                        </div>
                        <Button className="bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90 text-white whitespace-nowrap">
                          Apply Now
                          <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">{job.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="border-2 bg-gradient-to-br from-brand-blue/5 via-background to-brand-purple/5">
              <CardContent className="pt-8 text-center">
                <h2 className="text-2xl font-bold mb-4">Don't see a role that fits?</h2>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto leading-relaxed">
                  We're always looking for talented people who share our values. Send us your resume and tell us how you'd like to contribute to our mission.
                </p>
                <Button variant="outline" size="lg" className="hover:border-brand-blue hover:text-brand-blue">
                  Send General Application
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
