import { HuggingFaceMonitor } from '@/components/admin/HuggingFaceMonitor';
import { HFFeatureFlagControls } from '@/components/admin/HFFeatureFlagControls';

export default function HuggingFace() {
  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Hugging Face Integration</h1>
        <p className="text-muted-foreground">
          Monitor and control Hugging Face services for OCR and categorization
        </p>
      </div>

      <HFFeatureFlagControls />
      <HuggingFaceMonitor />
    </div>
  );
}
