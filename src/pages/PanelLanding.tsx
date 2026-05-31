import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Key, Loader2, Lock, Shield, ShieldOff, WifiOff, Zap } from "lucide-react";

import { supabase, fetchAllEndpoints } from "@/lib/supabase";
import { fbGetPanelBySlug, fbValidateKey, logFallbackEvent } from "@/lib/firebase";
import { usePanelLanding } from "@/hooks/usePanelLanding";
import PanelLandingScaffold from "@/components/panel/PanelLandingScaffold";
import PanelLandingHeader from "@/components/panel/PanelLandingHeader";
import PanelModeChoose from "@/components/panel/PanelModeChoose";
import PanelAccessCard from "@/components/panel/PanelAccessCard";
import PanelDisabledCard from "@/components/panel/PanelDisabledCard";

const PanelLanding = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { panel, loading, notFound, timedOut, disabled, redirectTo, slowNetwork } = usePanelLanding(slug);

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

    // Race Firebase key lookup + Supabase RPC simultaneously.
    // Firebase (Firestore) is always warm ~200ms; Supabase may cold-start.
    // Whoever resolves first with a valid result wins.
    let done = false;

    const finish = (
      keyValue: string, name: string, id: string, panelId: string
    ) => {
      if (done) return;
      done = true;
      localStorage.setItem(`cfms_portal_${panelId}`, "true");
      localStorage.setItem("cfms_key", keyValue);
      localStorage.setItem("cfms_key_name", name);
      localStorage.setItem("cfms_key_id", id);
      localStorage.setItem("cfms_panel_id", panelId);
      navigate(`/${slug}/portal`);
    };

    // Firebase path — validates in-memory mirror, instant on warm Firestore
    const fbPromise = fbValidateKey(key.trim()).then(fbRow => {
      if (done || !fbRow) return;
      // Verify key belongs to this panel
      if (fbRow.panel_id && fbRow.panel_id !== panel.id) return;
      logFallbackEvent(`portal-login:${slug}`, 'Firebase validated key');
      finish(fbRow.key_value, fbRow.name, fbRow.id, fbRow.panel_id ?? panel.id);
    }).catch(() => {});

    // Supabase RPC path — authoritative, atomically increments uses
    const rpcPromise = supabase.rpc("validate_panel_access_key", {
      p_key: key.trim(),
      p_panel_id: panel.id,
    }).then(({ data, error: dbError }) => {
      if (done) return;
      if (dbError) throw dbError;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        if (!done) { done = true; setError("Invalid, inactive, or expired access key"); setLoginLoading(false); }
        return;
      }
      finish(row.key_value, row.name, row.id, panel.id);
    });

    try {
      await Promise.race([fbPromise, rpcPromise]);
      // If Firebase won the race, Supabase RPC is still running in background — let it finish for the use-count increment
      if (done) await rpcPromise.catch(() => {}); // fire-and-forget increment, ignore errors
    } catch (err: unknown) {
      if (!done) setError(err instanceof Error ? err.message : "Connection error");
    } finally {
      if (!done) setLoginLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    if (!password || !panel) return;

    setLoginLoading(true);
    setError("");

    // Fast path: panel object was already loaded from Firebase or cache — password is in hand.
    // Zero network calls, instant authentication.
    if (panel.panel_password) {
      if (password === panel.panel_password) {
        localStorage.setItem(`cfms_panel_${panel.id}`, "true");
        localStorage.setItem(`cfms_panel_pwd_${panel.id}`, password);
        navigate(`/${slug}/admin`);
      } else {
        setError("Invalid panel password");
        setLoginLoading(false);
      }
      return;
    }

    // Slow path: panel_password not in loaded panel (Supabase anon RLS stripped it).
    // Race Firebase (warm, ~200ms) + Supabase RPC simultaneously.
    let done = false;

    const fbPath = fbGetPanelBySlug(slug?.toLowerCase() ?? '').then(cached => {
      if (done) return;
      const pw = cached?.panel_password;
      if (!pw) return; // no password in Firebase either, let Supabase win
      done = true;
      if (password === pw) {
        logFallbackEvent(`admin-login:${slug}`, 'Firebase verified panel password');
        localStorage.setItem(`cfms_panel_${panel.id}`, "true");
        localStorage.setItem(`cfms_panel_pwd_${panel.id}`, password);
        navigate(`/${slug}/admin`);
      } else {
        setError("Invalid panel password");
        setLoginLoading(false);
      }
    }).catch(() => {});

    const rpcPath = supabase.rpc("verify_panel_password", {
      p_panel_id: panel.id,
      p_password: password,
    }).then(({ data, error: rpcErr }) => {
      if (done) return;
      if (rpcErr) throw rpcErr;
      done = true;
      if (data === true) {
        localStorage.setItem(`cfms_panel_${panel.id}`, "true");
        localStorage.setItem(`cfms_panel_pwd_${panel.id}`, password);
        navigate(`/${slug}/admin`);
      } else {
        setError("Invalid panel password");
        setLoginLoading(false);
      }
    });

    try {
      await Promise.race([fbPath, rpcPath]);
      if (done) await rpcPath.catch(() => {}); // let Supabase finish in background
    } catch (err: unknown) {
      if (!done) { setError(err instanceof Error ? err.message : "Connection error"); setLoginLoading(false); }
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

  if (timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <WifiOff className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="text-2xl font-black mb-2">Connection Timeout</h1>
          <p className="text-muted-foreground text-sm mb-6">Could not reach the server. Please check your connection and try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
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
