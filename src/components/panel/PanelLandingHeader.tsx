import CFMSLogo from "@/components/CFMSLogo";
import { Sparkles } from "lucide-react";

type PanelLandingHeaderProps = {
  title?: string;
};

const PanelLandingHeader = ({ title }: PanelLandingHeaderProps) => {
  return (
    <div className="flex flex-col items-center mb-10 animate-in">
      <div className="relative mb-6 animate-float">
        <div className="absolute -inset-4 rounded-2xl bg-primary/15 blur-2xl" />
        <CFMSLogo size={80} />
      </div>
      <h1 className="text-3xl font-black">{title}</h1>
      <div className="flex items-center gap-3 mt-3">
        <div className="h-px w-8 bg-gradient-to-r from-transparent to-primary/40" />
        <p className="text-muted-foreground text-[11px] tracking-[0.3em] flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse-soft" />
          SECURE ACCESS
          <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse-soft" />
        </p>
        <div className="h-px w-8 bg-gradient-to-l from-transparent to-primary/40" />
      </div>
    </div>
  );
};

export default PanelLandingHeader;
