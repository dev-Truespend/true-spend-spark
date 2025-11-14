import { Check, X } from "lucide-react";

interface PasswordRequirementsProps {
  password: string;
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const requirements = [
    { label: "At least 12 characters", test: (p: string) => p.length >= 12 },
    { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
    { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
    { label: "One number", test: (p: string) => /[0-9]/.test(p) },
    { label: "One special character (!@#$%^&*)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ];

  return (
    <div className="space-y-2 text-sm">
      <p className="text-muted-foreground font-medium">Password must contain:</p>
      <ul className="space-y-1">
        {requirements.map((req, index) => {
          const passes = req.test(password);
          return (
            <li key={index} className="flex items-center gap-2">
              {passes ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-muted-foreground/50" />
              )}
              <span className={passes ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                {req.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
