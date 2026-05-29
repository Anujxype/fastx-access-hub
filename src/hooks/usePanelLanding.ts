import { useEffect, useState } from "react";
import { supabase, type ManagedPanel } from "@/lib/supabase";

type UsePanelLandingResult = {
  panel: ManagedPanel | null;
  loading: boolean;
  notFound: boolean;
  timedOut: boolean;
  disabled: boolean;
  redirectTo: string | null;
  slowNetwork: boolean;
};

const clearPanelSessions = (panelId: string) => {
  try {
    localStorage.removeItem(`cfms_portal_${panelId}`);
    localStorage.removeItem(`cfms_panel_${panelId}`);
  } catch {
    // ignore storage errors
  }
};

// ── Panel row cache (sessionStorage, 2-min TTL) ──────────────────────────────
const PANEL_CACHE_TTL = 2 * 60 * 1000;

export const getCachedRow = (slug: string): ManagedPanel | null => {
  try {
    const raw = sessionStorage.getItem(`cfms_pc_${slug}`);
    if (!raw) return null;
    const { row, ts }: { row: ManagedPanel; ts: number } = JSON.parse(raw);
    if (Date.now() - ts > PANEL_CACHE_TTL) { sessionStorage.removeItem(`cfms_pc_${slug}`); return null; }
    return row;
  } catch { return null; }
};

export const setCachedRow = (slug: string, row: ManagedPanel) => {
  try { sessionStorage.setItem(`cfms_pc_${slug}`, JSON.stringify({ row, ts: Date.now() })); } catch {}
};

export const invalidateCache = (slug: string) => {
  try { sessionStorage.removeItem(`cfms_pc_${slug}`); } catch {}
};
// ─────────────────────────────────────────────────────────────────────────────

export const usePanelLanding = (slug: string | undefined): UsePanelLandingResult => {
  const [panel, setPanel] = useState<ManagedPanel | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const [slowNetwork, setSlowNetwork] = useState(false);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const slugLower = slug.toLowerCase();

    // Show "slow connection" hint after 3 s without a response.
    const slowTimer = setTimeout(() => {
      if (!cancelled) setSlowNetwork(true);
    }, 3000);

    // Hard safety valve: if the DB never responds in 25 s, show a retry screen
    // rather than the misleading "Panel Not Found" message.
    const timeout = setTimeout(() => {
      if (!cancelled) { setTimedOut(true); setLoading(false); }
    }, 25_000);

    // Apply a fetched/cached row to state and resolve loading.
    const applyRow = (row: ManagedPanel) => {
      if (cancelled) return;
      setSlowNetwork(false);
      setPanel(row);
      const expired = row.expiry_date && new Date(row.expiry_date) < new Date();
      const isDisabled = !row.is_active || Boolean(expired);
      setDisabled(isDisabled);

      if (isDisabled) {
        invalidateCache(slugLower);
        clearPanelSessions(row.id);
        clearTimeout(timeout);
        clearTimeout(slowTimer);
        setLoading(false);
        return;
      }

      try {
        const storedPortal = localStorage.getItem(`cfms_portal_${row.id}`);
        if (storedPortal === "true") {
          clearTimeout(timeout);
          clearTimeout(slowTimer);
          setRedirectTo(`/${slugLower}/portal`);
          setLoading(false);
          return;
        }
        const storedAdmin = localStorage.getItem(`cfms_panel_${row.id}`);
        if (storedAdmin === "true") {
          clearTimeout(timeout);
          clearTimeout(slowTimer);
          setRedirectTo(`/${slugLower}/admin`);
          setLoading(false);
          return;
        }
      } catch { /* ignore storage errors */ }

      clearTimeout(timeout);
      clearTimeout(slowTimer);
      setLoading(false);
    };

    // Attempt a single DB fetch with automatic retry on transient network errors
    // OR on Supabase error responses (e.g. RPC timeout, 5xx, RLS glitch).
    const fetchWithRetry = async (retriesLeft: number): Promise<void> => {
      try {
        const { data, error } = await supabase.rpc("get_panel_by_slug", { p_slug: slugLower });
        if (cancelled) return;
        const row = Array.isArray(data) ? data[0] : data;

        // Supabase returned an error object — treat it like a transient failure
        // and retry before giving up, just like we do for thrown exceptions.
        if (error) {
          if (retriesLeft > 0) {
            await new Promise(res => setTimeout(res, 1500 * (3 - retriesLeft)));
            return fetchWithRetry(retriesLeft - 1);
          }
          clearTimeout(timeout);
          clearTimeout(slowTimer);
          setNotFound(true);
          setLoading(false);
          return;
        }

        // No error but no row → the slug genuinely doesn't exist.
        if (!row) {
          clearTimeout(timeout);
          clearTimeout(slowTimer);
          setNotFound(true);
          setLoading(false);
          return;
        }

        setCachedRow(slugLower, row as ManagedPanel);
        applyRow(row as ManagedPanel);
      } catch {
        if (cancelled) return;
        if (retriesLeft > 0) {
          // Exponential back-off: 1.5 s → 3 s
          await new Promise(res => setTimeout(res, 1500 * (3 - retriesLeft)));
          return fetchWithRetry(retriesLeft - 1);
        }
        clearTimeout(timeout);
        clearTimeout(slowTimer);
        setNotFound(true);
        setLoading(false);
      }
    };

    const fetchPanel = async () => {
      setLoading(true);
      setNotFound(false);
      setTimedOut(false);
      setDisabled(false);
      setRedirectTo(null);
      setSlowNetwork(false);

      // Serve from cache immediately so the UI is instant on repeat visits.
      const cached = getCachedRow(slugLower);
      if (cached) {
        applyRow(cached);
        // Refresh in background so kill-switch changes propagate silently.
        void (async () => {
          try {
            const { data } = await supabase.rpc("get_panel_by_slug", { p_slug: slugLower });
            if (cancelled) return;
            const fresh = Array.isArray(data) ? data[0] : data;
            if (!fresh) return;
            setCachedRow(slugLower, fresh as ManagedPanel);
            // If panel was just disabled/expired, update UI immediately.
            const expired = fresh.expiry_date && new Date(fresh.expiry_date) < new Date();
            if (!fresh.is_active || Boolean(expired)) {
              invalidateCache(slugLower);
              clearPanelSessions(fresh.id);
              setPanel(fresh as ManagedPanel);
              setDisabled(true);
            }
          } catch {
            // keep the cached row active during low-network periods
          }
        })();
        return;
      }

      // No cache — fetch from DB with retry on transient errors.
      await fetchWithRetry(2);
    };

    fetchPanel();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      clearTimeout(slowTimer);
    };
  }, [slug]);

  return { panel, loading, notFound, timedOut, disabled, redirectTo, slowNetwork };
};
