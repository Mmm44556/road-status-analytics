import { describe, expect, it, vi } from 'vitest';
import { searchPlaces } from '@/service/placeSearchApi';

describe('place search api', () => {
  it('requests the normalized backend endpoint with city context', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{
          id: 'osm-123',
          name: '高雄車站',
          address: '高雄車站, 高雄市',
          longitude: 120.302,
          latitude: 22.6397,
          type: 'station',
          source: 'OpenStreetMap Nominatim',
        }],
      }),
    });

    const results = await searchPlaces('高雄車站', '高雄市', fetcher);

    expect(results[0].name).toBe('高雄車站');
    expect(fetcher).toHaveBeenCalledWith(
      '/api/places/search?q=%E9%AB%98%E9%9B%84%E8%BB%8A%E7%AB%99&limit=5&city=%E9%AB%98%E9%9B%84%E5%B8%82',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
  });

  it('rejects malformed upstream coordinates', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'bad', name: '錯誤資料' }] }),
    });

    await expect(searchPlaces('錯誤資料', null, fetcher)).rejects.toThrow();
  });
});
