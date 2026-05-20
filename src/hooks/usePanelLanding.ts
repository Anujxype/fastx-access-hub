import { useEffect, useState } from "react";
import { supabase, type ManagedPanel } from "@/lib/supabase";

type UsePanelLandingResult = {
  panel: ManagedPanel | null;
  loading: boolean;
  notFound: boolean;
  disabled: boolean;
  redirectTo: string | null;
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

const getCachedRow = (slug: string): ManagedPanel | null => {
  try {
    const raw = sessionStorage.getItem(`cfms_pc_${slug}`);
    if (!raw) return null;
    const { row, ts }: { row: ManagedPanel; ts: number } = JSON.parse(raw);
    if (Date.now() - ts > PANEL_CACHE_TTL) { sessionStorage.removeItem(`cfms_pc_${slug}`); return null; }
    return row;
  } catch { return null; }
};

const setCachedRow = (slug: string, row: ManagedPanel) => {
  try { sessionStorage.setItem(`cfms_pc_${slug}`, JSON.stringify({ row, ts: Date.now() })); } catch {}
};

const invalidateCache = (slug: string) => {
  try { sessionStorage.removeItem(`cfms_pc_${slug}`); } catch {}
};
// ─────────────────────────────────────────────────────────────────────────────

export const usePanelLanding = (slug: string | undefined): UsePanelLandingResult => {
  const [panel, setPanel] = useState<ManagedPanel | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const slugLower = slug.toLowerCase();

    // Safety valve: if the DB never responds, unblock the UI after 8 s.
    const timeout = setTimeout(() => {
      if (!cancelled) { setNotFound(true); setLoading(false); }
    }, 8000);

    // Apply a fetched/cached row to state and resolve loading.
    const applyRow = (row: ManagedPanel) => {
      if (cancelled) return;
      setPanel(row);
      const expired = row.expiry_date && new Date(row.expiry_date) < new Date();
      const isDisabled = !row.is_active || Boolean(expired);
      setDisabled(isDisabled);

      if (isDisabled) {
        invalidateCache(slugLower);
        clearPanelSessions(row.id);
        clearTimeout(timeout);
        setLoading(false);
        return;
      }

      try {
        const storedPortal = localStorage.getItem(`cfms_portal_${row.id}`);
        if (storedPortal === "true") {
          clearTimeout(timeout);
          setRedirectTo(`/${slugLower}/portal`);
          setLoading(false);
          return;
        }
        const storedAdmin = localStorage.getItem(`cfms_panel_${row.id}`);
        if (storedAdmin === "true") {
          clearTimeout(timeout);
          setRedirectTo(`/${slugLower}/admin`);
          setLoading(false);
          return;
        }
      } catch { /* ignore storage errors */ }

      clearTimeout(timeout);
      setLoading(false);
    };

    const fetchPanel = async () => {
      setLoading(true);
      setNotFound(false);
      setDisabled(false);
      setRedirectTo(null);

      // Serve from cache immediately so the UI is instant on repeat visits.
      const cached = getCachedRow(slugLower);
      if (cached) {
        applyRow(cached);
        // Refresh in background so kill-switch changes propagate silently.
        supabase.rpc("get_panel_by_slug", { p_slug: slugLower }).then(({ data }) => {
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
        }).catch(() => {});
        return;
      }

      // No cache — fetch from DB and block until done.
      try {
        const { data, error } = await supabase.rpc("get_panel_by_slug", { p_slug: slugLower });
        if (cancelled) return;
        const row = Array.isArray(data) ? data[0] : data;
        if (error || !row) {
          clearTimeout(timeout);
          setNotFound(true);
          setLoading(false);
          return;
        }
        setCachedRow(slugLower, row as ManagedPanel);
        applyRow(row as ManagedPanel);
      } catch {
        if (!cancelled) { clearTimeout(timeout); setNotFound(true); setLoading(false); }
      }
    };

    fetchPanel();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [slug]);

  return { panel, loading, notFound, disabled, redirectTo };
};
