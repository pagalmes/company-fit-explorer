import { describe, it, expect } from 'vitest';
import { useFirstTimeExperience } from '../useFirstTimeExperience';

describe('useFirstTimeExperience (no-op stub)', () => {
  it('always returns isFirstTime=false', () => {
    expect(useFirstTimeExperience().isFirstTime).toBe(false);
  });

  it('always returns hasChecked=true', () => {
    expect(useFirstTimeExperience().hasChecked).toBe(true);
  });

  it('markAsVisited is a no-op function', () => {
    expect(() => useFirstTimeExperience().markAsVisited()).not.toThrow();
  });

  it('resetFirstTime is a no-op function', () => {
    expect(() => useFirstTimeExperience().resetFirstTime()).not.toThrow();
  });
});
