import { useState, useEffect, useMemo } from 'react';
import { supabase, type ApiLog } from '@/lib/supabase';
import {
  FileText, RefreshCw, Loader2, Monitor, MapPin,
  Search, Filter, ChevronLeft, ChevronRight, Download, X
} from 'lucide-react';
import { format, subDays, subHours, isAfter } from 'date-fns';
import { toast } from '@/hooks/use-toast';

type TimeRange = 'all' | '1h' | '24h' | '7d' | '30d';
type StatusFilter = 'all' | 'success' | 'error';

const PAGE_SIZE = 25;

const LogsViewer = ({ panelId }: { panelId?: string } = {}) => {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [endpointFilter, setEndpointFilter] = useState('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [page, setPage] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('api_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) {
      toast({ title: 'Error', description: 'Failed to fetch logs', variant: 'destructive' });
    }
    setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const uniqueEndpoints = useMemo(() => {
    const eps = new Set(logs.map(l => l.endpoint));
    return Array.from(eps).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    let result = [...logs];

    // Time range
    if (timeRange !== 'all') {
      const cutoff = timeRange === '1h' ? subHours(new Date(), 1)
        : timeRange === '24h' ? subDays(new Date(), 1)
        : timeRange === '7d' ? subDays(new Date(), 7)
        : subDays(new Date(), 30);
      result = result.filter(l => isAfter(new Date(l.created_at), cutoff));
    }

    // Status
    if (statusFilter !== 'all') {
      result = result.filter(l => statusFilter === 'success' ? l.status === 'success' : l.status !== 'success');
    }

    // Endpoint
    if (endpointFilter !== 'all') {
      result = result.filter(l => l.endpoint === endpointFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.key_name?.toLowerCase().includes(q) ||
        l.query?.toLowerCase().includes(q) ||
        l.endpoint?.toLowerCase().includes(q) ||
        l.ip_address?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [logs, search, statusFilter, endpointFilter, timeRange]);

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);
  const pagedLogs = filteredLogs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [search, statusFilter, endpointFilter, timeRange]);

  const exportLogs = () => {
    const csv = [
      'User,Endpoint,Query,Status,Device,Location,IP,Time',
      ...filteredLogs.map(l => `"${l.key_name}","${l.endpoint}","${l.query}","${l.status}","${l.device || ''}","${l.location || ''}","${l.ip_address || ''}","${l.created_at}"`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `cfms-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${filteredLogs.length} logs exported as CSV` });
  };

  const clearFilters = () => {
    setSearch(''); setStatusFilter('all'); setEndpointFilter('all'); setTimeRange('all');
  };

  const hasActiveFilters = search || statusFilter !== 'all' || endpointFilter !== 'all' || timeRange !== 'all';

  const stats = useMemo(() => ({
    total: filteredLogs.length,
    success: filteredLogs.filter(l => l.status === 'success').length,
    errors: filteredLogs.filter(l => l.status !== 'success').length,
  }), [filteredLogs]);

  return (
    <div className="space-y-4 animate-in">
      {/* Mini Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-admin p-3">
          <p className="text-[10px] text-muted-foreground font-semibold tracking-wider">TOTAL</p>
          <p className="text-xl font-bold text-accent">{stats.total}</p>
        </div>
        <div className="glass-admin p-3">
          <p className="text-[10px] text-muted-foreground font-semibold tracking-wider">SUCCESS</p>
          <p className="text-xl font-bold text-success">{stats.success}</p>
        </div>
        <div className="glass-admin p-3">
          <p className="text-[10px] text-muted-foreground font-semibold tracking-wider">ERRORS</p>
          <p className="text-xl font-bold text-destructive">{stats.errors}</p>
        </div>
      </div>

      <div className="glass-admin p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-bold flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-accent" />
            Search Logs
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={exportLogs} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button onClick={fetchLogs} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by user, query, endpoint, IP..."
            className="input-admin w-full text-sm pl-9"
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Time Range */}
          <div className="flex gap-1">
            {(['all', '1h', '24h', '7d', '30d'] as TimeRange[]).map(t => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  timeRange === t
                    ? 'bg-accent/20 text-accent border border-accent/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent'
                }`}
              >
                {t === 'all' ? 'All Time' : t}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex gap-1">
            {(['all', 'success', 'error'] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  statusFilter === s
                    ? s === 'success' ? 'bg-success/20 text-success border border-success/30'
                      : s === 'error' ? 'bg-destructive/20 text-destructive border border-destructive/30'
                      : 'bg-accent/20 text-accent border border-accent/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Endpoint Filter */}
          <select
            value={endpointFilter}
            onChange={e => setEndpointFilter(e.target.value)}
            className="input-admin text-[11px] py-1.5 px-2.5 rounded-lg"
          >
            <option value="all">All Endpoints</option>
            {uniqueEndpoints.map(ep => (
              <option key={ep} value={ep}>{ep}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-[11px] text-accent hover:text-accent/80 transition-colors">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
        ) : pagedLogs.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">{hasActiveFilters ? 'No logs match your filters' : 'No logs yet'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-muted-foreground border-b border-border font-semibold tracking-wider">
                  <th className="text-left py-2 px-2">USER</th>
                  <th className="text-left py-2 px-2">ENDPOINT</th>
                  <th className="text-left py-2 px-2">QUERY</th>
                  <th className="text-left py-2 px-2">STATUS</th>
                  <th className="text-left py-2 px-2">DEVICE</th>
                  <th className="text-left py-2 px-2">TIME</th>
                </tr>
              </thead>
              <tbody>
                {pagedLogs.map(log => (
                  <tr
                    key={log.id}
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-2 font-medium text-xs">{log.key_name}</td>
                    <td className="py-3 px-2 text-primary font-mono text-[11px]">{log.endpoint}</td>
                    <td className="py-3 px-2 font-mono text-[11px] max-w-[150px] truncate">{log.query}</td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        log.status === 'success' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'success' ? 'bg-success' : 'bg-destructive'}`} />
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className="flex items-center gap-1 text-muted-foreground text-xs">
                        <Monitor className="w-3.5 h-3.5" />
                        {log.device || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground text-[11px]">
                      {format(new Date(log.created_at), 'HH:mm dd/MM')}
                    </td>
                  </tr>
                ))}
                {/* Expanded detail rows rendered separately */}
                {pagedLogs.map(log => expandedId === log.id ? (
                  <tr key={`${log.id}-detail`} className="bg-secondary/20">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground font-semibold">User Agent</span>
                          <p className="font-mono text-foreground/70 mt-0.5 break-all text-[10px]">{log.user_agent || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground font-semibold">IP Address</span>
                          <p className="font-mono text-foreground/70 mt-0.5">{log.ip_address || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground font-semibold">Location</span>
                          <p className="text-foreground/70 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {log.location || 'Unknown'}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground font-semibold">Device Type</span>
                          <p className="text-foreground/70 mt-0.5">{log.device || 'Unknown'}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null)}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
            <span className="text-xs text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg hover:bg-secondary/50 disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = page <= 2 ? i : page >= totalPages - 3 ? totalPages - 5 + i : page - 2 + i;
                if (pageNum < 0 || pageNum >= totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
                      page === pageNum ? 'bg-accent/20 text-accent' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    }`}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg hover:bg-secondary/50 disabled:opacity-30 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogsViewer;
