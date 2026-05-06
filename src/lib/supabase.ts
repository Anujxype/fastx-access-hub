import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rwmbuxgyynlyusmyaovg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3bWJ1eGd5eW5seXVzbXlhb3ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NTIzMDQsImV4cCI6MjA4ODUyODMwNH0.F9mRsjHY7xTJNCIhzOyB8FGpkgb_XjRP6NcOm59hNak';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const API_BASE = 'https://anuapi.netlify.app/.netlify/functions/api';

export const ADMIN_PASSWORD = 'stk7890';
export const MASTER_PASSWORD = 'cfms7890';

// Matches actual DB column names
export interface ApiKey {
  id: string;
  name: string;
  key_value: string;
  is_active: boolean;
  uses: number;
  expires_at: string | null;
  allowed_ips: string | null;
  created_at: string;
  panel_id: string | null;
}

export interface ApiLog {
  id: string;
  key_id: string | null;
  key_name: string;
  endpoint: string;
  query: string;
  status: string;
  device: string | null;
  location: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  panel_id: string | null;
}

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  created_at: string;
  target_panel_id: string | null;
}

export interface ManagedPanel {
  id: string;
  panel_name: string;
  slug: string;
  master_license_key: string;
  is_active: boolean;
  expiry_date: string | null;
  allowed_endpoints: string[];
  panel_password: string;
  created_at: string;
}

export interface CustomEndpoint {
  id: string;
  endpoint: string;
  param: string;
  label: string;
  icon: string;
  created_at: string;
}

export function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const ENDPOINTS = [
  { endpoint: '/mobile', param: 'number', label: 'Mobile Lookup', icon: 'Smartphone' },
  { endpoint: '/aadhaar', param: 'id', label: 'Aadhaar Lookup', icon: 'Fingerprint' },
  { endpoint: '/email', param: 'address', label: 'Email Lookup', icon: 'Mail' },
  { endpoint: '/gst', param: 'number', label: 'GST Lookup', icon: 'FileText' },
  { endpoint: '/telegram', param: 'user', label: 'Telegram Lookup', icon: 'Send' },
  { endpoint: '/ifsc', param: 'code', label: 'IFSC Lookup', icon: 'Building2' },
  { endpoint: '/rashan', param: 'aadhaar', label: 'Ration Card Lookup', icon: 'CreditCard' },
  { endpoint: '/upi', param: 'id', label: 'UPI Lookup', icon: 'Wallet' },
  { endpoint: '/upi2', param: 'id', label: 'UPI Lookup v2', icon: 'CircleDollarSign' },
  { endpoint: '/vehicle', param: 'registration', label: 'Vehicle Lookup', icon: 'Car' },
  { endpoint: '/v2', param: 'query', label: 'General Query', icon: 'Search' },
  { endpoint: '/pan', param: 'pan', label: 'PAN Lookup', icon: 'FileCheck' },
  { endpoint: '/gas', param: 'num', label: 'Gas Connection Lookup', icon: 'Flame' },
  { endpoint: '/fastag', param: 'vrn', label: 'FASTag Lookup', icon: 'Truck' },
];

export const ALL_ENDPOINT_PATHS = ENDPOINTS.map(e => e.endpoint);

export const AVAILABLE_ICONS = [
  'Smartphone', 'Fingerprint', 'Mail', 'FileText', 'Send', 'Building2',
  'CreditCard', 'Wallet', 'CircleDollarSign', 'Car', 'Search', 'FileCheck',
  'Flame', 'Truck', 'Globe', 'Shield', 'User', 'Key', 'Database', 'Server', 'Cpu', 'Hash',
];

export async function fetchAllEndpoints(): Promise<typeof ENDPOINTS> {
  const { data } = await supabase.from('custom_endpoints').select('*').order('created_at', { ascending: true });
  const custom = (data || []).map((ce: CustomEndpoint) => ({
    endpoint: ce.endpoint.startsWith('/') ? ce.endpoint : `/${ce.endpoint}`,
    param: ce.param,
    label: ce.label,
    icon: ce.icon,
  }));
  return [...ENDPOINTS, ...custom];
}

export function generateKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'ak_';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateLicenseKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = [];
  for (let s = 0; s < 4; s++) {
    let seg = '';
    for (let i = 0; i < 4; i++) {
      seg += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(seg);
  }
  return 'DRMS-' + segments.join('-');
}

export function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  if (/Mobile|Android/i.test(ua)) return 'Mobile';
  if (/Tablet|iPad/i.test(ua)) return 'Tablet';
  return 'Desktop';
}

let cachedGeoData: { ip: string; location: string } | null = null;

export async function getGeoInfo(): Promise<{ ip: string; location: string }> {
  if (cachedGeoData) return cachedGeoData;
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error('Geo API failed');
    const data = await res.json();
    cachedGeoData = {
      ip: data.ip || 'Unknown',
      location: [data.city, data.region, data.country_name].filter(Boolean).join(', ') || 'Unknown',
    };
    return cachedGeoData;
  } catch {
    return { ip: 'Unknown', location: 'Unknown' };
  }
}
