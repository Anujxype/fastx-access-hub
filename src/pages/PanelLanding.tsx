import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Key, Loader2, Lock, Shield, ShieldOff, Zap } from "lucide-react";

import { supabase, fetchAllEndpoints } from "@/lib/supabase";
import { usePanelLanding } from "@/hooks/usePanelLanding";
import PanelLandingScaffold from "@/components/panel/PanelLandingScaffold";
import PanelLandingHeader from "@/components/panel/PanelLandingHeader";
import PanelModeChoose from "@/components/panel/PanelModeChoose";
import PanelAccessCard from "@/components/panel/PanelAccessCard";
import PanelDisabledCard from "@/components/panel/PanelDisabledCard";

const PanelLanding = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { panel, loading, notFound, disabled, redirectTo, slowNetwork } = usePanelLanding(slug);

  // Portal login state
  const [mode, setMode] = useState<"choose" | "portal" | "admin">("choose");
  const [key, setKey] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (redirectTo) navigate(redirectTo);
  }, [redirectTo, navigate]);

  // Pre-warm endpoint cache once the panel is loaded so PanelPortal renders instantly after login.
  useEffect(() => {
    if (!loading && panel) void fetchAllEndpoints();
  }, [loading, panel]);

  const handlePortalLogin = async () => {
    if (!key.trim() || !panel) return;

    setLoginLoading(true);
    setError("");

    try {
      // RPC validates + atomically increments uses, scoped to this panel
      const { data, error: dbError } = await supabase.rpc("validate_panel_access_key", {
        p_key: key.trim(),
        p_panel_id: panel.id,
      });
      if (dbError) throw dbError;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        setError("Invalid, inactive, or expired access key");
        setLoginLoading(false);
        return;
      }

      localStorage.setItem(`cfms_portal_${panel.id}`, "true");
      localStorage.setItem("cfms_key", row.key_value);
      localStorage.setItem("cfms_key_name", row.name);
      localStorage.setItem("cfms_key_id", row.id);
      localStorage.setItem("cfms_panel_id", panel.id);

      navigate(`/${slug}/portal`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Connection error");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    if (!password || !panel) return;

    setLoginLoading(true);
    setError("");

    try {
      // Server-side verification — panel_password is no longer exposed to anon
      const { data, error: rpcErr } = await supabase.rpc("verify_panel_password", {
        p_panel_id: panel.id,
        p_password: password,
      });
      if (rpcErr) throw rpcErr;
      if (data === true) {
        localStorage.setItem(`cfms_panel_${panel.id}`, "true");
        // adminApi helper reads this to call panel_admin_* RPCs server-side
        localStorage.setItem(`cfms_panel_pwd_${panel.id}`, password);
        navigate(`/${slug}/admin`);
      } else {
        setError("Invalid panel password");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Connection error");
    } finally {
      setLoginLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          {slowNetwork && (
            <p className="text-xs text-muted-foreground animate-pulse">
              Slow connection detected — please wait…
            </p>
          )}
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <ShieldOff className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="text-2xl font-black mb-2">Panel Not Found</h1>
          <p className="text-muted-foreground text-sm">The panel "{slug}" does not exist.</p>
        </div>
      </div>
    );
  }

  if (disabled) {
    return (
      <PanelLandingScaffold variant="disabled">
        <PanelDisabledCard panelName={panel?.panel_name} />
      </PanelLandingScaffold>
    );
  }

  return (
    <PanelLandingScaffold>
      <div className="w-full max-w-md relative z-10">
        <PanelLandingHeader title={panel?.panel_name} />

        {mode === "choose" && <PanelModeChoose onChoose={(m) => setMode(m)} />}

        {mode === "portal" && (
          <PanelAccessCard
            tone="primary"
            label="ACCESS KEY"
            placeholder="Enter your access key"
            value={key}
            loading={loginLoading}
            error={error}
            onBack={() => {
              setMode("choose");
              setError("");
              setKey("");
            }}
            onChange={setKey}
            onSubmit={handlePortalLogin}
            LabelIcon={Key}
            ButtonIcon={Zap}
            buttonTextIdle="Access Portal"
            buttonTextLoading="Verifying..."
          />
        )}

        {mode === "admin" && (
          <PanelAccessCard
            tone="accent"
            label="PANEL PASSWORD"
            placeholder="Enter panel password"
            value={password}
            loading={loginLoading}
            error={error}
            onBack={() => {
              setMode("choose");
              setError("");
              setPassword("");
            }}
            onChange={setPassword}
            onSubmit={handleAdminLogin}
            LabelIcon={Lock}
            ButtonIcon={Shield}
            buttonTextIdle="Access Admin"
            buttonTextLoading="Authenticating..."
          />
        )}

        <div className="flex items-center justify-center gap-6 mt-8 animate-in-delay-3">
          <div className="flex items-center gap-1.5 text-muted-foreground/30 text-[10px]">
            <div className="w-1 h-1 rounded-full bg-success animate-pulse" />
            <span>ENCRYPTED</span>
          </div>
          <div className="h-3 w-px bg-muted-foreground/10" />
          <p className="text-muted-foreground/30 text-[10px] tracking-[0.15em]">DRMS PROTOCOL</p>
        </div>
      </div>
    </PanelLandingScaffold>
  );
};

export default PanelLanding;
