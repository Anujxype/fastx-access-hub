import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart3, Loader2, TrendingUp, Users, MapPin, Clock, RefreshCw } from 'lucide-react';
import { subDays, subHours, isAfter, format, startOfDay } from 'date-fns';

type TimeRange = 'all' | '1h' | '24h' | '7d' | '30d';

interface RawLog {
  endpoint: string;
  status: string;
  key_name: string;
  location: string | null;
  created_at: string;
  device: string | null;
}

const AnalyticsDashboard = ({ panelId }: { panelId?: string } = {}) => {
  const [logs, setLogs] = useState<RawLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase.from('api_logs').select('endpoint, status, key_name, location, created_at, device');
    if (panelId) query = query.eq('panel_id', panelId);
    const { data } = await query;
    setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const filteredLogs = useMemo(() => {
    if (timeRange === 'all') return logs;
    const cutoff = timeRange === '1h' ? subHours(new Date(), 1)
      : timeRange === '24h' ? subDays(new Date(), 1)
      : timeRange === '7d' ? subDays(new Date(), 7)
      : subDays(new Date(), 30);
    return logs.filter(l => isAfter(new Date(l.created_at), cutoff));
  }, [logs, timeRange]);

  const stats = useMemo(() => {
    const total = filteredLogs.length;
    const successes = filteredLogs.filter(l => l.status === 'success').length;
    const errors = total - successes;
    const uniqueUsers = new Set(filteredLogs.map(l => l.key_name)).size;
    const locations = new Set(filteredLogs.filter(l => l.location).map(l => l.location)).size;

    // Top endpoints
    const endpointCounts: Record<string, number> = {};
    filteredLogs.forEach(l => { endpointCounts[l.endpoint] = (endpointCounts[l.endpoint] || 0) + 1; });
    const topEndpoints = Object.entries(endpointCounts)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Top users
    const userCounts: Record<string, number> = {};
    filteredLogs.forEach(l => { userCounts[l.key_name] = (userCounts[l.key_name] || 0) + 1; });
    const topUsers = Object.entries(userCounts)
      .map(([user, count]) => ({ user, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Device breakdown
    const deviceCounts: Record<string, number> = {};
    filteredLogs.forEach(l => { deviceCounts[l.device || 'Unknown'] = (deviceCounts[l.device || 'Unknown'] || 0) + 1; });
    const devices = Object.entries(deviceCounts).map(([device, count]) => ({ device, count })).sort((a, b) => b.count - a.count);

    // Daily activity (last 7 days)
    const dailyActivity: { day: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const nextDay = startOfDay(subDays(new Date(), i - 1));
      const count = filteredLogs.filter(l => {
        const d = new Date(l.created_at);
        return d >= day && d < nextDay;
      }).length;
      dailyActivity.push({ day: format(day, 'EEE'), count });
    }

    return {
      totalQueries: total,
      successRate: total > 0 ? Math.round((successes / total) * 100) : 0,
      uniqueUsers,
      locations,
      topEndpoints,
      topUsers,
      successCount: successes,
      errorCount: errors,
      devices,
      dailyActivity,
      avgPerDay: total > 0 ? Math.round(total / Math.max(1, new Set(filteredLogs.map(l => format(new Date(l.created_at), 'yyyy-MM-dd'))).size)) : 0,
    };
  }, [filteredLogs]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>;

  const maxEndpointCount = Math.max(...stats.topEndpoints.map(e => e.count), 1);
  const maxDailyCount = Math.max(...stats.dailyActivity.map(d => d.count), 1);

  return (
    <div className="space-y-5 animate-in">
      {/* Time Range + Refresh */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1">
          {(['all', '1h', '24h', '7d', '30d'] as TimeRange[]).map(t => (
            <button
              key={t}
              onClick={() => setTimeRange(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                timeRange === t
                  ? 'bg-accent/20 text-accent border border-accent/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent'
              }`}
            >
              {t === 'all' ? 'All Time' : t}
            </button>
          ))}
        </div>
        <button onClick={fetchLogs} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'TOTAL QUERIES', value: stats.totalQueries, icon: BarChart3 },
          { label: 'SUCCESS RATE', value: `${stats.successRate}%`, icon: TrendingUp },
          { label: 'UNIQUE USERS', value: stats.uniqueUsers, icon: Users },
          { label: 'AVG / DAY', value: stats.avgPerDay, icon: Clock },
        ].map(s => (
          <div key={s.label} className="glass-admin p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4 text-accent/60" />
              <p className="text-[10px] text-muted-foreground font-semibold tracking-wider">{s.label}</p>
            </div>
            <p className="stat-value text-2xl">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Daily Activity Chart */}
      <div className="glass-admin p-5">
        <h3 className="font-bold flex items-center gap-2 mb-4 text-sm">
          <TrendingUp className="w-4 h-4 text-accent" />
          7-Day Activity
        </h3>
        <div className="flex items-end gap-2 h-28">
          {stats.dailyActivity.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-accent font-medium">{d.count}</span>
              <div
                className="w-full rounded-t-md transition-all duration-500"
                style={{
                  height: `${Math.max((d.count / maxDailyCount) * 100, 4)}%`,
                  background: 'linear-gradient(180deg, hsl(38 92% 50%), hsl(38 92% 35%))',
                  opacity: d.count > 0 ? 1 : 0.2,
                }}
              />
              <span className="text-[10px] text-muted-foreground">{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Endpoints */}
      <div className="glass-admin p-5">
        <h3 className="font-bold flex items-center gap-2 mb-4 text-sm">
          <BarChart3 className="w-4 h-4 text-accent" />
          Top Endpoints
        </h3>
        {stats.topEndpoints.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No data</p>
        ) : (
          <div className="space-y-2.5">
            {stats.topEndpoints.map((ep, i) => (
              <div key={ep.endpoint} className="flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground w-4 text-right font-medium">{i + 1}</span>
                <span className="text-xs text-primary font-mono w-20 shrink-0 truncate">{ep.endpoint}</span>
                <div className="flex-1 h-5 bg-secondary/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(ep.count / maxEndpointCount) * 100}%`,
                      background: 'linear-gradient(90deg, hsl(142 76% 36%), hsl(38 92% 50%))',
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-16 text-right font-mono">{ep.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Top Users */}
        <div className="glass-admin p-5">
          <h3 className="font-bold flex items-center gap-2 mb-4 text-sm">
            <Users className="w-4 h-4 text-accent" />
            Top Users
          </h3>
          {stats.topUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No data</p>
          ) : (
            <div className="space-y-2">
              {stats.topUsers.map((u, i) => (
                <div key={u.user} className="flex items-center justify-between glass p-3 hover:border-accent/20 transition-all">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent/15 flex items-center justify-center text-[10px] font-bold text-accent">{i + 1}</span>
                    <span className="text-sm font-medium truncate">{u.user}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{u.count} queries</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Device Breakdown */}
        <div className="glass-admin p-5">
          <h3 className="font-bold flex items-center gap-2 mb-4 text-sm">
            <MapPin className="w-4 h-4 text-accent" />
            Device Breakdown
          </h3>
          {stats.devices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No data</p>
          ) : (
            <div className="space-y-2">
              {stats.devices.map(d => {
                const pct = stats.totalQueries > 0 ? Math.round((d.count / stats.totalQueries) * 100) : 0;
                return (
                  <div key={d.device} className="glass p-3 hover:border-accent/20 transition-all">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium">{d.device}</span>
                      <span className="text-xs text-muted-foreground">{pct}% ({d.count})</span>
                    </div>
                    <div className="h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: 'linear-gradient(90deg, hsl(38 92% 50%), hsl(142 76% 36%))',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Success vs Errors */}
      <div className="glass-admin p-5">
        <h3 className="font-bold mb-4 text-sm">Success vs Errors</h3>
        <div className="flex items-center gap-6 mb-3">
          <span className="text-sm flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ background: 'hsl(142 76% 36%)' }} />
            Success <strong className="text-success">{stats.successCount}</strong>
          </span>
          <span className="text-sm flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-destructive" />
            Errors <strong className="text-destructive">{stats.errorCount}</strong>
          </span>
        </div>
        <div className="flex h-5 rounded-full overflow-hidden bg-secondary/50">
          <div
            className="h-full transition-all duration-700"
            style={{
              width: `${stats.totalQueries > 0 ? (stats.successCount / stats.totalQueries) * 100 : 0}%`,
              background: 'linear-gradient(90deg, hsl(142 76% 36%), hsl(38 92% 50%))',
            }}
          />
          <div
            className="h-full bg-destructive transition-all duration-700"
            style={{ width: `${stats.totalQueries > 0 ? (stats.errorCount / stats.totalQueries) * 100 : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
