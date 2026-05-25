import { HuggingFaceMonitor } from '@/features/ml/components/HuggingFaceMonitor';
import { HuggingFaceFeatureFlags } from '@/features/ml/components/HuggingFaceFeatureFlags';

export default function HuggingFace() {
  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Hugging Face Integration</h1>
        <p className="text-muted-foreground">
          Monitor and control Hugging Face services for OCR and categorization
        </p>
      </div>

      <HuggingFaceFeatureFlags />
      <HuggingFaceMonitor />
    </div>
  );
}
