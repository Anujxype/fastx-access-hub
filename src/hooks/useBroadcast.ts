/**
 * useBroadcast — shared hook for fetching the latest broadcast for a panel
 * (or null for the global portal).
 *
 * Deduplicates using cfms_last_broadcast in localStorage so the same
 * announcement is never shown twice per device.
 *
 * Used by Portal.tsx and any future page that needs a one-shot broadcast.
 * For persistent, polling broadcast banners use AlertBanner instead.
 */
import { useState, useEffect } from 'react';
import { supabase, type Broadcast } from '@/lib/supabase';

export function useBroadcast(panelId: string | null): Broadcast | null {
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .rpc('get_latest_broadcast', { p_panel_id: panelId })
      .then(({ data }) => {
        if (cancelled) return;
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) return;
        const lastSeen = localStorage.getItem('cfms_last_broadcast');
        if (lastSeen !== row.id) {
          setBroadcast(row as Broadcast);
          localStorage.setItem('cfms_last_broadcast', row.id);
        }
      })
      .catch(() => { /* non-critical — network error, silently ignore */ });
    return () => { cancelled = true; };
  }, [panelId]);

  return broadcast;
}
