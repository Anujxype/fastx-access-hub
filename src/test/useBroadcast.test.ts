/**
 * Regression tests for useBroadcast (src/hooks/useBroadcast.ts)
 *
 * Covers:
 * - RPC is called with the correct panelId (null for global portal)
 * - Broadcast is set when a new ID is seen
 * - Broadcast is NOT set when the same ID is already in localStorage (dedup)
 * - localStorage is NOT written when the component unmounts before the RPC
 *   resolves (cancelled flag prevents state + storage side-effects)
 * - Returns null on RPC error (non-critical, silently ignored)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBroadcast } from '@/hooks/useBroadcast';

// ─── mock @/lib/supabase ──────────────────────────────────────────────────────
const mockRpc = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: mockRpc },
}));

// ─── helpers ──────────────────────────────────────────────────────────────────

const makeBroadcast = (id = 'bc-1') => ({
  id,
  title: 'System Notice',
  message: 'Maintenance in 10 min',
  created_at: '2024-01-01T00:00:00Z',
  target_panel_id: null,
});

/** Returns a promise and a function to resolve it externally. */
const deferred = <T>() => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

// ─── tests ────────────────────────────────────────────────────────────────────

describe('useBroadcast', () => {
  beforeEach(() => {
    localStorage.clear();
    mockRpc.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes panelId to supabase.rpc', async () => {
    mockRpc.mockResolvedValue({ data: null });

    await act(async () => {
      renderHook(() => useBroadcast('panel-xyz'));
    });

    expect(mockRpc).toHaveBeenCalledWith('get_latest_broadcast', {
      p_panel_id: 'panel-xyz',
    });
  });

  it('passes null panelId for global portal', async () => {
    mockRpc.mockResolvedValue({ data: null });

    await act(async () => {
      renderHook(() => useBroadcast(null));
    });

    expect(mockRpc).toHaveBeenCalledWith('get_latest_broadcast', {
      p_panel_id: null,
    });
  });

  it('returns the broadcast when RPC resolves with a new id', async () => {
    const bc = makeBroadcast('bc-new');
    mockRpc.mockResolvedValue({ data: [bc] });

    let result: ReturnType<typeof renderHook<ReturnType<typeof useBroadcast>, unknown>>;
    await act(async () => {
      result = renderHook(() => useBroadcast(null));
    });

    expect(result!.result.current).toEqual(bc);
  });

  it('stores the broadcast id in localStorage after showing it', async () => {
    const bc = makeBroadcast('bc-new');
    mockRpc.mockResolvedValue({ data: [bc] });

    await act(async () => {
      renderHook(() => useBroadcast(null));
    });

    expect(localStorage.getItem('cfms_last_broadcast')).toBe('bc-new');
  });

  it('does NOT set broadcast when same id is already in localStorage (dedup)', async () => {
    localStorage.setItem('cfms_last_broadcast', 'bc-seen');
    const bc = makeBroadcast('bc-seen');
    mockRpc.mockResolvedValue({ data: [bc] });

    let result: ReturnType<typeof renderHook<ReturnType<typeof useBroadcast>, unknown>>;
    await act(async () => {
      result = renderHook(() => useBroadcast(null));
    });

    expect(result!.result.current).toBeNull();
  });

  it('returns null when RPC returns no data', async () => {
    mockRpc.mockResolvedValue({ data: null });

    let result: ReturnType<typeof renderHook<ReturnType<typeof useBroadcast>, unknown>>;
    await act(async () => {
      result = renderHook(() => useBroadcast(null));
    });

    expect(result!.result.current).toBeNull();
  });

  it('returns null on RPC error (silently swallowed)', async () => {
    mockRpc.mockRejectedValue(new Error('Network error'));

    let result: ReturnType<typeof renderHook<ReturnType<typeof useBroadcast>, unknown>>;
    await act(async () => {
      result = renderHook(() => useBroadcast(null));
    });

    expect(result!.result.current).toBeNull();
  });

  it('does NOT write localStorage when component unmounts before RPC resolves', async () => {
    const { promise, resolve } = deferred<{ data: unknown }>();
    mockRpc.mockReturnValue(promise);

    const { unmount } = renderHook(() => useBroadcast(null));

    // Unmount first — sets cancelled = true in the effect cleanup
    act(() => {
      unmount();
    });

    // Now resolve the RPC with a fresh broadcast
    await act(async () => {
      resolve({ data: [makeBroadcast('bc-after-unmount')] });
    });

    // The cancelled check must have short-circuited before the localStorage write
    expect(localStorage.getItem('cfms_last_broadcast')).toBeNull();
  });

  it('re-runs effect when panelId changes', async () => {
    mockRpc.mockResolvedValue({ data: null });

    const { rerender } = renderHook(({ id }: { id: string | null }) => useBroadcast(id), {
      initialProps: { id: 'panel-1' },
    });

    await act(async () => {
      rerender({ id: 'panel-2' });
    });

    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect(mockRpc).toHaveBeenLastCalledWith('get_latest_broadcast', {
      p_panel_id: 'panel-2',
    });
  });
});
