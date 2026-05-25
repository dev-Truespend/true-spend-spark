import { Progress } from "@/shared/components/ui/progress";

interface PasswordStrengthMeterProps {
  password: string;
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const calculateStrength = (pwd: string): { score: number; label: string; color: string } => {
    let score = 0;
    
    if (pwd.length >= 12) score += 25;
    if (pwd.length >= 16) score += 10;
    if (/[a-z]/.test(pwd)) score += 15;
    if (/[A-Z]/.test(pwd)) score += 15;
    if (/[0-9]/.test(pwd)) score += 15;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 20;
    
    // Bonus for variety
    const uniqueChars = new Set(pwd).size;
    if (uniqueChars > 8) score += 10;
    
    // Penalty for common patterns
    const commonPatterns = ['123', 'abc', 'password', 'qwerty'];
    if (commonPatterns.some(pattern => pwd.toLowerCase().includes(pattern))) {
      score -= 20;
    }

    // Clamp score between 0-100
    score = Math.max(0, Math.min(100, score));

    if (score < 40) return { score, label: 'Weak', color: 'bg-destructive' };
    if (score < 60) return { score, label: 'Fair', color: 'bg-orange-500' };
    if (score < 80) return { score, label: 'Good', color: 'bg-yellow-500' };
    return { score, label: 'Strong', color: 'bg-green-500' };
  };

  if (!password) return null;

  const strength = calculateStrength(password);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Password strength:</span>
        <span className={`text-sm font-semibold ${
          strength.label === 'Weak' ? 'text-destructive' :
          strength.label === 'Fair' ? 'text-orange-500' :
          strength.label === 'Good' ? 'text-yellow-600 dark:text-yellow-500' :
          'text-green-600 dark:text-green-500'
        }`}>
          {strength.label}
        </span>
      </div>
      <div className="relative">
        <Progress value={strength.score} className="h-2" />
        <div 
          className={`absolute top-0 left-0 h-2 rounded-full transition-all ${strength.color}`}
          style={{ width: `${strength.score}%` }}
        />
      </div>
    </div>
  );
}
