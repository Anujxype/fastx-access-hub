import type { ComponentType } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

type Tone = "primary" | "accent";

type PanelAccessCardProps = {
  tone: Tone;
  label: string;
  placeholder: string;
  value: string;
  loading: boolean;
  error?: string;
  onBack: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
  LabelIcon: ComponentType<{ className?: string }>;
  ButtonIcon: ComponentType<{ className?: string }>;
  buttonTextIdle: string;
  buttonTextLoading: string;
};

const toneToLabelClass: Record<Tone, string> = {
  primary: "text-primary",
  accent: "text-accent",
};

const toneToInputClass: Record<Tone, string> = {
  primary: "input-glass",
  accent: "input-admin",
};

const toneToButtonClass: Record<Tone, string> = {
  primary: "btn-primary",
  accent: "btn-admin",
};

const PanelAccessCard = ({
  tone,
  label,
  placeholder,
  value,
  loading,
  error,
  onBack,
  onChange,
  onSubmit,
  LabelIcon,
  ButtonIcon,
  buttonTextIdle,
  buttonTextLoading,
}: PanelAccessCardProps) => {
  return (
    <div className="glass-strong p-8 space-y-6 animate-in-delay-1 shimmer-overlay">
      <button
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1.5 transition-all"
      >
        ← Back
      </button>

      <div>
        <label className={`flex items-center gap-2 text-[11px] font-semibold mb-3 tracking-[0.2em] ${toneToLabelClass[tone]}`}>
          <LabelIcon className="w-4 h-4" /> {label}
        </label>
        <input
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder={placeholder}
          className={`${toneToInputClass[tone]} w-full text-sm`}
          autoFocus
        />
      </div>

      {error && (
        <div className="flex items-center gap-2.5 text-destructive text-sm p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 animate-in">
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={loading}
        className={`${toneToButtonClass[tone]} w-full flex items-center justify-center gap-3 text-sm font-bold py-3.5`}
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ButtonIcon className="w-5 h-5" />}
        {loading ? buttonTextLoading : buttonTextIdle}
        {!loading && <ArrowRight className="w-4 h-4" />}
      </button>
    </div>
  );
};

export default PanelAccessCard;
