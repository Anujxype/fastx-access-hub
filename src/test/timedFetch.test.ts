/**
 * Regression tests for timedFetch (src/lib/supabase.ts)
 *
 * Covers:
 * - Returns response on success
 * - Retries GET/HEAD on all retryable status codes (408, 429, 500-504)
 * - Does NOT retry non-GET methods
 * - Aborts after 15 s timeout (attempts both retries → total ~30 s)
 * - Caller abort signal propagates to cancel a non-retryable POST immediately
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { timedFetch } from '@/lib/supabase';

// A fetch mock that correctly rejects when the provided AbortSignal fires.
const makeAbortableFetch = () =>
  vi.fn().mockImplementation((_: unknown, init?: RequestInit) =>
    new Promise<Response>((_, reject) => {
      const abort = () =>
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      if (init?.signal?.aborted) {
        abort();
        return;
      }
      init?.signal?.addEventListener('abort', abort, { once: true });
    }),
  );

describe('timedFetch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('returns response on successful GET', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));
    const result = await timedFetch('https://example.com/api');
    expect(result.status).toBe(200);
  });

  it.each([408, 429, 500, 502, 503, 504])(
    'retries GET exactly once on %i then returns 200',
    async (status) => {
      vi.useFakeTimers();
      const spy = vi
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(new Response('', { status }))
        .mockResolvedValueOnce(new Response('ok', { status: 200 }));

      const p = timedFetch('https://example.com/api', { method: 'GET' });
      await vi.advanceTimersByTimeAsync(500); // past the 350 ms inter-retry wait
      const result = await p;

      expect(result.status).toBe(200);
      expect(spy).toHaveBeenCalledTimes(2);
    },
  );

  it('does NOT retry POST on 429', async () => {
    const spy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('', { status: 429 }));

    const result = await timedFetch('https://example.com/api', {
      method: 'POST',
      body: '{}',
    });

    expect(result.status).toBe(429);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry PUT on 500', async () => {
    const spy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('', { status: 500 }));

    const result = await timedFetch('https://example.com/api', {
      method: 'PUT',
      body: '{}',
    });

    expect(result.status).toBe(500);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('aborts both GET attempts after 15 s each (~30 s total)', async () => {
    vi.useFakeTimers();
    const spy = vi
      .spyOn(global, 'fetch')
      .mockImplementation(makeAbortableFetch());

    const p = timedFetch('https://example.com/api', { method: 'GET' });

    // First timeout fires at 15 s, retry wait is 350 ms, second timeout at 30.35 s
    await vi.advanceTimersByTimeAsync(31_000);

    await expect(p).rejects.toThrow();
    // Both attempts should have been made
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('cancels a POST immediately on caller abort (no retry)', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(makeAbortableFetch());

    const ctrl = new AbortController();
    const p = timedFetch('https://example.com/api', {
      method: 'POST',
      body: '{}',
      signal: ctrl.signal,
    });

    ctrl.abort();

    await expect(p).rejects.toThrow();
  });
});
