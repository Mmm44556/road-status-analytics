import { describe, expect, it } from 'vitest';
import { getTrafficLayerIconDataUrl } from '@/service/map/shared/layerIcon';

describe('traffic layer map icon', () => {
  it('renders the panel icon as an SVG data URL', () => {
    const dataUrl = getTrafficLayerIconDataUrl('roadEvents', '#FFFFFF');
    const svg = decodeURIComponent(dataUrl.replace('data:image/svg+xml,', ''));

    expect(svg).toContain('<svg');
    expect(svg).toContain('width="24"');
    expect(svg).toContain('height="24"');
    expect(svg).toContain('#FFFFFF');
    expect(svg).toContain('<path');
  });
});
