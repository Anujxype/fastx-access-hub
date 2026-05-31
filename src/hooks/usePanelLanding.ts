import { useEffect, useState } from "react";
import { supabase, type ManagedPanel } from "@/lib/supabase";
import { fbGetPanelBySlug, logFallbackEvent } from "@/lib/firebase";

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

// ── Panel row cache (sessionStorage 2-min + localStorage 10-min TTL) ─────────
// sessionStorage: fast, per-tab. localStorage: survives new tabs/PC browser reopen.
const PANEL_CACHE_TTL_SESSION = 2 * 60 * 1000;   // 2 min
const PANEL_CACHE_TTL_LOCAL   = 10 * 60 * 1000;  // 10 min

export const getCachedRow = (slug: string): ManagedPanel | null => {
  const key = `cfms_pc_${slug}`;
  // 1. Try sessionStorage first (freshest, per-tab)
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const { row, ts }: { row: ManagedPanel; ts: number } = JSON.parse(raw);
      if (Date.now() - ts <= PANEL_CACHE_TTL_SESSION) return row;
      sessionStorage.removeItem(key);
    }
  } catch { /* ignore */ }
  // 2. Fall back to localStorage (persists across tabs and PC browser sessions)
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const { row, ts }: { row: ManagedPanel; ts: number } = JSON.parse(raw);
      if (Date.now() - ts <= PANEL_CACHE_TTL_LOCAL) return row;
      localStorage.removeItem(key);
    }
  } catch { /* ignore */ }
  return null;
};

export const setCachedRow = (slug: string, row: ManagedPanel) => {
  const payload = JSON.stringify({ row, ts: Date.now() });
  const key = `cfms_pc_${slug}`;
  try { sessionStorage.setItem(key, payload); } catch { /* ignore */ }
  try { localStorage.setItem(key, payload); } catch { /* ignore */ }
};

export const invalidateCache = (slug: string) => {
  const key = `cfms_pc_${slug}`;
  try { sessionStorage.removeItem(key); } catch { /* ignore */ }
  try { localStorage.removeItem(key); } catch { /* ignore */ }
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
      // Reset any error states — Firebase may resolve after Supabase returned 404/timeout.
      setNotFound(false);
      setTimedOut(false);
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

    // Race Supabase against Firebase.
    // Strategy: start the Supabase RPC immediately. If it hasn't resolved in
    // FIREBASE_RACE_DELAY_MS, also fire a Firebase fetch. Whichever resolves
    // first (with a valid row) wins — the other result is discarded.
    // This means on Supabase cold-starts (5-15 s) users get the Firebase result
    // in ~5-6 s instead of waiting 20+ s through retry cycles.
    const FIREBASE_RACE_DELAY_MS = 5_000;

    const fetchWithRace = async (): Promise<void> => {
      let resolved = false;

      const resolveRow = (row: ManagedPanel, source: 'supabase' | 'firebase') => {
        if (resolved || cancelled) return;
        resolved = true;
        if (source === 'firebase') {
          // Log the fallback so admins can track how often Supabase cold starts are bypassed
          logFallbackEvent(`panel:${slugLower}`, 'Firebase served panel before Supabase');
          setCachedRow(slugLower, row);
        } else {
          setCachedRow(slugLower, row);
        }
        clearTimeout(timeout);
        clearTimeout(slowTimer);
        applyRow(row);
      };

      // ── Supabase path ──────────────────────────────────────────────────────
      const supabasePromise = (async () => {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const { data, error } = await supabase.rpc('get_panel_by_slug', { p_slug: slugLower });
            if (cancelled || resolved) return;
            if (error) {
              if (attempt < 1) { await new Promise(r => setTimeout(r, 1500)); continue; }
              return; // let firebase win
            }
            const row = Array.isArray(data) ? data[0] : data;
            if (!row) {
              // Genuine 404 — only set notFound if Firebase also found nothing
              if (!resolved) {
                // Wait briefly for firebase in case it has the data
                await new Promise(r => setTimeout(r, 500));
                if (!resolved) {
                  clearTimeout(timeout); clearTimeout(slowTimer);
                  setNotFound(true); setLoading(false);
                }
              }
              return;
            }
            resolveRow(row as ManagedPanel, 'supabase');
            return;
          } catch {
            if (cancelled || resolved) return;
            if (attempt < 1) { await new Promise(r => setTimeout(r, 1500)); continue; }
          }
        }
      })();

      // ── Firebase path (starts after delay if Supabase hasn't responded) ───
      const firebasePromise = new Promise<void>(resolveFirebase => {
        setTimeout(async () => {
          if (resolved || cancelled) { resolveFirebase(); return; }
          try {
            const fbRow = await fbGetPanelBySlug(slugLower);
            if (cancelled || resolved) { resolveFirebase(); return; }
            if (fbRow) resolveRow(fbRow, 'firebase');
          } catch { /* ignore */ }
          resolveFirebase();
        }, FIREBASE_RACE_DELAY_MS);
      });

      await Promise.all([supabasePromise, firebasePromise]);

      // If neither source returned a row and nothing resolved yet
      if (!resolved && !cancelled) {
        clearTimeout(timeout); clearTimeout(slowTimer);
        setNotFound(true); setLoading(false);
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

      // No cache — fetch from DB, racing Supabase against Firebase.
      await fetchWithRace();
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
