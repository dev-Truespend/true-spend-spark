/**
 * OCR Preparation Service
 * Optimizes images for OCR processing (Phase 2)
 */

export interface OCRMetadata {
  originalDimensions: { width: number; height: number };
  optimizedDimensions: { width: number; height: number };
  fileSize: number;
  optimizedSize: number;
  contrast: number;
  brightness: number;
  grayscale: boolean;
  timestamp: number;
}

export interface OCRResult {
  blob: Blob;
  metadata: OCRMetadata;
  dataUrl: string;
}

/**
 * Optimize image for OCR processing
 */
export async function prepareImageForOCR(file: File | Blob): Promise<OCRResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        // Calculate optimal dimensions (max 2048px for OCR)
        const maxDimension = 2048;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Get image data for processing
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Convert to grayscale and enhance contrast
        let totalBrightness = 0;
        for (let i = 0; i < data.length; i += 4) {
          // Grayscale conversion
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          
          // Enhance contrast (simple method)
          const enhanced = ((gray - 128) * 1.3) + 128;
          const clamped = Math.max(0, Math.min(255, enhanced));
          
          data[i] = clamped;     // R
          data[i + 1] = clamped; // G
          data[i + 2] = clamped; // B
          
          totalBrightness += clamped;
        }

        const avgBrightness = totalBrightness / (data.length / 4);

        // Apply enhanced image back to canvas
        ctx.putImageData(imageData, 0, 0);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }

            const metadata: OCRMetadata = {
              originalDimensions: { width: img.width, height: img.height },
              optimizedDimensions: { width, height },
              fileSize: file.size,
              optimizedSize: blob.size,
              contrast: 1.3,
              brightness: avgBrightness,
              grayscale: true,
              timestamp: Date.now(),
            };

            canvas.toBlob(
              (dataBlob) => {
                if (!dataBlob) {
                  reject(new Error('Failed to create data URL'));
                  return;
                }

                const reader = new FileReader();
                reader.onloadend = () => {
                  resolve({
                    blob,
                    metadata,
                    dataUrl: reader.result as string,
                  });
                  URL.revokeObjectURL(url);
                };
                reader.readAsDataURL(dataBlob);
              },
              'image/jpeg',
              0.92
            );
          },
          'image/jpeg',
          0.92
        );
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Extract text regions from image (preparation for Phase 2 OCR)
 */
export async function detectTextRegions(imageData: ImageData): Promise<DOMRect[]> {
  // Simplified text region detection
  // In Phase 2, this will use actual OCR library
  const regions: DOMRect[] = [];
  const { width, height, data } = imageData;

  // Simple edge detection for text regions
  const threshold = 128;
  const minRegionSize = 50;

  let inRegion = false;
  let regionStart = 0;

  for (let y = 0; y < height; y += 10) {
    let lineHasText = false;

    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const brightness = data[i];

      if (brightness < threshold) {
        lineHasText = true;
        break;
      }
    }

    if (lineHasText && !inRegion) {
      inRegion = true;
      regionStart = y;
    } else if (!lineHasText && inRegion) {
      const regionHeight = y - regionStart;
      if (regionHeight > minRegionSize) {
        regions.push(new DOMRect(0, regionStart, width, regionHeight));
      }
      inRegion = false;
    }
  }

  return regions;
}

/**
 * Analyze image quality for OCR readiness
 */
export interface OCRQualityScore {
  overall: number; // 0-100
  sharpness: number;
  contrast: number;
  brightness: number;
  recommendations: string[];
}

export async function analyzeOCRQuality(file: File | Blob): Promise<OCRQualityScore> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        // Sample a portion of the image for analysis
        const sampleSize = 500;
        canvas.width = sampleSize;
        canvas.height = sampleSize;

        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
        const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const data = imageData.data;

        // Calculate metrics
        let totalBrightness = 0;
        let totalContrast = 0;
        let edgeStrength = 0;

        for (let i = 0; i < data.length; i += 4) {
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          totalBrightness += brightness;

          // Simple edge detection (Sobel-like)
          if (i + 4 < data.length) {
            const nextBrightness = (data[i + 4] + data[i + 5] + data[i + 6]) / 3;
            edgeStrength += Math.abs(brightness - nextBrightness);
          }
        }

        const pixelCount = data.length / 4;
        const avgBrightness = totalBrightness / pixelCount;
        const avgEdgeStrength = edgeStrength / pixelCount;

        // Calculate scores (0-100)
        const brightnessScore = Math.max(0, 100 - Math.abs(avgBrightness - 128) * 0.8);
        const sharpnessScore = Math.min(100, avgEdgeStrength * 2);
        const contrastScore = Math.min(100, avgEdgeStrength * 1.5);

        const overallScore = (brightnessScore + sharpnessScore + contrastScore) / 3;

        const recommendations: string[] = [];
        if (brightnessScore < 60) {
          recommendations.push(avgBrightness < 100 ? 'Image is too dark' : 'Image is too bright');
        }
        if (sharpnessScore < 60) {
          recommendations.push('Image appears blurry or out of focus');
        }
        if (contrastScore < 60) {
          recommendations.push('Low contrast - try better lighting');
        }

        resolve({
          overall: Math.round(overallScore),
          sharpness: Math.round(sharpnessScore),
          contrast: Math.round(contrastScore),
          brightness: Math.round(brightnessScore),
          recommendations,
        });

        URL.revokeObjectURL(url);
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}
