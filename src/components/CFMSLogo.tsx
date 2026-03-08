import logoImg from '@/assets/logo.jpg';

const CFMSLogo = ({ size = 48, className = "" }: { size?: number; className?: string }) => {
  return (
    <img 
      src={logoImg} 
      alt="CFMS Logo" 
      width={size} 
      height={size} 
      className={`rounded-xl object-cover ${className}`}
    />
  );
};

export default CFMSLogo;
