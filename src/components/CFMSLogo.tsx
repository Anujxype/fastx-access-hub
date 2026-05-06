import React from 'react';
import logoImg from '@/assets/logo.jpg';

const CFMSLogo = React.forwardRef<HTMLImageElement, { size?: number; className?: string }>(
  ({ size = 48, className = "" }, ref) => {
    return (
      <img
        ref={ref}
        src={logoImg}
        alt="DRMS Logo"
        width={size}
        height={size}
        className={`rounded-xl object-cover ${className}`}
      />
    );
  }
);

CFMSLogo.displayName = 'CFMSLogo';

export default CFMSLogo;
