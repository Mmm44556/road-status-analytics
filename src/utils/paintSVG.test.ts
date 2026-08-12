import { describe, expect, it } from 'vitest';
import { paintPathToIcon } from './paintSVG';

function decodeSvg(dataUri: string) {
  return Buffer.from(dataUri.split(',')[1], 'base64').toString('utf8');
}

describe('paintPathToIcon', () => {
  it('renders the configured background and foreground colors', () => {
    const svg = decodeSvg(
      paintPathToIcon({
        content: '<path d="M0 0h24v24H0z" />',
        iconBackground: '#EEF2F1',
        iconColor: '#C33A4A',
      }),
    );

    expect(svg).toContain('fill="#EEF2F1"');
    expect(svg).toContain('fill="#C33A4A"');
  });
});
