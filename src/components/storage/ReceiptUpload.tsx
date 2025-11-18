import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle, AlertCircle, Camera, Image as ImageIcon, Scan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { uploadFile, getUserPath } from '@/services/storageService';
import { prepareImageForOCR } from '@/services/ocrPreparation';
import { extractReceiptData, ReceiptData } from '@/services/ocrService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { CameraCapture } from '@/components/camera/CameraCapture';
import { ImagePreview } from '@/components/receipt/ImagePreview';
import { OCRQualityIndicator } from '@/components/receipt/OCRQualityIndicator';

interface UploadedFile {
  name: string;
  status: 'uploading' | 'success' | 'error' | 'analyzing' | 'extracting';
  progress: number;
  url?: string;
  error?: string;
  extractedData?: ReceiptData;
  metadata?: {
    size: number;
    type: string;
    timestamp: number;
    location?: { lat: number; lng: number };
    ocrReady?: boolean;
    ocrQuality?: number;
  };
}

export interface ReceiptUploadProps {
  onReceiptExtracted?: (data: ReceiptData) => void;
}

export function ReceiptUpload({ onReceiptExtracted }: ReceiptUploadProps = {}) {
  const { user } = useAuth();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; file: File } | null>(null);
  const [qualityCheckFile, setQualityCheckFile] = useState<File | null>(null);

  const processFile = async (file: File, metadata?: Partial<UploadedFile['metadata']>) => {
    if (!user) {
      toast.error('You must be logged in to upload receipts');
      return;
    }

    const uploadedFile: UploadedFile = {
      name: file.name,
      status: 'analyzing',
      progress: 0,
      metadata: {
        size: file.size,
        type: file.type,
        timestamp: Date.now(),
        ...metadata,
      },
    };

    setFiles(prev => [...prev, uploadedFile]);
    const fileIndex = files.length;

    try {
      // Prepare image for OCR if it's an image
      let fileToUpload = file;
      if (file.type.startsWith('image/')) {
        const ocrResult = await prepareImageForOCR(file);
        
        // Create file-like object from blob
        const timestamp = Date.now();
        const fileObj = ocrResult.blob as any;
        fileObj.name = file.name;
        fileObj.lastModified = timestamp;
        fileToUpload = fileObj as File;
        
        // Update metadata with OCR info
        setFiles(prev => {
          const updated = [...prev];
          if (updated[fileIndex]) {
            updated[fileIndex].metadata = {
              ...updated[fileIndex].metadata!,
              ocrReady: true,
              ocrQuality: Math.round((ocrResult.metadata.brightness / 255) * 100),
            };
          }
          return updated;
        });
      }

      // Update status to uploading
      setFiles(prev => {
        const updated = [...prev];
        if (updated[fileIndex]) {
          updated[fileIndex].status = 'uploading';
        }
        return updated;
      });

      const path = getUserPath(user.id, file.name);
      
      const result = await uploadFile({
        bucket: 'receipts',
        path,
        file: fileToUpload,
        onProgress: (progress) => {
          setFiles(prev => {
            const updated = [...prev];
            if (updated[fileIndex]) {
              updated[fileIndex].progress = progress;
            }
            return updated;
          });
        },
      });

      setFiles(prev => {
        const updated = [...prev];
        if (updated[fileIndex]) {
          updated[fileIndex].status = 'success';
          updated[fileIndex].progress = 100;
          updated[fileIndex].url = result.publicUrl;
        }
        return updated;
      });

      // Extract receipt data for images
      if (file.type.startsWith('image/')) {
        setFiles(prev => {
          const updated = [...prev];
          if (updated[fileIndex]) updated[fileIndex].status = 'extracting';
          return updated;
        });

        const ocrResult = await extractReceiptData(fileToUpload);
        if (ocrResult.success && ocrResult.data) {
          setFiles(prev => {
            const updated = [...prev];
            if (updated[fileIndex]) updated[fileIndex].extractedData = ocrResult.data;
            return updated;
          });
          onReceiptExtracted?.(ocrResult.data);
          toast.success('Receipt extracted!', { description: `${ocrResult.data.merchant}: $${ocrResult.data.amount}` });
        } else {
          toast.success(`${file.name} uploaded (OCR failed - enter manually)`);
        }
      } else {
        toast.success(`${file.name} uploaded successfully`);
      }
    } catch (error) {
      setFiles(prev => {
        const updated = [...prev];
        if (updated[fileIndex]) {
          updated[fileIndex].status = 'error';
          updated[fileIndex].error = error instanceof Error ? error.message : 'Upload failed';
        }
        return updated;
      });

      toast.error(`Failed to upload ${file.name}`);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      // Show quality check and preview for images
      if (file.type.startsWith('image/')) {
        setQualityCheckFile(file);
        const url = URL.createObjectURL(file);
        setPreviewImage({ url, file });
      } else {
        processFile(file);
      }
    });
  }, [user]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    noClick: false,
  });

  const handleCameraCapture = (blob: Blob, file: File) => {
    const url = URL.createObjectURL(blob);
    setPreviewImage({ url, file });
    setShowCamera(false);
  };

  const handlePreviewConfirm = async (editedBlob: Blob) => {
    if (!previewImage) return;

    // Get location if available
    let location: { lat: number; lng: number } | undefined;
    if ('geolocation' in navigator) {
      try {
        const position: GeolocationPosition = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            maximumAge: 0,
          });
        });
        location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      } catch (err) {
        if (import.meta.env.DEV) {
          console.log('[ReceiptUpload] Location not available');
        }
      }
    }

    // Create file from blob
    const timestamp = Date.now();
    const fileName = `receipt-${timestamp}.jpg`;
    const fileObj = editedBlob as any;
    fileObj.name = fileName;
    fileObj.lastModified = timestamp;

    processFile(fileObj as File, { location });
    URL.revokeObjectURL(previewImage.url);
    setPreviewImage(null);
  };

  const handlePreviewCancel = () => {
    if (previewImage) {
      URL.revokeObjectURL(previewImage.url);
      setPreviewImage(null);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <div className="space-y-4">
        <Card
          {...getRootProps()}
          className={`p-8 border-2 border-dashed cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="p-4 rounded-full bg-primary/10">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {isDragActive ? 'Drop files here' : 'Drop receipts or click to upload'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Supports JPG, PNG, WebP, and PDF (max 5MB)
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCamera(true);
                }}
              >
                <Camera className="h-4 w-4 mr-2" />
                Camera
              </Button>
              <Button variant="outline" size="sm">
                <ImageIcon className="h-4 w-4 mr-2" />
                Gallery
              </Button>
            </div>
          </div>
        </Card>

        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 p-2 rounded-lg bg-muted">
                    <File className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {file.name}
                        </p>
                        {file.status === 'uploading' && (
                          <Progress value={file.progress} className="mt-2 h-1" />
                        )}
                        {file.status === 'error' && (
                          <p className="text-xs text-destructive mt-1">{file.error}</p>
                        )}
                        {file.metadata && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {(file.metadata.size / 1024).toFixed(1)} KB
                            {file.metadata.location && ' • Location captured'}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {file.status === 'success' && (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                        {file.status === 'analyzing' && (
                          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        )}
                        {file.status === 'error' && (
                          <AlertCircle className="h-5 w-5 text-destructive" />
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeFile(index)}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Camera Dialog */}
      <Dialog open={showCamera} onOpenChange={setShowCamera}>
        <DialogContent className="max-w-4xl">
          <DialogTitle className="sr-only">Camera Capture</DialogTitle>
          <CameraCapture
            onCapture={handleCameraCapture}
            onClose={() => setShowCamera(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog with Quality Check */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && handlePreviewCancel()}>
        <DialogContent className="max-w-4xl">
          <DialogTitle className="sr-only">Image Preview & Quality Check</DialogTitle>
          <div className="space-y-4">
            {qualityCheckFile && (
              <OCRQualityIndicator file={qualityCheckFile} />
            )}
            {previewImage && (
              <ImagePreview
                imageUrl={previewImage.url}
                onConfirm={handlePreviewConfirm}
                onCancel={handlePreviewCancel}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
