const STORAGE_KEY = 'routesight:welcome-seen';

/** localStorage 被封鎖時（例如部分瀏覽器的私密模式）視為已看過，避免把使用者卡在介紹頁進不去地圖。 */
export function hasSeenWelcome(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return true;
  }
}

export function markWelcomeSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // 私密模式等情境下寫入會失敗，忽略即可，下次仍會顯示介紹頁。
  }
}
