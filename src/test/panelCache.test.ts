/**
 * Regression tests for panel-row cache (usePanelLanding.ts)
 * and master-panels cache (MasterPanel.tsx).
 *
 * Both caches write to sessionStorage (+ localStorage for master) and use a
 * timestamp-based TTL. These tests verify round-trips, TTL expiry, and
 * invalidation – locking in the fixes that keep the UI consistent after
 * mutations.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getCachedRow,
  setCachedRow,
  invalidateCache,
} from '@/hooks/usePanelLanding';
import {
  readCachedPanels,
  writeCachedPanels,
} from '@/pages/MasterPanel';
import type { ManagedPanel } from '@/lib/supabase';

// ─── shared fixtures ──────────────────────────────────────────────────────────

const makePanel = (id: string, slug: string): ManagedPanel => ({
  id,
  panel_name: `Panel ${id}`,
  slug,
  master_license_key: 'DRMS-TEST-XXXX-YYYY',
  is_active: true,
  expiry_date: null,
  allowed_endpoints: ['/mobile', '/email'],
  panel_password: 'admin123',
  created_at: '2024-01-01T00:00:00Z',
});

const PANEL_A = makePanel('panel-a', 'slug-a');
const PANEL_B = makePanel('panel-b', 'slug-b');

// ─── panel-row cache (usePanelLanding, sessionStorage, 2-min TTL) ─────────────

describe('panel-row cache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when no entry exists', () => {
    expect(getCachedRow('slug-a')).toBeNull();
  });

  it('round-trips: setCachedRow → getCachedRow returns the row', () => {
    setCachedRow('slug-a', PANEL_A);
    expect(getCachedRow('slug-a')).toEqual(PANEL_A);
  });

  it('cache key is scoped by slug (different slug returns null)', () => {
    setCachedRow('slug-a', PANEL_A);
    expect(getCachedRow('slug-b')).toBeNull();
  });

  it('returns the row just before TTL boundary (< 2 min)', () => {
    const now = new Date();
    vi.setSystemTime(now);
    setCachedRow('slug-a', PANEL_A);

    vi.setSystemTime(new Date(now.getTime() + 2 * 60 * 1000 - 1));
    expect(getCachedRow('slug-a')).toEqual(PANEL_A);
  });

  it('returns null after TTL has expired (> 2 min)', () => {
    const now = new Date();
    vi.setSystemTime(now);
    setCachedRow('slug-a', PANEL_A);

    vi.setSystemTime(new Date(now.getTime() + 2 * 60 * 1000 + 1));
    expect(getCachedRow('slug-a')).toBeNull();
  });

  it('also removes the expired entry from sessionStorage', () => {
    const now = new Date();
    vi.setSystemTime(now);
    setCachedRow('slug-a', PANEL_A);

    vi.setSystemTime(new Date(now.getTime() + 2 * 60 * 1000 + 1));
    getCachedRow('slug-a'); // triggers internal removeItem

    expect(sessionStorage.getItem('cfms_pc_slug-a')).toBeNull();
  });

  it('invalidateCache removes the entry', () => {
    setCachedRow('slug-a', PANEL_A);
    invalidateCache('slug-a');
    expect(getCachedRow('slug-a')).toBeNull();
  });

  it('invalidateCache is a no-op when no entry exists', () => {
    expect(() => invalidateCache('never-set')).not.toThrow();
  });

  it('overwriting a cached row replaces it', () => {
    const updated = { ...PANEL_A, panel_name: 'Renamed' };
    setCachedRow('slug-a', PANEL_A);
    setCachedRow('slug-a', updated);
    expect(getCachedRow('slug-a')).toEqual(updated);
  });
});

// ─── master panels cache (MasterPanel, sessionStorage+localStorage, 5-min TTL) ─

describe('master panels cache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns [] when no entry exists', () => {
    expect(readCachedPanels()).toEqual([]);
  });

  it('round-trips: writeCachedPanels → readCachedPanels returns the panels', () => {
    writeCachedPanels([PANEL_A, PANEL_B]);
    expect(readCachedPanels()).toEqual([PANEL_A, PANEL_B]);
  });

  it('writes to both sessionStorage and localStorage', () => {
    writeCachedPanels([PANEL_A]);
    expect(sessionStorage.getItem('cfms_master_panels_cache')).not.toBeNull();
    expect(localStorage.getItem('cfms_master_panels_cache')).not.toBeNull();
  });

  it('returns panels just before TTL boundary (< 5 min)', () => {
    const now = new Date();
    vi.setSystemTime(now);
    writeCachedPanels([PANEL_A]);

    vi.setSystemTime(new Date(now.getTime() + 5 * 60 * 1000 - 1));
    expect(readCachedPanels()).toEqual([PANEL_A]);
  });

  it('returns [] after TTL has expired (> 5 min)', () => {
    const now = new Date();
    vi.setSystemTime(now);
    writeCachedPanels([PANEL_A]);

    vi.setSystemTime(new Date(now.getTime() + 5 * 60 * 1000 + 1));
    expect(readCachedPanels()).toEqual([]);
  });

  it('overwriting cache replaces all panels', () => {
    writeCachedPanels([PANEL_A]);
    writeCachedPanels([PANEL_B]);
    expect(readCachedPanels()).toEqual([PANEL_B]);
  });

  it('returns [] when storage contains malformed JSON', () => {
    sessionStorage.setItem('cfms_master_panels_cache', '{bad json}');
    expect(readCachedPanels()).toEqual([]);
  });
});
