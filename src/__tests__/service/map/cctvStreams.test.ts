import { describe, expect, it } from 'vitest';
import { extractHlsUrl } from '@/service/map/shared/cctvStreams';

describe('CCTV stream helpers', () => {
  it('resolves a relative M3U8 source from a CCTV player page', () => {
    const html = `
      <video>
        <source src="/cam16_0/xxx.m3u8" type="application/x-mpegURL">
      </video>
    `;

    expect(
      extractHlsUrl(
        html,
        'https://cctv7.kctmc.nat.gov.tw/cgi-bin/live.cgi?cam=17&stream=1',
      ),
    ).toBe('https://cctv7.kctmc.nat.gov.tw/cam16_0/xxx.m3u8');
  });

  it('rejects a player page without an M3U8 source', () => {
    expect(() =>
      extractHlsUrl('<video src="movie.mp4"></video>', 'https://example.test/player'),
    ).toThrow('M3U8 source not found');
  });
});
