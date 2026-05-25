// @ts-nocheck -- TODO: fix strictNullChecks errors
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { 
  RotateCw, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  X,
  Check
} from 'lucide-react';

interface ImagePreviewProps {
  imageUrl: string;
  onConfirm: (editedBlob: Blob) => void;
  onCancel: () => void;
}

export function ImagePreview({ imageUrl, onConfirm, onCancel }: ImagePreviewProps) {
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      if (imageRef.current) {
        imageRef.current = img;
        drawImage();
      }
    };
  }, [imageUrl]);

  useEffect(() => {
    drawImage();
  }, [rotation, scale]);

  const drawImage = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = img.width;
    canvas.height = img.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
  };

  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.1, 0.5));
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        onConfirm(blob);
      }
    }, 'image/jpeg', 0.95);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto p-4">
      <div className="space-y-4">
        {/* Preview */}
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          <img
            src={imageUrl}
            alt="Receipt preview"
            className="absolute inset-0 w-full h-full object-contain"
            style={{
              transform: `rotate(${rotation}deg) scale(${scale})`,
              transition: 'transform 0.3s ease',
            }}
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Rotation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRotateLeft}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <div className="flex-1 text-center text-sm text-muted-foreground">
              Rotation: {rotation}°
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRotateRight}
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomOut}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Slider
              value={[scale * 100]}
              onValueChange={([value]) => setScale(value / 100)}
              min={50}
              max={300}
              step={10}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomIn}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1"
          >
            <Check className="h-4 w-4 mr-2" />
            Confirm
          </Button>
        </div>
      </div>
    </Card>
  );
}
