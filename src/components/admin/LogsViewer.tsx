import { useState, useEffect } from 'react';
import { supabase, type ApiLog } from '@/lib/supabase';
import { FileText, RefreshCw, Loader2, Monitor, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

const LogsViewer = () => {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('api_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  return (
    <div className="glass-admin p-5 animate-in">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold flex items-center gap-2">
          <FileText className="w-5 h-5 text-accent" />
          Search Logs ({logs.length})
        </h3>
        <button onClick={fetchLogs} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Click a row to expand device & location details</p>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
      ) : logs.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No logs yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left py-2 px-2">USER</th>
                <th className="text-left py-2 px-2">ENDPOINT</th>
                <th className="text-left py-2 px-2">QUERY</th>
                <th className="text-left py-2 px-2">STATUS</th>
                <th className="text-left py-2 px-2">DEVICE</th>
                <th className="text-left py-2 px-2">TIME</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <>
                  <tr
                    key={log.id}
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-2 font-medium">{log.key_name}</td>
                    <td className="py-3 px-2 text-primary font-mono text-xs">{log.endpoint}</td>
                    <td className="py-3 px-2 font-mono text-xs">{log.query}</td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        log.status === 'success' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'success' ? 'bg-success' : 'bg-destructive'}`} />
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Monitor className="w-3.5 h-3.5" />
                        {log.device || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground text-xs">
                      {format(new Date(log.created_at), 'HH:mm dd/MM')}
                    </td>
                  </tr>
                  {expandedId === log.id && (
                    <tr key={`${log.id}-detail`} className="bg-secondary/20">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-muted-foreground">User Agent:</span>
                            <p className="font-mono text-foreground/70 mt-0.5 break-all">{log.user_agent || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">IP Address:</span>
                            <p className="font-mono text-foreground/70 mt-0.5">{log.ip_address || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Location:</span>
                            <p className="text-foreground/70 mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {log.location || 'Unknown'}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Device Type:</span>
                            <p className="text-foreground/70 mt-0.5">{log.device || 'Unknown'}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LogsViewer;
