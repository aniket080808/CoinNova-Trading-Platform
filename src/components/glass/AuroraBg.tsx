export const AuroraBg = () => (
  <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    <div className="absolute -top-40 -left-40 w-[40rem] h-[40rem] rounded-full bg-primary/20 blur-3xl animate-float" />
    <div className="absolute top-1/3 -right-32 w-[36rem] h-[36rem] rounded-full bg-secondary/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />
    <div className="absolute bottom-0 left-1/4 w-[30rem] h-[30rem] rounded-full bg-accent/15 blur-3xl animate-float" style={{ animationDelay: "4s" }} />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background))_85%)]" />
    <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  </div>
);
