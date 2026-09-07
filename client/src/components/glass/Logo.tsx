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
      <linearGradient id="logo-bg-exact" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00df8f" />
        <stop offset="35%" stopColor="#00c9a7" />
        <stop offset="70%" stopColor="#0ea5e9" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
      <filter id="logo-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.3" />
      </filter>
    </defs>
    {/* Outer Rounded Container */}
    <rect width="100" height="100" rx="26" fill="url(#logo-bg-exact)" />
    <rect x="1.5" y="1.5" width="97" height="97" rx="24.5" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" fill="none" />

    {/* Orbital C Arc with Node */}
    <path
      d="M 52 22 A 28 28 0 1 0 78 50"
      stroke="#ffffff"
      strokeWidth="6.8"
      strokeLinecap="round"
      fill="none"
      filter="url(#logo-shadow)"
    />
    <circle cx="78" cy="50" r="4.8" fill="#ffffff" filter="url(#logo-shadow)" />

    {/* Central Symmetrical Nova 4-Point Star */}
    <path
      d="M 50 23 Q 50 43 77 50 Q 50 57 50 77 Q 50 57 23 50 Q 50 43 50 23 Z"
      fill="#ffffff"
      filter="url(#logo-shadow)"
    />

    {/* Core Aperture & Radiant Center Dot */}
    <circle cx="50" cy="50" r="4.5" fill="#040d1a" />
    <circle cx="50" cy="50" r="2.2" fill="#00df8f" />
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
        <div className="absolute inset-0 bg-primary/25 blur-lg rounded-2xl opacity-60 group-hover:opacity-100 transition duration-300" />
        <CoinNovaIcon className={cn("relative shadow-glow-primary", iconSizes[size])} />
      </div>
      {showText && (
        <div className={cn("font-display font-extrabold tracking-tight leading-none text-foreground", textSizes[size])}>
          <span>Coin</span>
          <span className="font-bold">Nova</span>
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
