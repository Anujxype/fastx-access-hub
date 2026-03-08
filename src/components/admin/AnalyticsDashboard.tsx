import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart3, Loader2 } from 'lucide-react';

interface Stats {
  totalQueries: number;
  successRate: number;
  uniqueUsers: number;
  locations: number;
  topEndpoints: { endpoint: string; count: number }[];
  successCount: number;
  errorCount: number;
}

const AnalyticsDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const { data: logs } = await supabase.from('api_logs').select('*');
      if (!logs) { setLoading(false); return; }

      const total = logs.length;
      const successes = logs.filter(l => l.status === 'success').length;
      const errors = total - successes;
      const uniqueUsers = new Set(logs.map(l => l.key_name)).size;
      const locations = new Set(logs.filter(l => l.location).map(l => l.location)).size;

      const endpointCounts: Record<string, number> = {};
      logs.forEach(l => { endpointCounts[l.endpoint] = (endpointCounts[l.endpoint] || 0) + 1; });
      const topEndpoints = Object.entries(endpointCounts)
        .map(([endpoint, count]) => ({ endpoint, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        totalQueries: total,
        successRate: total > 0 ? Math.round((successes / total) * 100) : 0,
        uniqueUsers,
        locations,
        topEndpoints,
        successCount: successes,
        errorCount: errors,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>;
  if (!stats) return <p className="text-muted-foreground text-center py-8">No data available</p>;

  const maxCount = Math.max(...stats.topEndpoints.map(e => e.count), 1);

  return (
    <div className="space-y-5 animate-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'TOTAL QUERIES', value: stats.totalQueries },
          { label: 'SUCCESS RATE', value: `${stats.successRate}%` },
          { label: 'UNIQUE USERS', value: stats.uniqueUsers },
          { label: 'LOCATIONS', value: stats.locations },
        ].map(s => (
          <div key={s.label} className="glass-admin p-4">
            <p className="text-xs text-muted-foreground font-semibold tracking-wider mb-1">{s.label}</p>
            <p className="stat-value">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Top Endpoints */}
      <div className="glass-admin p-5">
        <h3 className="font-bold flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-accent" />
          Top Endpoints
        </h3>
        <div className="space-y-3">
          {stats.topEndpoints.map(ep => (
            <div key={ep.endpoint} className="flex items-center gap-3">
              <span className="text-sm text-primary font-mono w-20 shrink-0">{ep.endpoint}</span>
              <div className="flex-1 h-5 bg-secondary/50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(ep.count / maxCount) * 100}%`,
                    background: 'linear-gradient(90deg, hsl(142 76% 36%), hsl(38 92% 50%))',
                  }}
                />
              </div>
              <span className="text-sm text-muted-foreground w-16 text-right">{ep.count} hits</span>
            </div>
          ))}
        </div>
      </div>

      {/* Success vs Errors */}
      <div className="glass-admin p-5">
        <h3 className="font-bold mb-4">Success vs Errors</h3>
        <div className="flex items-center gap-4 mb-2">
          <span className="text-sm">Success <strong className="text-accent">{stats.successCount}</strong></span>
          <span className="text-sm">Errors <strong className="text-destructive">{stats.errorCount}</strong></span>
        </div>
        <div className="flex h-4 rounded-full overflow-hidden bg-secondary/50">
          <div
            className="h-full"
            style={{
              width: `${stats.totalQueries > 0 ? (stats.successCount / stats.totalQueries) * 100 : 0}%`,
              background: 'linear-gradient(90deg, hsl(142 76% 36%), hsl(38 92% 50%))',
            }}
          />
          <div
            className="h-full bg-destructive"
            style={{ width: `${stats.totalQueries > 0 ? (stats.errorCount / stats.totalQueries) * 100 : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
