export type AsyncRequestLock = {
  run: <T>(request: () => Promise<T>) => Promise<T | undefined>;
};

/** 同一時間只允許一個非同步請求，完成或失敗後自動解鎖。 */
export function createAsyncRequestLock(): AsyncRequestLock {
  let isLocked = false;
  return {
    async run<T>(request: () => Promise<T>) {
      if (isLocked) return undefined;
      isLocked = true;
      try {
        return await request();
      } finally {
        isLocked = false;
      }
    },
  };
}
