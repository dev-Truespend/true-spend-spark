import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Key, Loader2, AlertCircle } from "lucide-react";

interface MFAVerifyModalProps {
  open: boolean;
  onVerify: (code: string, isBackupCode: boolean) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}

export function MFAVerifyModal({ open, onVerify, onCancel, loading, error }: MFAVerifyModalProps) {
  const [totpCode, setTotpCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [activeTab, setActiveTab] = useState("totp");

  const handleVerify = async () => {
    if (activeTab === "totp") {
      if (totpCode.length === 6) {
        await onVerify(totpCode, false);
      }
    } else {
      if (backupCode.length >= 8) {
        await onVerify(backupCode, true);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            Enter your verification code to continue
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="totp">Authenticator App</TabsTrigger>
            <TabsTrigger value="backup">Backup Code</TabsTrigger>
          </TabsList>

          <TabsContent value="totp" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Enter 6-digit code from your authenticator app</Label>
              <div className="flex justify-center">
                <InputOTP
                  value={totpCode}
                  onChange={setTotpCode}
                  maxLength={6}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Use Google Authenticator, Authy, or any TOTP app
              </p>
            </div>
          </TabsContent>

          <TabsContent value="backup" className="space-y-4 mt-4">
            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription>
                Enter one of your backup codes. Each code can only be used once.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="backupCode">Backup Code</Label>
              <Input
                id="backupCode"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX"
                className="font-mono text-center"
                maxLength={9}
              />
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button onClick={onCancel} variant="outline" className="flex-1" disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleVerify}
            className="flex-1"
            disabled={
              loading ||
              (activeTab === "totp" ? totpCode.length !== 6 : backupCode.length < 8)
            }
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
