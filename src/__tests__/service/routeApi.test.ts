import { describe, expect, it, vi } from 'vitest';
import { calculateRoute } from '@/service/routeApi';

describe('route API', () => {
  it('supports the transit travel mode', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            distance_meters: 10,
            duration_seconds: 20,
            geometry: {
              type: 'MultiLineString',
              coordinates: [[[120, 22], [121, 23]]],
            },
            travel_mode: 'transit',
            is_approximated: true,
            source: 'Geoapify',
          },
        }),
        { status: 200 },
      ),
    );

    const result = await calculateRoute(
      [
        { longitude: 120, latitude: 22 },
        { longitude: 121, latitude: 23 },
      ],
      'transit',
      fetcher,
    );

    expect(result.travelMode).toBe('transit');
    expect(result.isApproximated).toBe(true);
    expect(fetcher.mock.calls[0][1]?.body).toContain('"travel_mode":"transit"');
  });

  it('posts waypoints and validates the normalized route', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            distance_meters: 4321,
            duration_seconds: 678,
            geometry: {
              type: 'MultiLineString',
              coordinates: [[[120.302, 22.6397], [120.31, 22.63]]],
            },
            travel_mode: 'bicycle',
            source: 'Geoapify',
          },
        }),
        { status: 200 },
      ),
    );

    const result = await calculateRoute(
      [
        { longitude: 120.302, latitude: 22.6397 },
        { longitude: 120.305, latitude: 22.635 },
        { longitude: 120.31, latitude: 22.63 },
      ],
      'bicycle',
      fetcher,
    );

    expect(result.distanceMeters).toBe(4321);
    expect(result.durationSeconds).toBe(678);
    expect(result.travelMode).toBe('bicycle');
    expect(fetcher).toHaveBeenCalledWith('/api/routes', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        waypoints: [
          { longitude: 120.302, latitude: 22.6397 },
          { longitude: 120.305, latitude: 22.635 },
          { longitude: 120.31, latitude: 22.63 },
        ],
        travel_mode: 'bicycle',
      }),
    });
  });

  it('rejects malformed route geometry', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            distance_meters: 1,
            duration_seconds: 1,
            geometry: { type: 'LineString', coordinates: [] },
            travel_mode: 'walk',
            source: 'Geoapify',
          },
        }),
        { status: 200 },
      ),
    );

    await expect(
      calculateRoute(
        [
          { longitude: 120, latitude: 22 },
          { longitude: 121, latitude: 23 },
        ],
        'walk',
        fetcher,
      ),
    ).rejects.toThrow();
  });
});
