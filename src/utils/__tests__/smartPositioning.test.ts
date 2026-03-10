import { describe, it, expect } from 'vitest';
import { findSmartPositioningSolution, isPositioningSolutionBeneficial } from '../smartPositioning';
import type { Company } from '../../types';

const makeCompany = (id: number, matchScore: number, angle = 0, distance = 100): Company => ({
  id,
  name: `Company ${id}`,
  logo: '',
  careerUrl: '',
  matchScore,
  industry: 'Tech',
  stage: 'Growth',
  location: 'SF',
  employees: '100',
  remote: 'Hybrid',
  openRoles: 1,
  connections: [],
  connectionTypes: {},
  matchReasons: [],
  color: '#000',
  angle,
  distance,
});

describe('findSmartPositioningSolution', { timeout: 5000 }, () => {
  it('returns a solution with required shape', () => {
    const newCo = makeCompany(1, 90);
    const result = findSmartPositioningSolution(newCo, []);
    expect(result).toHaveProperty('newCompany');
    expect(result).toHaveProperty('relocatedCompanies');
    expect(result).toHaveProperty('stableCompanies');
    expect(result).toHaveProperty('reason');
  });

  it('assigns an angle and distance to the new company', () => {
    const newCo = makeCompany(1, 90);
    const { newCompany } = findSmartPositioningSolution(newCo, []);
    expect(typeof newCompany.angle).toBe('number');
    expect(typeof newCompany.distance).toBe('number');
    expect(newCompany.distance).toBeGreaterThan(0);
  });

  it('places company via direct placement when graph is empty', () => {
    const newCo = makeCompany(1, 90);
    const { reason } = findSmartPositioningSolution(newCo, []);
    expect(reason).toMatch(/direct placement|no conflicts/i);
  });

  it('preserves existing company count in stableCompanies for empty graph', () => {
    const newCo = makeCompany(1, 90);
    const { stableCompanies } = findSmartPositioningSolution(newCo, []);
    expect(stableCompanies).toHaveLength(0);
  });

  it('keeps existing companies in stableCompanies when no relocation needed', () => {
    const existing = [makeCompany(2, 80, 180, 163)];
    const newCo = makeCompany(1, 95);
    const { stableCompanies } = findSmartPositioningSolution(newCo, existing);
    // Stable = untouched existing companies
    expect(stableCompanies).toHaveLength(existing.length);
  });

  it('includes new company in relocatedCompanies', () => {
    const newCo = makeCompany(1, 90);
    const { relocatedCompanies, newCompany } = findSmartPositioningSolution(newCo, []);
    expect(relocatedCompanies.some(c => c.id === newCompany.id)).toBe(true);
  });

  it('works with viewMode explore', () => {
    const newCo = makeCompany(1, 90);
    const result = findSmartPositioningSolution(newCo, [], 'explore');
    expect(result.newCompany.distance).toBeGreaterThan(0);
  });

  it('works with viewMode watchlist', () => {
    const newCo = makeCompany(1, 90);
    const result = findSmartPositioningSolution(newCo, [], 'watchlist');
    expect(result.newCompany.distance).toBeGreaterThan(0);
  });

  it('falls back gracefully when many companies fill available space', () => {
    // Create a dense grid of companies at every 10 degrees across rings 80-200
    const existing: Company[] = [];
    let id = 2;
    for (let d = 80; d <= 220; d += 15) {
      for (let a = 0; a < 360; a += 10) {
        existing.push(makeCompany(id++, 85, a, d));
      }
    }
    const newCo = makeCompany(1, 85);
    // Should not throw and should return a valid solution
    const result = findSmartPositioningSolution(newCo, existing);
    expect(result.newCompany.distance).toBeGreaterThan(0);
  });
});

describe('isPositioningSolutionBeneficial', { timeout: 5000 }, () => {
  it('returns true when only one company is relocated (new company only)', () => {
    const co = makeCompany(1, 90, 45, 85);
    const solution = {
      newCompany: co,
      relocatedCompanies: [co],
      stableCompanies: [],
      reason: 'direct',
    };
    expect(isPositioningSolutionBeneficial(solution)).toBe(true);
  });

  it('returns true when total improvement exceeds threshold', () => {
    const newCo = makeCompany(1, 90, 45, 85);
    // Mispositioned company: matchScore 50 → optimal ~195px but placed at 80px (error 115)
    const misCo = makeCompany(2, 50, 180, 80);
    const solution = {
      newCompany: newCo,
      relocatedCompanies: [newCo, { ...misCo, distance: 195 }],
      stableCompanies: [],
      reason: 'relocation',
    };
    expect(isPositioningSolutionBeneficial(solution, 20)).toBe(true);
  });

  it('returns false when total improvement is below threshold', () => {
    const newCo = makeCompany(1, 90, 45, 85);
    // Company already near optimal — distance off by only 5px
    const nearOptimalCo = makeCompany(2, 80, 90, 163);
    const solution = {
      newCompany: newCo,
      relocatedCompanies: [newCo, { ...nearOptimalCo, distance: 163 }],
      stableCompanies: [],
      reason: 'relocation',
    };
    // improvement = |163 - 163| = 0 < threshold 20
    expect(isPositioningSolutionBeneficial(solution, 20)).toBe(false);
  });

  it('uses default threshold of 20', () => {
    const newCo = makeCompany(1, 90, 45, 85);
    const misCo = makeCompany(2, 80, 90, 163);
    const solution = {
      newCompany: newCo,
      relocatedCompanies: [newCo, { ...misCo, distance: 163 }],
      stableCompanies: [],
      reason: 'relocation',
    };
    expect(isPositioningSolutionBeneficial(solution)).toBe(false);
  });
});
