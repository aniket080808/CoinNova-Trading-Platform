import { Coins } from "lucide-react";
import { Link } from "react-router-dom";

export const Logo = ({ className = "", onClick }: { className?: string; onClick?: () => void }) => {
  const content = (
    <>
      <div className="relative">
        <div className="absolute inset-0 bg-primary/40 blur-md rounded-full group-hover:bg-primary/60 transition" />
        <div className="relative w-9 h-9 rounded-xl bg-gradient-neon flex items-center justify-center shadow-glow-primary">
          <Coins className="w-5 h-5 text-background" strokeWidth={2.5} />
        </div>
      </div>
      <div className="font-display font-bold text-xl tracking-tight">
        Coin<span className="text-gradient">Nova</span>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className={`flex items-center gap-2 group ${className}`}>
        {content}
      </button>
    );
  }

  return (
    <Link to="/" className={`flex items-center gap-2 group ${className}`}>
      {content}
    </Link>
  );
};
