import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";

interface ConsentBlockProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  error?: string;
}

export function ConsentBlock({ checked, onCheckedChange, error }: ConsentBlockProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-start space-x-2">
        <Checkbox
          id="consent"
          checked={checked}
          onCheckedChange={onCheckedChange}
          className="mt-1"
        />
        <Label
          htmlFor="consent"
          className="text-sm leading-relaxed cursor-pointer"
        >
          I agree to the{" "}
          <Link
            to="/legal/terms"
            className="text-primary hover:underline font-medium"
            target="_blank"
          >
            Terms of Service
          </Link>
          ,{" "}
          <Link
            to="/legal/privacy"
            className="text-primary hover:underline font-medium"
            target="_blank"
          >
            Privacy Policy
          </Link>
          ,{" "}
          <Link
            to="/legal/data-processing"
            className="text-primary hover:underline font-medium"
            target="_blank"
          >
            Data Processing Policy
          </Link>
          ,{" "}
          <Link
            to="/legal/ai-recommendations"
            className="text-primary hover:underline font-medium"
            target="_blank"
          >
            AI Recommendations Policy
          </Link>
          ,{" "}
          <Link
            to="/legal/affiliate-transparency"
            className="text-primary hover:underline font-medium"
            target="_blank"
          >
            Affiliate Transparency
          </Link>
          , and{" "}
          <Link
            to="/legal/consent"
            className="text-primary hover:underline font-medium"
            target="_blank"
          >
            Consent Agreement
          </Link>
        </Label>
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
