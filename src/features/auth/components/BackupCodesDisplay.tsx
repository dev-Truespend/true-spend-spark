import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Copy, Download, Printer, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";

interface BackupCodesDisplayProps {
  codes: string[];
  onClose: () => void;
}

export function BackupCodesDisplay({ codes, onClose }: BackupCodesDisplayProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    const codesText = codes.join('\n');
    navigator.clipboard.writeText(codesText);
    setCopied(true);
    toast.success("Backup codes copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCodes = () => {
    const codesText = `TrueSpend Backup Codes\n\nGenerated: ${new Date().toLocaleDateString()}\n\n${codes.join('\n')}\n\nStore these codes safely. Each code can only be used once.`;
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'truespend-backup-codes.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Backup codes downloaded");
  };

  const printCodes = () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write('<html><head><title>TrueSpend Backup Codes</title>');
      printWindow.document.write('<style>body { font-family: monospace; padding: 20px; }</style>');
      printWindow.document.write('</head><body>');
      printWindow.document.write('<h1>TrueSpend Backup Codes</h1>');
      printWindow.document.write(`<p>Generated: ${new Date().toLocaleDateString()}</p>`);
      printWindow.document.write('<p>Store these codes safely. Each code can only be used once.</p>');
      printWindow.document.write('<ul>');
      codes.forEach(code => {
        printWindow.document.write(`<li>${code}</li>`);
      });
      printWindow.document.write('</ul>');
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Save Your Backup Codes</CardTitle>
        <CardDescription>
          These codes can be used to access your account if you lose your authenticator device
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Store these codes in a safe place. Each code can only be used once.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
          {codes.map((code, index) => (
            <div key={index} className="p-2 bg-background rounded">
              {code}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={copyToClipboard} variant="outline" className="flex-1">
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? "Copied!" : "Copy All"}
          </Button>
          <Button onClick={downloadCodes} variant="outline" className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button onClick={printCodes} variant="outline" className="flex-1">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>

        <Button onClick={onClose} className="w-full">
          I've Saved My Backup Codes
        </Button>
      </CardContent>
    </Card>
  );
}
