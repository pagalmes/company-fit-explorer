import { describe, it, expect } from 'vitest';
import { activeUserProfile, sampleCompanies } from '../companies';

describe('companies data exports', () => {
  it('exports activeUserProfile as an object', () => {
    expect(typeof activeUserProfile).toBe('object');
    expect(activeUserProfile).not.toBeNull();
  });

  it('activeUserProfile has an id string', () => {
    expect(typeof activeUserProfile.id).toBe('string');
    expect(activeUserProfile.id.length).toBeGreaterThan(0);
  });

  it('exports sampleCompanies as an array', () => {
    expect(Array.isArray(sampleCompanies)).toBe(true);
  });
});
