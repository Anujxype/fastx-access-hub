const FastXLogo = ({ size = 48, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="logoBg" x1="0" y1="0" x2="48" y2="48">
        <stop offset="0%" stopColor="hsl(160 84% 39% / 0.15)" />
        <stop offset="100%" stopColor="hsl(160 84% 39% / 0.05)" />
      </linearGradient>
      <linearGradient id="logoStroke" x1="0" y1="0" x2="48" y2="48">
        <stop offset="0%" stopColor="hsl(160 84% 50%)" />
        <stop offset="100%" stopColor="hsl(160 84% 35%)" />
      </linearGradient>
    </defs>
    <rect width="48" height="48" rx="14" fill="url(#logoBg)" stroke="hsl(160 84% 39% / 0.25)" strokeWidth="1"/>
    <path d="M12 16h20M12 24h14M12 32h8" stroke="url(#logoStroke)" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M30 20l6 4-6 4" stroke="url(#logoStroke)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default FastXLogo;
