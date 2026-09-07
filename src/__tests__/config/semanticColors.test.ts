import { describe, expect, it } from 'vitest';
import { uiColors } from '@/config/semanticColors';

describe('RouteSight brand colors', () => {
  it('uses the logo navy and mint as shared theme tokens', () => {
    expect(uiColors.brand.ink).toBe('#062B5B');
    expect(uiColors.brand.mint).toBe('#70E3C5');
    expect(uiColors.brand.soft).toBe('#E5F8F3');
  });

  it('defines shared surface, text, and border colors', () => {
    expect(uiColors.surface.page).toBe('#F3F7FA');
    expect(uiColors.text.primary).toBe('#102A43');
    expect(uiColors.border.default).toBe('#D7E2EA');
  });

  it('defines distinct loading and error feedback colors', () => {
    expect(uiColors.feedback.loading.surface).not.toBe(
      uiColors.feedback.error.surface,
    );
    expect(uiColors.feedback.loading.accent).toBe(uiColors.brand.teal);
    expect(uiColors.feedback.error.accent).toBe(uiColors.event.accident.main);
  });
});
