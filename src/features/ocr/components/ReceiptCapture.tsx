import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Camera, Loader2, Image as ImageIcon } from 'lucide-react';
import { useCamera } from '@/features/ocr/hooks/useCamera';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SPECIFIC_ERRORS } from '@/shared/lib/errors/errorMessages';

interface ReceiptCaptureProps {
  onTransactionExtracted: (transaction: {
    amount: number;
    description: string;
    merchant?: string;
    category?: string;
    timestamp: string;
  }) => void;
  onCancel?: () => void;
}

export function ReceiptCapture({ onTransactionExtracted, onCancel }: ReceiptCaptureProps) {
  const { isActive, error: cameraError, startCamera, stopCamera, capturePhoto } = useCamera();
  const [processing, setProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const handleCapture = async () => {
    try {
      setProcessing(true);

      // Start camera if not active
      if (!isActive) {
        await startCamera({ facingMode: 'environment' });
      }

      // Capture image
      const imageBlob = await capturePhoto();
      if (!imageBlob) {
        throw new Error('Failed to capture image');
      }

      // Convert blob to base64
      const reader = new FileReader();
      const imageDataUrl = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageBlob);
      });

      setCapturedImage(imageDataUrl);

      // Call OCR backend
      const { data, error } = await supabase.functions.invoke('google-vision-ocr', {
        body: { 
          imageData: imageDataUrl,
          userId: (await supabase.auth.getUser()).data.user?.id,
        },
      });

      if (error) throw error;

      if (!data || !data.success) {
        throw new Error(data?.error || 'OCR processing failed');
      }

      // Parse OCR results into transaction data
      const transaction = parseOCRResults(data);
      
      if (!transaction.amount || transaction.amount === 0) {
        toast.error(SPECIFIC_ERRORS.OCR_FAILED.title, {
          description: 'Could not find transaction amount. Please enter manually.',
        });
        return;
      }

      // Show success and pass to parent
      toast.success('Receipt scanned successfully!', {
        description: `Found: $${transaction.amount.toFixed(2)} at ${transaction.merchant || 'Unknown'}`,
      });

      stopCamera();
      onTransactionExtracted(transaction);
    } catch (error) {
      console.error('[ReceiptCapture] Error:', error);
      
      if (error instanceof Error && error.message.includes('permission')) {
        toast.error(SPECIFIC_ERRORS.CAMERA_PERMISSION_DENIED.title, {
          description: SPECIFIC_ERRORS.CAMERA_PERMISSION_DENIED.description,
        });
      } else {
        toast.error(SPECIFIC_ERRORS.OCR_FAILED.title, {
          description: SPECIFIC_ERRORS.OCR_FAILED.description,
        });
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Scan Receipt
        </CardTitle>
        <CardDescription>
          Automatically extract transaction details from receipts
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!capturedImage ? (
          <div className="space-y-4">
            <Alert>
              <ImageIcon className="h-4 w-4" />
              <AlertDescription>
                Position the receipt clearly in good lighting for best results
              </AlertDescription>
            </Alert>

            {cameraError && (
              <Alert variant="destructive">
                <AlertDescription>{cameraError}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleCapture}
              disabled={processing}
              className="w-full"
              size="lg"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-5 w-5" />
                  {isActive ? 'Capture Receipt' : 'Start Camera'}
                </>
              )}
            </Button>

            {onCancel && (
              <Button
                onClick={onCancel}
                variant="outline"
                className="w-full"
              >
                Cancel
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden border">
              <img
                src={capturedImage}
                alt="Captured receipt"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setCapturedImage(null);
                  handleCapture();
                }}
                variant="outline"
                className="flex-1"
                disabled={processing}
              >
                Retake
              </Button>
              {onCancel && (
                <Button
                  onClick={() => {
                    stopCamera();
                    onCancel();
                  }}
                  variant="outline"
                  className="flex-1"
                  disabled={processing}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Parse OCR results into transaction data
 */
function parseOCRResults(ocrData: any): {
  amount: number;
  description: string;
  merchant?: string;
  category?: string;
  timestamp: string;
} {
  const { textAnnotations, fullText } = ocrData;
  
  // Extract amount (look for $ followed by numbers)
  const amountMatch = fullText?.match(/\$?\s*(\d+\.?\d{0,2})/) || 
                      textAnnotations?.[0]?.description?.match(/\$?\s*(\d+\.?\d{0,2})/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;

  // Extract merchant name (usually first line or bold text)
  const text = fullText || textAnnotations?.[0]?.description || '';
  const lines = text.split('\n').filter((line: string) => line.trim().length > 0);
  const merchant = lines[0] || 'Unknown Merchant';

  // Extract date (look for date patterns)
  const dateMatch = text.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/);
  const timestamp = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString();

  return {
    amount,
    description: `Receipt from ${merchant}`,
    merchant,
    category: 'Uncategorized',
    timestamp,
  };
}
