import { slugify } from './slug';

describe('slugify', () => {
  it('lowercases and joins words with dashes', () => {
    expect(slugify('Silk Road Fashion')).toBe('silk-road-fashion');
  });

  it('strips accents and symbols', () => {
    expect(slugify('  Café & Côte!! ')).toBe('cafe-cote');
  });

  it('falls back when nothing usable is left', () => {
    expect(slugify('Модный дом')).toBe('company');
  });
});
