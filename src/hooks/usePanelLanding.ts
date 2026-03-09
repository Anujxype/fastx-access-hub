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

    const fetchPanel = async () => {
      setLoading(true);
      setNotFound(false);
      setDisabled(false);
      setRedirectTo(null);

      const slugLower = slug.toLowerCase();

      const { data, error } = await supabase
        .from("managed_panels")
        .select("*")
        .eq("slug", slugLower)
        .single();

      if (cancelled) return;

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPanel(data);

      const expired = data.expiry_date && new Date(data.expiry_date) < new Date();
      const isDisabled = !data.is_active || Boolean(expired);
      setDisabled(isDisabled);

      // If the panel is disabled/expired, do NOT allow stored sessions to redirect past this page.
      if (isDisabled) {
        clearPanelSessions(data.id);
        setLoading(false);
        return;
      }

      // Check existing sessions
      try {
        const storedPortal = localStorage.getItem(`cfms_portal_${data.id}`);
        if (storedPortal === "true") {
          setRedirectTo(`/${slugLower}/portal`);
          setLoading(false);
          return;
        }

        const storedAdmin = localStorage.getItem(`cfms_panel_${data.id}`);
        if (storedAdmin === "true") {
          setRedirectTo(`/${slugLower}/admin`);
          setLoading(false);
          return;
        }
      } catch {
        // ignore storage errors
      }

      setLoading(false);
    };

    fetchPanel();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { panel, loading, notFound, disabled, redirectTo };
};
