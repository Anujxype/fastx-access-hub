import { ShieldOff } from "lucide-react";

type PanelDisabledCardProps = {
  panelName?: string;
};

const PanelDisabledCard = ({ panelName }: PanelDisabledCardProps) => {
  return (
    <div className="w-full max-w-md text-center relative z-10 animate-in">
      <div className="relative mx-auto w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full bg-destructive/15 blur-xl" />
        <div className="relative w-full h-full rounded-2xl bg-destructive/10 border-2 border-destructive/30 flex items-center justify-center">
          <ShieldOff className="w-10 h-10 text-destructive" />
        </div>
      </div>
      <h1 className="text-3xl font-black mb-2">Panel Disabled</h1>
      <p className="text-muted-foreground text-sm mb-4">{panelName || "This panel"} has been deactivated or expired.</p>
      <p className="text-xs text-muted-foreground">Contact your administrator for assistance.</p>
    </div>
  );
};

export default PanelDisabledCard;
