/** 從 CCTV HTML 播放頁取得真正的 HLS 播放清單網址。 */
export function extractHlsUrl(html: string, pageUrl: string): string {
  const sourceTags = html.match(/<source\b[^>]*>/gi) ?? [];

  for (const tag of sourceTags) {
    const source = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!source || !source.toLowerCase().includes('.m3u8')) continue;
    return new URL(source.split('&amp;').join('&'), pageUrl).toString();
  }

  throw new Error('M3U8 source not found');
}

/** 讀取 CCTV 播放頁，解析其中的 M3U8 URL。 */
export async function resolveHlsPageUrl(
  pageUrl: string,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch(pageUrl, { signal });
  if (!response.ok) throw new Error(`CCTV player page returned ${response.status}`);
  return extractHlsUrl(await response.text(), pageUrl);
}
