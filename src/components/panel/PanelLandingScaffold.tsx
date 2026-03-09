import type { PropsWithChildren } from "react";

type PanelLandingScaffoldProps = PropsWithChildren<{
  variant?: "default" | "disabled";
}>;

const PanelLandingScaffold = ({ variant = "default", children }: PanelLandingScaffoldProps) => {
  if (variant === "disabled") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-10" />
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 dot-grid opacity-30" />
      <div className="absolute top-1/4 -left-32 w-80 h-80 rounded-full bg-primary/5 blur-[120px] animate-float" />
      <div
        className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full bg-primary/8 blur-[120px] animate-float"
        style={{ animationDelay: "2s" }}
      />
      {children}
    </div>
  );
};

export default PanelLandingScaffold;
