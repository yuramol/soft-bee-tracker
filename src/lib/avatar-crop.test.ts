import { describe, expect, it } from 'vitest';

import { clampCrop, getCoverScale, getCropSourceRect } from '@/lib/avatar-crop';

const landscape = { width: 1000, height: 500 };

describe('getCoverScale', () => {
  it('scales the shorter side to fill the viewport', () => {
    expect(getCoverScale(landscape, 250)).toBe(0.5);
    expect(getCoverScale({ width: 500, height: 1000 }, 250)).toBe(0.5);
  });
});

describe('clampCrop', () => {
  it('limits panning so the image always covers the viewport', () => {
    // at zoom 1 the 1000x500 image renders 500x250 in a 250 viewport: 125px of horizontal slack per side
    expect(clampCrop({ zoom: 1, x: 400, y: 50 }, landscape, 250)).toEqual({ zoom: 1, x: 125, y: 0 });
    expect(clampCrop({ zoom: 1, x: -400, y: 0 }, landscape, 250)).toEqual({ zoom: 1, x: -125, y: 0 });
  });

  it('keeps zoom within bounds and allows more panning when zoomed in', () => {
    expect(clampCrop({ zoom: 10, x: 0, y: 1000 }, landscape, 250)).toEqual({ zoom: 3, x: 0, y: 250 });
    expect(clampCrop({ zoom: 0.2, x: 0, y: 0 }, landscape, 250).zoom).toBe(1);
  });
});

describe('getCropSourceRect', () => {
  it('takes the centred square by default', () => {
    expect(getCropSourceRect({ zoom: 1, x: 0, y: 0 }, landscape, 250)).toEqual({ x: 250, y: 0, size: 500 });
  });

  it('follows the pan offset and zoom', () => {
    // panning the image right reveals its left edge
    expect(getCropSourceRect({ zoom: 1, x: 125, y: 0 }, landscape, 250)).toEqual({ x: 0, y: 0, size: 500 });
    expect(getCropSourceRect({ zoom: 2, x: 0, y: 0 }, landscape, 250)).toEqual({ x: 375, y: 125, size: 250 });
  });
});
