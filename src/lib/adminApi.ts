// Admin API helper — transparently routes admin/sub-admin operations through
// the new SECURITY DEFINER RPCs (anon-safe) when a password is in localStorage,
// or falls back to direct table queries when the caller is a master admin
// authenticated via Supabase OAuth (RLS policy "master_admin_all_*" allows it).
//
// Why this exists:
//   Before the RLS lockdown, every admin component used `supabase.from(table)`
//   directly, which worked because anon had GRANT ALL on every table.
//   After the lockdown, anon can no longer touch the locked tables, so we route
//   each operation through the appropriate path based on the active session.

import {
  supabase,
  ADMIN_PASSWORD,
  MASTER_PASSWORD,
  type ApiKey,
  type ApiLog,
  type Broadcast,
  type CustomEndpoint,
} from './supabase';

export type AdminAuth =
  | { mode: 'master' }
  | { mode: 'admin'; password: string }
  | { mode: 'panel'; panelId: string; password: string };

/** Pick the right auth mode based on what's in localStorage. */
export function resolveAuth(panelId?: string | null): AdminAuth {
  // sub-admin (panel-scoped) takes priority when panelId is supplied
  if (panelId) {
    const pwd = localStorage.getItem(`cfms_panel_pwd_${panelId}`);
    if (pwd) return { mode: 'panel', panelId, password: pwd };
  }
  // global admin
  const adminPwd = localStorage.getItem('cfms_admin_pwd');
  if (adminPwd && !panelId) return { mode: 'admin', password: adminPwd };
  // master OAuth session — fall back to direct queries (RLS allows it)
  return { mode: 'master' };
}

// ------- api_keys -------

export async function listKeys(auth: AdminAuth): Promise<ApiKey[]> {
  if (auth.mode === 'master') {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
  if (auth.mode === 'admin') {
    const { data, error } = await supabase.rpc('admin_list_keys', { p_password: auth.password });
    if (error) throw error;
    return (data as ApiKey[]) || [];
  }
  const { data, error } = await supabase.rpc('panel_admin_list_keys', {
    p_panel_id: auth.panelId,
    p_password: auth.password,
  });
  if (error) throw error;
  return (data as ApiKey[]) || [];
}

export async function createKey(
  auth: AdminAuth,
  input: { name: string; key_value: string; expires_at: string | null; allowed_ips: string | null; panel_id?: string | null }
): Promise<void> {
  if (auth.mode === 'master') {
    const { error } = await supabase.from('api_keys').insert(input);
    if (error) throw error;
    return;
  }
  if (auth.mode === 'admin') {
    const { error } = await supabase.rpc('admin_create_key', {
      p_password: auth.password,
      p_name: input.name,
      p_key_value: input.key_value,
      p_expires_at: input.expires_at,
      p_allowed_ips: input.allowed_ips,
      p_panel_id: input.panel_id ?? null,
    });
    if (error) throw error;
    return;
  }
  const { error } = await supabase.rpc('panel_admin_create_key', {
    p_panel_id: auth.panelId,
    p_password: auth.password,
    p_name: input.name,
    p_key_value: input.key_value,
    p_expires_at: input.expires_at,
    p_allowed_ips: input.allowed_ips,
  });
  if (error) throw error;
}

export async function toggleKey(auth: AdminAuth, id: string, is_active: boolean): Promise<void> {
  if (auth.mode === 'master') {
    const { error } = await supabase.from('api_keys').update({ is_active }).eq('id', id);
    if (error) throw error;
    return;
  }
  if (auth.mode === 'admin') {
    const { error } = await supabase.rpc('admin_toggle_key', {
      p_password: auth.password,
      p_key_id: id,
      p_is_active: is_active,
    });
    if (error) throw error;
    return;
  }
  const { error } = await supabase.rpc('panel_admin_toggle_key', {
    p_panel_id: auth.panelId,
    p_password: auth.password,
    p_key_id: id,
    p_is_active: is_active,
  });
  if (error) throw error;
}

export async function deleteKey(auth: AdminAuth, id: string): Promise<void> {
  if (auth.mode === 'master') {
    const { error } = await supabase.from('api_keys').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  if (auth.mode === 'admin') {
    const { error } = await supabase.rpc('admin_delete_key', { p_password: auth.password, p_key_id: id });
    if (error) throw error;
    return;
  }
  const { error } = await supabase.rpc('panel_admin_delete_key', {
    p_panel_id: auth.panelId,
    p_password: auth.password,
    p_key_id: id,
  });
  if (error) throw error;
}

// ------- api_logs -------

// panelFilter scopes master-mode queries to a single panel so a master admin
// viewing a specific panel's admin page cannot see other panels' logs.
export async function listLogs(auth: AdminAuth, limit = 1000, panelFilter?: string | null): Promise<ApiLog[]> {
  if (auth.mode === 'master') {
    let query = supabase
      .from('api_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (panelFilter) query = query.eq('panel_id', panelFilter);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
  if (auth.mode === 'admin') {
    const { data, error } = await supabase.rpc('admin_list_logs', { p_password: auth.password, p_limit: limit });
    if (error) throw error;
    return (data as ApiLog[]) || [];
  }
  const { data, error } = await supabase.rpc('panel_admin_list_logs', {
    p_panel_id: auth.panelId,
    p_password: auth.password,
    p_limit: limit,
  });
  if (error) throw error;
  return (data as ApiLog[]) || [];
}

// ------- broadcasts -------

export async function listBroadcasts(auth: AdminAuth): Promise<Broadcast[]> {
  if (auth.mode === 'master') {
    const { data, error } = await supabase
      .from('broadcasts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
  if (auth.mode === 'admin') {
    const { data, error } = await supabase.rpc('admin_list_broadcasts', { p_password: auth.password });
    if (error) throw error;
    return (data as Broadcast[]) || [];
  }
  // panel sub-admin: no broadcast UI for now
  return [];
}

export async function createBroadcast(auth: AdminAuth, title: string, message: string): Promise<void> {
  if (auth.mode === 'master') {
    const { error } = await supabase.from('broadcasts').insert({ title, message });
    if (error) throw error;
    return;
  }
  if (auth.mode === 'admin') {
    const { error } = await supabase.rpc('admin_create_broadcast', {
      p_password: auth.password,
      p_title: title,
      p_message: message,
    });
    if (error) throw error;
    return;
  }
  throw new Error('broadcast creation requires admin or master auth');
}

export async function deleteBroadcast(auth: AdminAuth, id: string): Promise<void> {
  if (auth.mode === 'master') {
    const { error } = await supabase.from('broadcasts').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  if (auth.mode === 'admin') {
    const { error } = await supabase.rpc('admin_delete_broadcast', { p_password: auth.password, p_id: id });
    if (error) throw error;
    return;
  }
  throw new Error('broadcast delete requires admin or master auth');
}

// ------- custom_endpoints -------
// SELECT is anon-readable via RLS policy, so reads always go through .from().
// Writes use admin_* RPCs.

export async function listCustomEndpoints(): Promise<CustomEndpoint[]> {
  const { data, error } = await supabase
    .from('custom_endpoints')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createCustomEndpoint(
  auth: AdminAuth,
  input: { endpoint: string; param: string; label: string; icon: string }
): Promise<void> {
  if (auth.mode === 'master') {
    const { error } = await supabase.from('custom_endpoints').insert(input);
    if (!error) return;
    const fallbackPasswords = [localStorage.getItem('cfms_admin_pwd'), MASTER_PASSWORD, ADMIN_PASSWORD].filter(Boolean) as string[];
    for (const password of fallbackPasswords) {
      const { error: rpcError } = await supabase.rpc('admin_create_endpoint', {
        p_password: password,
        p_endpoint: input.endpoint,
        p_param: input.param,
        p_label: input.label,
        p_icon: input.icon,
      });
      if (!rpcError) return;
    }
    throw error;
  }
  if (auth.mode === 'admin') {
    const { error } = await supabase.rpc('admin_create_endpoint', {
      p_password: auth.password,
      p_endpoint: input.endpoint,
      p_param: input.param,
      p_label: input.label,
      p_icon: input.icon,
    });
    if (error) throw error;
    return;
  }
  throw new Error('custom endpoint creation requires admin or master auth');
}

export async function deleteCustomEndpoint(auth: AdminAuth, id: string): Promise<void> {
  if (auth.mode === 'master') {
    const { error } = await supabase.from('custom_endpoints').delete().eq('id', id);
    if (!error) return;
    const fallbackPasswords = [localStorage.getItem('cfms_admin_pwd'), MASTER_PASSWORD, ADMIN_PASSWORD].filter(Boolean) as string[];
    for (const password of fallbackPasswords) {
      const { error: rpcError } = await supabase.rpc('admin_delete_endpoint', { p_password: password, p_id: id });
      if (!rpcError) return;
    }
    throw error;
  }
  if (auth.mode === 'admin') {
    const { error } = await supabase.rpc('admin_delete_endpoint', { p_password: auth.password, p_id: id });
    if (error) throw error;
    return;
  }
  throw new Error('custom endpoint delete requires admin or master auth');
}

// ------- panel password change (sub-admin only) -------

export async function changePanelPassword(panelId: string, oldPassword: string, newPassword: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('panel_admin_change_password', {
    p_panel_id: panelId,
    p_old_password: oldPassword,
    p_new_password: newPassword,
  });
  if (error) throw error;
  if (data === true) {
    // refresh stored password so subsequent RPCs use the new one
    localStorage.setItem(`cfms_panel_pwd_${panelId}`, newPassword);
  }
  return data === true;
}
