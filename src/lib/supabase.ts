import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kbgabcennwwfmykfyndh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZ2FiY2Vubnd3Zm15a2Z5bmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MTE5NjYsImV4cCI6MjA4NjE4Nzk2Nn0.CzvobFl6D2tyRPA9JNW8yEZ9PhkrtkzsAhEvyhKtj4I';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const API_BASE = 'https://anuapi.netlify.app/.netlify/functions/api';

export const ADMIN_PASSWORD = 'stk7890';

export interface ApiKey {
  id: string;
  name: string;
  key_value: string;
  is_active: boolean;
  uses: number;
  expires_at: string | null;
  allowed_ips: string | null;
  created_at: string;
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
}

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  created_at: string;
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
];

export function generateKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'ak_';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  if (/Mobile|Android/i.test(ua)) return 'Mobile';
  if (/Tablet|iPad/i.test(ua)) return 'Tablet';
  return 'Desktop';
}
