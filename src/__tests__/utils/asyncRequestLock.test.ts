import { describe, expect, it, vi } from 'vitest';
import { createAsyncRequestLock } from '@/utils/asyncRequestLock';

describe('async request lock', () => {
  it('ignores concurrent calls until the active request settles', async () => {
    let releaseRequest: (() => void) | undefined;
    const request = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          releaseRequest = () => resolve('done');
        }),
    );
    const lock = createAsyncRequestLock();

    const first = lock.run(request);
    const second = lock.run(request);

    expect(request).toHaveBeenCalledTimes(1);
    expect(await second).toBeUndefined();
    releaseRequest?.();
    expect(await first).toBe('done');
  });

  it('allows another call after a request fails', async () => {
    const request = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValueOnce('retried');
    const lock = createAsyncRequestLock();

    await expect(lock.run(request)).rejects.toThrow('failed');

    await expect(lock.run(request)).resolves.toBe('retried');
    expect(request).toHaveBeenCalledTimes(2);
  });
});
