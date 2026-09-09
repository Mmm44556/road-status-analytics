import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hasSeenWelcome, markWelcomeSeen } from '@/routes/-welcome/welcomeSeen';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: () => null,
    get length() {
      return store.size;
    },
  } as Storage;
}

// 這個 test suite 跑在純 Node 環境（沒有裝 jsdom），localStorage 不存在，
// 所以用 vi.stubGlobal 手動塞一個假的實作，而不是依賴瀏覽器環境。
describe('welcomeSeen', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to not seen', () => {
    expect(hasSeenWelcome()).toBe(false);
  });

  it('remembers after being marked as seen', () => {
    markWelcomeSeen();
    expect(hasSeenWelcome()).toBe(true);
  });

  it('treats a blocked localStorage as already seen, so the user is never stuck', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });

    expect(hasSeenWelcome()).toBe(true);
  });

  it('silently ignores a blocked write', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('blocked');
      },
    });

    expect(() => markWelcomeSeen()).not.toThrow();
  });
});
