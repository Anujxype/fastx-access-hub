import { useState, useEffect } from 'react';
import { supabase, type Broadcast } from '@/lib/supabase';
import { Bell, X } from 'lucide-react';

interface AlertBannerProps {
  panelId: string;
}

const AlertBanner = ({ panelId }: AlertBannerProps) => {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Fetch existing broadcasts for this panel (or global)
    const fetchBroadcasts = async () => {
      const { data } = await supabase
        .from('broadcasts')
        .select('*')
        .or(`target_panel_id.eq.${panelId},target_panel_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(5);
      setBroadcasts(data || []);
    };
    fetchBroadcasts();

    // Subscribe to new broadcasts
    const channel = supabase
      .channel(`broadcasts-${panelId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'broadcasts',
      }, (payload) => {
        const newBroadcast = payload.new as Broadcast;
        if (!newBroadcast.target_panel_id || newBroadcast.target_panel_id === panelId) {
          setBroadcasts(prev => [newBroadcast, ...prev].slice(0, 5));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [panelId]);

  // Load dismissed from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`cfms_dismissed_${panelId}`);
    if (stored) setDismissed(new Set(JSON.parse(stored)));
  }, [panelId]);

  const dismiss = (id: string) => {
    const newDismissed = new Set(dismissed);
    newDismissed.add(id);
    setDismissed(newDismissed);
    localStorage.setItem(`cfms_dismissed_${panelId}`, JSON.stringify([...newDismissed]));
  };

  const visible = broadcasts.filter(b => !dismissed.has(b.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-1">
      {visible.map(b => (
        <div key={b.id} className="flex items-center gap-3 px-4 py-2.5 text-sm animate-in" style={{
          background: 'linear-gradient(90deg, hsl(38 92% 50% / 0.15), hsl(38 92% 50% / 0.05))',
          borderBottom: '1px solid hsl(38 92% 50% / 0.2)',
        }}>
          <Bell className="w-4 h-4 text-accent flex-shrink-0 animate-pulse-soft" />
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-accent">{b.title}: </span>
            <span className="text-foreground/80">{b.message}</span>
          </div>
          <button onClick={() => dismiss(b.id)} className="p-1 hover:bg-secondary/50 rounded transition-colors flex-shrink-0">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default AlertBanner;
