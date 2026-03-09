import { ArrowRight, Key, Shield } from "lucide-react";

type PanelModeChooseProps = {
  onChoose: (mode: "portal" | "admin") => void;
};

const PanelModeChoose = ({ onChoose }: PanelModeChooseProps) => {
  return (
    <div className="space-y-4 animate-in-delay-1">
      <button
        onClick={() => onChoose("portal")}
        className="glass-strong w-full p-6 text-left group hover:border-primary/30 transition-all duration-300 shimmer-overlay"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all">
            <Key className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">Portal Access</h3>
            <p className="text-xs text-muted-foreground">Login with your API key to access endpoints</p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </button>

      <button
        onClick={() => onChoose("admin")}
        className="glass-strong w-full p-6 text-left group hover:border-accent/30 transition-all duration-300 shimmer-overlay"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-all">
            <Shield className="w-7 h-7 text-accent" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">Admin Panel</h3>
            <p className="text-xs text-muted-foreground">Manage keys, logs, and analytics</p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
        </div>
      </button>
    </div>
  );
};

export default PanelModeChoose;
