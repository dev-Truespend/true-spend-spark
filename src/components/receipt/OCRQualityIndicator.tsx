import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { analyzeOCRQuality, OCRQualityScore } from '@/services/ocrPreparation';

interface OCRQualityIndicatorProps {
  file: File | Blob;
  onQualityAnalyzed?: (score: OCRQualityScore) => void;
}

export function OCRQualityIndicator({ file, onQualityAnalyzed }: OCRQualityIndicatorProps) {
  const [quality, setQuality] = useState<OCRQualityScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyzeOCRQuality(file)
      .then((score) => {
        setQuality(score);
        onQualityAnalyzed?.(score);
      })
      .catch((error) => {
        console.error('[OCRQualityIndicator] Analysis failed:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [file]);

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Analyzing image quality...</span>
        </div>
      </Card>
    );
  }

  if (!quality) return null;

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-destructive';
  };

  const getQualityLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {quality.overall >= 60 ? (
            <CheckCircle2 className={`h-5 w-5 ${getQualityColor(quality.overall)}`} />
          ) : (
            <AlertCircle className="h-5 w-5 text-destructive" />
          )}
          <span className="font-medium">OCR Quality</span>
        </div>
        <Badge variant={quality.overall >= 60 ? 'default' : 'destructive'}>
          {getQualityLabel(quality.overall)} ({quality.overall}%)
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Sharpness</span>
            <span className={getQualityColor(quality.sharpness)}>{quality.sharpness}%</span>
          </div>
          <Progress value={quality.sharpness} className="h-1" />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Contrast</span>
            <span className={getQualityColor(quality.contrast)}>{quality.contrast}%</span>
          </div>
          <Progress value={quality.contrast} className="h-1" />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Brightness</span>
            <span className={getQualityColor(quality.brightness)}>{quality.brightness}%</span>
          </div>
          <Progress value={quality.brightness} className="h-1" />
        </div>
      </div>

      {quality.recommendations.length > 0 && (
        <div className="space-y-1 pt-2 border-t">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span>Recommendations</span>
          </div>
          <ul className="space-y-1 ml-6">
            {quality.recommendations.map((rec, index) => (
              <li key={index} className="text-xs text-muted-foreground">
                • {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
