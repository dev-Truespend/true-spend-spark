import { useState } from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/shared/components/ui/dialog';
import { 
  MapPin, 
  TrendingUp, 
  Bell, 
  Zap, 
  ChevronRight, 
  ChevronLeft,
  X,
  Lightbulb
} from 'lucide-react';
import { Progress } from '@/shared/components/ui/progress';

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  details: string[];
}

const tutorialSteps: TutorialStep[] = [
  {
    title: 'Create Geofences',
    description: 'Set up location-based spending zones',
    icon: <MapPin className="h-8 w-8 text-primary" />,
    details: [
      'Click on the map to select a location',
      'Set a radius to define your spending zone',
      'Name your geofence (e.g., "Grocery Store", "Downtown")',
      'Choose a type: Spending Tracker, Savings Goal, or Budget Alert',
    ],
  },
  {
    title: 'Track Spending Patterns',
    description: 'Visualize where your money goes',
    icon: <TrendingUp className="h-8 w-8 text-primary" />,
    details: [
      'View heatmaps showing spending hotspots',
      'See total spending per location',
      'Track average transaction amounts',
      'Analyze spending by category within each zone',
    ],
  },
  {
    title: 'Get Smart Alerts',
    description: 'Stay informed about your spending',
    icon: <Bell className="h-8 w-8 text-primary" />,
    details: [
      'Receive notifications when entering geofences',
      'Get budget threshold alerts (50%, 75%, 90%, 100%)',
      'See real-time spending updates',
      'Get notified about nearby deals and savings',
    ],
  },
  {
    title: 'AI-Powered Insights',
    description: 'Discover opportunities to save',
    icon: <Zap className="h-8 w-8 text-primary" />,
    details: [
      'Get personalized spending recommendations',
      'Discover nearby merchants with better deals',
      'Receive budget adjustment suggestions',
      'See spending pattern analysis and trends',
    ],
  },
];

export function LocationTutorial() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setCurrentStep(0);
  };

  const step = tutorialSteps[currentStep];

  return (
    <>
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="p-3 rounded-full bg-primary/10">
            <Lightbulb className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">New to Location Intelligence?</h3>
            <p className="text-sm text-muted-foreground">
              Take a quick tour to learn how to track spending by location
            </p>
          </div>
          <Button onClick={() => setIsOpen(true)}>
            Start Tutorial
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Location Intelligence Tutorial</span>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              Step {currentStep + 1} of {tutorialSteps.length}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <Progress value={progress} className="h-2" />

            <div className="flex flex-col items-center text-center space-y-4 py-6">
              <div className="p-4 rounded-full bg-primary/10">
                {step.icon}
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>

              <div className="w-full max-w-md space-y-3 pt-4">
                {step.details.map((detail, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 text-left p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <p className="text-sm flex-1">{detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {currentStep === tutorialSteps.length - 1 ? (
                <Button onClick={handleClose}>
                  Get Started
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
