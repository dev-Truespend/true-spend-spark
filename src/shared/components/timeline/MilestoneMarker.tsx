import { Badge } from "@/shared/components/ui/badge";
import { MapPin, Map, Plug, CheckCircle, Wrench, Sparkles } from "lucide-react";

interface MilestoneMarkerProps {
  week: number;
  name: string;
  icon: 'foundation' | 'geofencing' | 'services' | 'location' | 'polish' | 'extension';
  totalWeeks: number;
  currentWeek: number;
}

const iconMap = {
  foundation: CheckCircle,
  geofencing: MapPin,
  services: Wrench,
  location: Map,
  polish: Sparkles,
  extension: Plug,
};

const colorMap = {
  foundation: 'bg-green-500',
  geofencing: 'bg-orange-500',
  services: 'bg-blue-500',
  location: 'bg-purple-500',
  polish: 'bg-yellow-500',
  extension: 'bg-indigo-500',
};

export function MilestoneMarker({ week, name, icon, totalWeeks, currentWeek }: MilestoneMarkerProps) {
  const Icon = iconMap[icon];
  const position = (week / totalWeeks) * 100;
  const isPassed = currentWeek >= week;
  
  return (
    <div
      className="absolute top-0 bottom-0 flex flex-col items-center z-20"
      style={{ left: `${position}%` }}
    >
      {/* Vertical line */}
      <div className={`w-0.5 h-full ${isPassed ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
      
      {/* Icon badge */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 ${
          colorMap[icon]
        } rounded-full p-2 shadow-lg border-2 border-background ${
          isPassed ? 'opacity-100' : 'opacity-50'
        }`}
      >
        <Icon className="h-4 w-4 text-white" />
      </div>
      
      {/* Label */}
      <Badge
        variant={isPassed ? "default" : "outline"}
        className="absolute -bottom-8 -translate-x-1/2 text-xs whitespace-nowrap"
      >
        Week {week}: {name}
      </Badge>
    </div>
  );
}
