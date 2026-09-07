import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export const CoinNovaIcon = ({ className = "w-9 h-9" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="50%" stopColor="#06b6d4" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
      <linearGradient id="logo-white" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#e0e7ff" />
      </linearGradient>
    </defs>
    {/* Outer Rounded Container */}
    <rect width="100" height="100" rx="24" fill="url(#logo-bg)" />
    <rect x="2" y="2" width="96" height="96" rx="22" stroke="rgba(255,255,255,0.25)" strokeWidth="2" fill="none" />

    {/* Orbital Arc */}
    <path
      d="M 50 18 A 32 32 0 1 0 82 50"
      stroke="url(#logo-white)"
      strokeWidth="6.5"
      strokeLinecap="round"
      fill="none"
      opacity="0.95"
    />
    <circle cx="82" cy="50" r="4.5" fill="#ffffff" />

    {/* Central Nova Starburst */}
    <path
      d="M 50 28 L 54.5 44 L 70 47 L 55.5 53.5 L 50 72 L 44.5 53.5 L 29 47 L 44.5 44 Z"
      fill="url(#logo-white)"
    />

    {/* Nova Core */}
    <circle cx="50" cy="48.5" r="3.5" fill="#090d16" />
    <circle cx="50" cy="48.5" r="2" fill="#10b981" />
  </svg>
);

export const Logo = ({
  className = "",
  size = "md",
  showText = true,
  onClick,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  onClick?: () => void;
}) => {
  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-11 h-11",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  const content = (
    <>
      <div className="relative group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
        <div className="absolute inset-0 bg-primary/30 blur-lg rounded-xl opacity-70 group-hover:opacity-100 group-hover:bg-primary/50 transition duration-300" />
        <CoinNovaIcon className={cn("relative shadow-glow-primary", iconSizes[size])} />
      </div>
      {showText && (
        <div className={cn("font-display font-black tracking-tight leading-none", textSizes[size])}>
          <span className="text-foreground">Coin</span>
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-violet-400 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            Nova
          </span>
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn("flex items-center gap-2.5 group cursor-pointer select-none text-left", className)}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      to="/"
      className={cn("flex items-center gap-2.5 group select-none", className)}
    >
      {content}
    </Link>
  );
};
