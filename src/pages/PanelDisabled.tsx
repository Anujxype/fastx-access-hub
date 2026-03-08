import { useNavigate } from 'react-router-dom';
import CFMSLogo from '@/components/CFMSLogo';
import { ShieldOff, ArrowLeft, Mail } from 'lucide-react';

const PanelDisabled = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 dot-grid opacity-10" />
      <div className="absolute top-1/3 left-1/4 w-80 h-80 rounded-full bg-destructive/5 blur-[120px]" />

      <div className="w-full max-w-md text-center relative z-10 animate-in">
        <div className="relative mx-auto w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-full bg-destructive/15 blur-xl" />
          <div className="relative w-full h-full rounded-2xl bg-destructive/10 border-2 border-destructive/30 flex items-center justify-center">
            <ShieldOff className="w-10 h-10 text-destructive" />
          </div>
        </div>

        <h1 className="text-3xl font-black mb-2">Panel Disabled</h1>
        <p className="text-muted-foreground text-sm mb-8">
          This panel has been deactivated or your license has expired.<br />
          Please contact the Master Administrator for assistance.
        </p>

        <div className="glass p-5 space-y-3 mb-6">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="w-4 h-4 text-accent" />
            <span className="text-muted-foreground">Contact: <strong className="text-foreground">admin@cfms.io</strong></span>
          </div>
        </div>

        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-muted-foreground hover:text-primary mx-auto transition-all group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default PanelDisabled;
