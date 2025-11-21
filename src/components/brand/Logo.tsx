import { usePlatform } from "@/hooks/usePlatform";
import logoFull from "@/assets/truespend-logo.png";
import logoIcon from "@/assets/truespend-icon.png";

interface LogoProps {
  variant?: 'full' | 'horizontal' | 'icon';
  className?: string;
  showTagline?: boolean;
}

export const Logo = ({ variant = 'horizontal', className = '', showTagline = false }: LogoProps) => {
  const { isMobile, isExtension } = usePlatform();

  // Auto-select variant based on platform if not explicitly set
  const effectiveVariant = variant === 'horizontal' && (isMobile || isExtension) 
    ? 'icon' 
    : variant;

  if (effectiveVariant === 'icon') {
    return (
      <img 
        src={logoIcon} 
        alt="TrueSpend" 
        className={`h-8 w-8 ${className}`}
      />
    );
  }

  if (effectiveVariant === 'full') {
    return (
      <div className="flex flex-col items-center gap-2">
        <img 
          src={logoFull} 
          alt="TrueSpend" 
          className={`h-12 w-auto ${className}`}
        />
        {showTagline && (
          <p className="text-sm text-muted-foreground font-medium">
            Every Purchase. Perfectly Rewarded.
          </p>
        )}
      </div>
    );
  }

  // Horizontal variant (default for desktop)
  return (
    <img 
      src={logoFull} 
      alt="TrueSpend" 
      className={`h-8 w-auto ${className}`}
    />
  );
};
