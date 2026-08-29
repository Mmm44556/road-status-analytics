import { describe, expect, it } from 'vitest';
import {
  RoadDirection,
  getRoadDirectionAngle,
  getRoadDirectionLabel,
} from '@/config/roadDirections';

describe('road direction labels', () => {
  it.each([
    [RoadDirection.North, '北向'],
    [RoadDirection.Northeast, '東北向'],
    [RoadDirection.East, '東向'],
    [RoadDirection.Southeast, '東南向'],
    [RoadDirection.South, '南向'],
    [RoadDirection.Southwest, '西南向'],
    [RoadDirection.West, '西向'],
    [RoadDirection.Northwest, '西北向'],
  ])('maps %s to %s', (direction, label) => {
    expect(getRoadDirectionLabel(direction)).toBe(label);
  });

  it('uses a fallback label for missing or unknown directions', () => {
    expect(getRoadDirectionLabel('')).toBe('未提供');
    expect(getRoadDirectionLabel('UNKNOWN')).toBe('未提供');
  });

  it.each([
    [RoadDirection.North, 0],
    [RoadDirection.Northeast, 45],
    [RoadDirection.East, 90],
    [RoadDirection.Southeast, 135],
    [RoadDirection.South, 180],
    [RoadDirection.Southwest, 225],
    [RoadDirection.West, 270],
    [RoadDirection.Northwest, 315],
  ])('rotates %s to %i degrees', (direction, angle) => {
    expect(getRoadDirectionAngle(direction)).toBe(angle);
  });

  it('does not return an angle for an unknown direction', () => {
    expect(getRoadDirectionAngle('UNKNOWN')).toBeNull();
  });
});
