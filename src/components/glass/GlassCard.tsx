import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

export const GlassCard = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { glow?: boolean; hover?: boolean }>(
  ({ className, glow, hover, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "glass-strong rounded-2xl p-6 relative overflow-hidden",
        glow && "shadow-glow-primary",
        hover && "glow-hover transition-all duration-300",
        className
      )}
      {...props}
    />
  )
);
GlassCard.displayName = "GlassCard";
