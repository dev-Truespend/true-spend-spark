import { useEffect, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Camera, X, SwitchCamera, Image as ImageIcon } from 'lucide-react';
import { useCamera } from '@/features/ocr/hooks/useCamera';
import { toast } from 'sonner';

interface CameraCaptureProps {
  onCapture: (blob: Blob, file: File) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const { videoRef, isActive, error, startCamera, stopCamera, capturePhoto, switchCamera } = useCamera();
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  useEffect(() => {
    startCamera({ facingMode }).catch((err) => {
      toast.error('Failed to access camera');
      console.error(err);
    });

    return () => {
      stopCamera();
    };
  }, []);

  const handleCapture = async () => {
    try {
      const blob = await capturePhoto();
      const file = new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCapture(blob, file);
      stopCamera();
      onClose();
    } catch (err) {
      toast.error('Failed to capture photo');
      console.error(err);
    }
  };

  const handleSwitchCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    try {
      await switchCamera(newMode);
      setFacingMode(newMode);
    } catch (err) {
      toast.error('Failed to switch camera');
      console.error(err);
    }
  };

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={onClose}>Close</Button>
      </Card>
    );
  }

  return (
    <Card className="relative w-full max-w-2xl mx-auto">
      <div className="relative aspect-video bg-black rounded-t-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        
        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Camera className="h-12 w-12 text-muted-foreground animate-pulse" />
          </div>
        )}
      </div>

      <div className="p-4 flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>

        <Button
          size="lg"
          onClick={handleCapture}
          disabled={!isActive}
          className="flex-1"
        >
          <Camera className="h-5 w-5 mr-2" />
          Capture Receipt
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={handleSwitchCamera}
          disabled={!isActive}
        >
          <SwitchCamera className="h-5 w-5" />
        </Button>
      </div>
    </Card>
  );
}
