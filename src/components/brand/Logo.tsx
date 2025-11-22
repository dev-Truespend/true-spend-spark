import logoIcon from "@/assets/truespend-icon-brand.png";

interface LogoProps {
  className?: string;
  onClick?: () => void;
}

export const Logo = ({ className = '', onClick }: LogoProps) => {
  return (
    <div 
      className={`flex items-center gap-3 cursor-pointer ${className}`}
      onClick={onClick}
    >
      <img 
        src={logoIcon} 
        alt="TrueSpend" 
        className="h-8 w-8 animate-logo-bounce"
      />
      <span className="text-xl font-bold bg-gradient-to-r from-[#3882F6] to-[#9333EA] bg-clip-text text-transparent">
        TrueSpend
      </span>
    </div>
  );
};
