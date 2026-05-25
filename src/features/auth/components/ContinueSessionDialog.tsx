import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { Clock, AlertTriangle } from "lucide-react";

interface ContinueSessionDialogProps {
  open: boolean;
  remainingTime: number;
  onContinue: () => void;
}

export function ContinueSessionDialog({ open, remainingTime, onContinue }: ContinueSessionDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
              <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
            </div>
            <AlertDialogTitle className="text-xl">Session Expiring Soon</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base space-y-3">
            <p>You've been inactive for a while. For your security, we'll log you out automatically in:</p>
            <div className="flex items-center justify-center gap-2 py-4">
              <Clock className="h-8 w-8 text-primary" />
              <span className="text-4xl font-bold text-primary tabular-nums">
                {remainingTime}
              </span>
              <span className="text-lg text-muted-foreground">seconds</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Click the button below to continue your session.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction 
            onClick={onContinue}
            className="w-full bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90 text-white font-semibold shadow-premium"
          >
            Continue Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
