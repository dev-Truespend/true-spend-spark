import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/shared/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        accent: "border-transparent bg-accent text-accent-foreground hover:bg-accent/80",
        teal: "border-transparent bg-chart-3 text-primary-foreground hover:bg-chart-3/80",
        new: "border-transparent bg-brand-blue text-white hover:bg-brand-blue/90 animate-pulse shadow-sm",
        popular: "border-transparent bg-gradient-to-r from-brand-blue via-brand-purple to-brand-teal text-white hover:opacity-90 shadow-premium",
        comingSoon: "border-2 border-muted bg-muted/50 text-muted-foreground hover:bg-muted/70",
        availableNow: "border-transparent bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
