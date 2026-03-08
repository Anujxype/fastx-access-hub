import { useState, useEffect } from 'react';
import { supabase, type Broadcast } from '@/lib/supabase';
import { Bell, X, Megaphone } from 'lucide-react';

interface AlertBannerProps {
  panelId: string;
}

const AlertBanner = ({ panelId }: AlertBannerProps) => {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
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
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'broadcasts',
      }, (payload) => {
        setBroadcasts(prev => prev.filter(b => b.id !== (payload.old as any).id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [panelId]);

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
    <div className="space-y-0">
      {visible.map((b, i) => (
        <div
          key={b.id}
          className="flex items-center gap-3 px-4 py-3 text-sm border-b border-primary/10 animate-in"
          style={{
            background: i === 0
              ? 'linear-gradient(90deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.04))'
              : 'linear-gradient(90deg, hsl(var(--primary) / 0.06), transparent)',
          }}
        >
          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-bold text-primary text-xs tracking-wide">{b.title}</span>
            <span className="mx-2 text-muted-foreground/30">•</span>
            <span className="text-foreground/70 text-xs">{b.message}</span>
          </div>
          <button
            onClick={() => dismiss(b.id)}
            className="p-1.5 hover:bg-secondary/50 rounded-lg transition-colors flex-shrink-0 group"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default AlertBanner;
