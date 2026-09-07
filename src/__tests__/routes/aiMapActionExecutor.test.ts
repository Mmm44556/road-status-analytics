import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  executeAiMapAction,
  type AiMapActionDeps,
} from '@/routes/-maps/aiMapActionExecutor';
import { searchPlaces, type PlaceSearchResult } from '@/service/placeSearchApi';
import { calculateRoute, type RouteResult } from '@/service/routeApi';
import { getCountyBoundaries } from '@/service/map/features/countyBoundaries';
import { getTownshipBoundaries } from '@/service/map/features/townshipBoundaries';

vi.mock('@/service/placeSearchApi', () => ({ searchPlaces: vi.fn() }));
vi.mock('@/service/routeApi', () => ({ calculateRoute: vi.fn() }));
vi.mock('@/service/map/features/countyBoundaries', () => ({
  getCountyBoundaries: vi.fn(),
}));
vi.mock('@/service/map/features/townshipBoundaries', () => ({
  getTownshipBoundaries: vi.fn(),
}));

const mockedSearchPlaces = vi.mocked(searchPlaces);
const mockedCalculateRoute = vi.mocked(calculateRoute);
const mockedGetCountyBoundaries = vi.mocked(getCountyBoundaries);
const mockedGetTownshipBoundaries = vi.mocked(getTownshipBoundaries);

function createDeps(overrides: Partial<AiMapActionDeps> = {}): AiMapActionDeps {
  return {
    visibleLayers: new Set(),
    queryMode: 'area',
    route: null,
    canToggleLayer: vi.fn().mockReturnValue(true),
    toggleLayer: vi.fn(),
    selectSearchResult: vi.fn(),
    handleRouteChange: vi.fn(),
    setIsRoutePlannerOpen: vi.fn(),
    getUserLocation: vi.fn().mockResolvedValue({ longitude: 120.3, latitude: 22.6 }),
    selectCounty: vi.fn(),
    selectTownship: vi.fn(),
    setIsTownshipSelectionComplete: vi.fn(),
    reselectCounty: vi.fn(),
    setBasemapId: vi.fn(),
    ...overrides,
  };
}

function placeResult(overrides: Partial<PlaceSearchResult> = {}): PlaceSearchResult {
  return {
    id: 'geoapify-1',
    name: '高雄車站',
    address: '高雄市三民區建國二路318號',
    longitude: 120.302,
    latitude: 22.6397,
    type: 'station',
    source: 'Geoapify',
    ...overrides,
  };
}

function fakeRoute(overrides: Partial<RouteResult> = {}): RouteResult {
  return {
    distanceMeters: 12000,
    durationSeconds: 1200,
    geometry: { type: 'MultiLineString', coordinates: [] },
    travelMode: 'drive',
    isApproximated: false,
    source: 'Geoapify',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('search_place', () => {
  it('selects the first result and reports success', async () => {
    mockedSearchPlaces.mockResolvedValueOnce([placeResult({ name: '正修科技大學' })]);
    const deps = createDeps();

    const result = await executeAiMapAction(
      { type: 'search_place', query: '正修科技大學' },
      deps,
    );

    expect(mockedSearchPlaces).toHaveBeenCalledWith('正修科技大學', null);
    expect(deps.selectSearchResult).toHaveBeenCalledWith(
      expect.objectContaining({ name: '正修科技大學' }),
    );
    expect(result).toEqual({
      type: 'search_place',
      success: true,
      summary: '已在地圖上找到並移動到「正修科技大學」',
    });
  });

  it('reports failure when nothing is found', async () => {
    mockedSearchPlaces.mockResolvedValueOnce([]);
    const deps = createDeps();

    const result = await executeAiMapAction(
      { type: 'search_place', query: '不存在的地方' },
      deps,
    );

    expect(result.success).toBe(false);
    expect(deps.selectSearchResult).not.toHaveBeenCalled();
  });

  it('reports failure when the search service throws', async () => {
    mockedSearchPlaces.mockRejectedValueOnce(new Error('network'));
    const deps = createDeps();

    const result = await executeAiMapAction(
      { type: 'search_place', query: '高雄車站' },
      deps,
    );

    expect(result).toEqual({
      type: 'search_place',
      success: false,
      summary: '地點搜尋服務暫時無法使用',
    });
  });
});

describe('plan_route', () => {
  it('resolves origin/destination and plans a route', async () => {
    mockedSearchPlaces
      .mockResolvedValueOnce([placeResult({ name: '高雄車站' })])
      .mockResolvedValueOnce([placeResult({ name: '義大世界' })]);
    mockedCalculateRoute.mockResolvedValueOnce(fakeRoute());
    const deps = createDeps();

    const result = await executeAiMapAction(
      {
        type: 'plan_route',
        origin: '高雄車站',
        destination: '義大世界',
        stopovers: [],
        travelMode: 'drive',
      },
      deps,
    );

    expect(deps.handleRouteChange).toHaveBeenCalledWith(
      expect.objectContaining({ distanceMeters: 12000 }),
    );
    expect(deps.setIsRoutePlannerOpen).toHaveBeenCalledWith(true);
    expect(result.success).toBe(true);
    expect(result.summary).toContain('高雄車站');
    expect(result.summary).toContain('義大世界');
  });

  it('uses real geolocation for "我的位置" instead of searching for it', async () => {
    mockedSearchPlaces.mockResolvedValueOnce([placeResult({ name: '義大世界' })]);
    mockedCalculateRoute.mockResolvedValueOnce(fakeRoute());
    const deps = createDeps();

    const result = await executeAiMapAction(
      {
        type: 'plan_route',
        origin: '我的位置',
        destination: '義大世界',
        stopovers: [],
        travelMode: 'drive',
      },
      deps,
    );

    expect(deps.getUserLocation).toHaveBeenCalled();
    expect(mockedSearchPlaces).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });

  it('reports failure when geolocation is denied for "我的位置"', async () => {
    const deps = createDeps({
      getUserLocation: vi.fn().mockRejectedValue(new Error('denied')),
    });

    const result = await executeAiMapAction(
      {
        type: 'plan_route',
        origin: '我的位置',
        destination: '義大世界',
        stopovers: [],
        travelMode: 'drive',
      },
      deps,
    );

    expect(result.success).toBe(false);
    expect(result.summary).toContain('無法取得目前位置');
  });

  it('reports failure when the origin cannot be found', async () => {
    mockedSearchPlaces
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([placeResult()]);
    const deps = createDeps();

    const result = await executeAiMapAction(
      {
        type: 'plan_route',
        origin: '不存在的起點',
        destination: '義大世界',
        stopovers: [],
        travelMode: 'drive',
      },
      deps,
    );

    expect(result.success).toBe(false);
    expect(result.summary).toContain('起點');
  });

  it('reports failure when the destination cannot be found', async () => {
    mockedSearchPlaces
      .mockResolvedValueOnce([placeResult()])
      .mockResolvedValueOnce([]);
    const deps = createDeps();

    const result = await executeAiMapAction(
      {
        type: 'plan_route',
        origin: '高雄車站',
        destination: '不存在的終點',
        stopovers: [],
        travelMode: 'drive',
      },
      deps,
    );

    expect(result.success).toBe(false);
    expect(result.summary).toContain('終點');
  });

  it('reports failure when a stopover cannot be found', async () => {
    mockedSearchPlaces
      .mockResolvedValueOnce([placeResult()])
      .mockResolvedValueOnce([placeResult()])
      .mockResolvedValueOnce([]);
    const deps = createDeps();

    const result = await executeAiMapAction(
      {
        type: 'plan_route',
        origin: '高雄車站',
        destination: '義大世界',
        stopovers: ['不存在的途經點'],
        travelMode: 'drive',
      },
      deps,
    );

    expect(result.success).toBe(false);
    expect(result.summary).toContain('途經點');
  });

  it('reports a generic failure when route calculation throws', async () => {
    mockedSearchPlaces
      .mockResolvedValueOnce([placeResult()])
      .mockResolvedValueOnce([placeResult()]);
    mockedCalculateRoute.mockRejectedValueOnce(new Error('routing failed'));
    const deps = createDeps();

    const result = await executeAiMapAction(
      {
        type: 'plan_route',
        origin: '高雄車站',
        destination: '義大世界',
        stopovers: [],
        travelMode: 'drive',
      },
      deps,
    );

    expect(result).toEqual({
      type: 'plan_route',
      success: false,
      summary: '路線規劃失敗',
    });
  });
});

describe('toggle_layer', () => {
  it('turns on a layer that is currently off', async () => {
    const deps = createDeps({ visibleLayers: new Set() });

    const result = await executeAiMapAction(
      { type: 'toggle_layer', layerId: 'cctv', visible: true },
      deps,
    );

    expect(deps.toggleLayer).toHaveBeenCalledWith('cctv');
    expect(result.success).toBe(true);
  });

  it('does nothing when the layer is already in the desired state', async () => {
    const deps = createDeps({ visibleLayers: new Set(['cctv']) });

    const result = await executeAiMapAction(
      { type: 'toggle_layer', layerId: 'cctv', visible: true },
      deps,
    );

    expect(deps.toggleLayer).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('reports failure when the query mode does not allow toggling', async () => {
    const deps = createDeps({ canToggleLayer: vi.fn().mockReturnValue(false) });

    const result = await executeAiMapAction(
      { type: 'toggle_layer', layerId: 'cctv', visible: true },
      deps,
    );

    expect(deps.toggleLayer).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });
});

describe('select_area', () => {
  it('selects the whole county when no township is given', async () => {
    mockedGetCountyBoundaries.mockReturnValueOnce([
      { id: '64000', name: '高雄市', geometry: { type: 'Polygon', coordinates: [] } },
    ]);
    const deps = createDeps();

    const result = await executeAiMapAction(
      { type: 'select_area', countyName: '高雄市' },
      deps,
    );

    expect(deps.selectCounty).toHaveBeenCalledWith({ id: '64000', name: '高雄市' });
    expect(deps.setIsTownshipSelectionComplete).toHaveBeenCalledWith(true);
    expect(result.success).toBe(true);
  });

  it('reports failure when the query mode is route (must clear route first)', async () => {
    const deps = createDeps({ queryMode: 'route' });

    const result = await executeAiMapAction(
      { type: 'select_area', countyName: '高雄市' },
      deps,
    );

    expect(deps.selectCounty).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });

  it('reports failure when the county name is unknown', async () => {
    mockedGetCountyBoundaries.mockReturnValueOnce([]);
    const deps = createDeps();

    const result = await executeAiMapAction(
      { type: 'select_area', countyName: '不存在的縣市' },
      deps,
    );

    expect(result.success).toBe(false);
  });

  it('selects the township when it matches', async () => {
    mockedGetCountyBoundaries.mockReturnValueOnce([
      { id: '64000', name: '高雄市', geometry: { type: 'Polygon', coordinates: [] } },
    ]);
    mockedGetTownshipBoundaries.mockResolvedValueOnce([
      {
        id: '64000-010',
        name: '三民區',
        countyId: '64000',
        geometry: { type: 'Polygon', coordinates: [] },
      },
    ]);
    const deps = createDeps();

    const result = await executeAiMapAction(
      { type: 'select_area', countyName: '高雄市', townshipName: '三民區' },
      deps,
    );

    expect(deps.selectTownship).toHaveBeenCalledWith(
      expect.objectContaining({ name: '三民區' }),
    );
    expect(result.success).toBe(true);
    expect(result.summary).toContain('三民區');
  });

  it('falls back to the whole county when the township name does not match', async () => {
    mockedGetCountyBoundaries.mockReturnValueOnce([
      { id: '64000', name: '高雄市', geometry: { type: 'Polygon', coordinates: [] } },
    ]);
    mockedGetTownshipBoundaries.mockResolvedValueOnce([]);
    const deps = createDeps();

    const result = await executeAiMapAction(
      { type: 'select_area', countyName: '高雄市', townshipName: '不存在的鄉鎮' },
      deps,
    );

    expect(deps.selectTownship).not.toHaveBeenCalled();
    expect(deps.setIsTownshipSelectionComplete).toHaveBeenCalledWith(true);
    expect(result.success).toBe(true);
  });
});

describe('clear_route', () => {
  it('reports there is nothing to clear when no route exists', async () => {
    const deps = createDeps({ route: null });

    const result = await executeAiMapAction({ type: 'clear_route' }, deps);

    expect(deps.handleRouteChange).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.summary).toContain('沒有已規劃的路線');
  });

  it('clears an existing route', async () => {
    const deps = createDeps({ route: fakeRoute() });

    const result = await executeAiMapAction({ type: 'clear_route' }, deps);

    expect(deps.handleRouteChange).toHaveBeenCalledWith(null);
    expect(result.success).toBe(true);
  });
});

describe('locate_me', () => {
  it('reports success when geolocation resolves', async () => {
    const deps = createDeps();

    const result = await executeAiMapAction({ type: 'locate_me' }, deps);

    expect(deps.getUserLocation).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('reports failure when geolocation is denied', async () => {
    const deps = createDeps({
      getUserLocation: vi.fn().mockRejectedValue(new Error('denied')),
    });

    const result = await executeAiMapAction({ type: 'locate_me' }, deps);

    expect(result.success).toBe(false);
  });
});

describe('reset_area', () => {
  it('resets the county selection and reports success', async () => {
    const deps = createDeps();

    const result = await executeAiMapAction({ type: 'reset_area' }, deps);

    expect(deps.reselectCounty).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('reports failure when the query mode is route (must clear route first)', async () => {
    const deps = createDeps({ queryMode: 'route' });

    const result = await executeAiMapAction({ type: 'reset_area' }, deps);

    expect(deps.reselectCounty).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });
});

describe('change_basemap', () => {
  it('switches to a known basemap and reports success', async () => {
    const deps = createDeps();

    const result = await executeAiMapAction(
      { type: 'change_basemap', basemapId: 'PHOTO2' },
      deps,
    );

    expect(deps.setBasemapId).toHaveBeenCalledWith('PHOTO2');
    expect(result.success).toBe(true);
    expect(result.summary).toContain('正射影像');
  });
});
