import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PrivacyModalProps {
  open: boolean;
  onClose: () => void;
}

export function PrivacyModal({ open, onClose }: PrivacyModalProps) {
  const handleAccept = () => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ privacyAccepted: true });
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Privacy & Data Collection</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm">TrueSpend Extension collects:</p>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>Budget data synced from your account</li>
            <li>Merchant detection events (optional)</li>
            <li>Anonymous usage analytics</li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Your location data is NOT tracked by the extension. 
            All data is encrypted in transit using HTTPS.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Decline
            </Button>
            <Button onClick={handleAccept}>
              Accept
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
