const FastXLogo = ({ size = 48, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="48" height="48" rx="12" fill="hsl(160 84% 39% / 0.12)" stroke="hsl(160 84% 39% / 0.3)" strokeWidth="1"/>
    <path d="M12 16h20M12 24h14M12 32h8" stroke="hsl(160 84% 39%)" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M30 20l6 4-6 4" stroke="hsl(160 84% 39%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default FastXLogo;
