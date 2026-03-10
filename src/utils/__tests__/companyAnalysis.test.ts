import { describe, it, expect } from 'vitest';
import { analyzeCompanyPositioning, generateOptimizedPositions } from '../companyAnalysis';
import type { Company } from '../../types';

const makeCompany = (overrides: Partial<Company> & { id: number; matchScore: number }): Company => ({
  name: `Company ${overrides.id}`,
  industry: 'Technology',
  stage: 'Series A',
  employees: '50-200',
  location: 'SF',
  remote: 'Hybrid',
  matchReasons: [],
  color: '#3b82f6',
  connections: [],
  connectionTypes: {},
  logo: 'https://ui-avatars.com/api/?name=C',
  careerUrl: 'https://example.com/careers',
  openRoles: 2,
  angle: 45,
  distance: 150,
  ...overrides,
});

describe('analyzeCompanyPositioning', () => {
  it('returns empty analyses and collisions for empty input', () => {
    const result = analyzeCompanyPositioning([]);
    expect(result.analyses).toEqual([]);
    expect(result.collisions).toEqual([]);
    expect(result.summary.totalCompanies).toBe(0);
  });

  it('analyzes a single company', () => {
    const company = makeCompany({ id: 1, matchScore: 80, distance: 120, angle: 45 });
    const result = analyzeCompanyPositioning([company]);
    expect(result.analyses).toHaveLength(1);
    expect(result.analyses[0].company).toBe(company);
    expect(typeof result.analyses[0].targetDistance).toBe('number');
    expect(typeof result.analyses[0].currentDistance).toBe('number');
    expect(typeof result.analyses[0].error).toBe('number');
    expect(typeof result.analyses[0].shouldReposition).toBe('boolean');
  });

  it('marks company as needing reposition when error > 25px', () => {
    // matchScore 80 → targetDistance around 120; set distance far away
    const company = makeCompany({ id: 1, matchScore: 80, distance: 10, angle: 45 });
    const result = analyzeCompanyPositioning([company]);
    expect(result.analyses[0].shouldReposition).toBe(true);
  });

  it('does not mark company as needing reposition when close to target', () => {
    // matchScore 80 → calculateDistanceFromScore(80) = 163
    // Set distance = 163 (exact) → error = 0, shouldReposition = false
    const company = makeCompany({ id: 1, matchScore: 80, distance: 163, angle: 45 });
    const result = analyzeCompanyPositioning([company]);
    expect(result.analyses[0].shouldReposition).toBe(false);
  });

  it('detects collision between overlapping companies', () => {
    // Two companies at nearly identical angles and distances → visual overlap
    const c1 = makeCompany({ id: 1, matchScore: 80, angle: 45, distance: 150 });
    const c2 = makeCompany({ id: 2, matchScore: 80, angle: 46, distance: 150 });
    const result = analyzeCompanyPositioning([c1, c2]);
    const collisions = result.collisions.filter(c => c.hasCollision);
    expect(collisions.length).toBeGreaterThan(0);
  });

  it('flags close angles even without visual collision', () => {
    // angleDiff < 10 triggers even if no visual collision
    const c1 = makeCompany({ id: 1, matchScore: 80, angle: 45, distance: 150 });
    const c2 = makeCompany({ id: 2, matchScore: 80, angle: 50, distance: 300 }); // far apart, close angle
    const result = analyzeCompanyPositioning([c1, c2]);
    // angleDiff = 5, which is < 10 → should be flagged
    expect(result.collisions.length).toBeGreaterThan(0);
  });

  it('does not detect collision for well-separated companies', () => {
    const c1 = makeCompany({ id: 1, matchScore: 90, angle: 0, distance: 100 });
    const c2 = makeCompany({ id: 2, matchScore: 50, angle: 180, distance: 200 });
    const result = analyzeCompanyPositioning([c1, c2]);
    expect(result.collisions.filter(c => c.hasCollision)).toHaveLength(0);
  });

  it('skips collision check when angle/distance missing', () => {
    const c1 = makeCompany({ id: 1, matchScore: 80, angle: undefined, distance: undefined });
    const c2 = makeCompany({ id: 2, matchScore: 80, angle: 45, distance: 150 });
    const result = analyzeCompanyPositioning([c1, c2]);
    // Should not throw, no collision detected
    expect(result.collisions.filter(c => c.hasCollision)).toHaveLength(0);
  });

  it('summary counts poorly positioned companies', () => {
    const companies = [
      makeCompany({ id: 1, matchScore: 80, distance: 10 }),  // very off (target=163, error=153)
      makeCompany({ id: 2, matchScore: 80, distance: 163 }), // exact target → error=0
    ];
    const result = analyzeCompanyPositioning(companies);
    expect(result.summary.poorlyPositioned).toBe(1);
    expect(result.summary.totalCompanies).toBe(2);
  });

  it('calculates avgError', () => {
    const company = makeCompany({ id: 1, matchScore: 80, distance: 50 });
    const result = analyzeCompanyPositioning([company]);
    expect(result.summary.avgError).toBeGreaterThan(0);
  });
});

describe('generateOptimizedPositions', () => {
  it('returns same number of companies', () => {
    const companies = [
      makeCompany({ id: 1, matchScore: 90 }),
      makeCompany({ id: 2, matchScore: 70 }),
      makeCompany({ id: 3, matchScore: 50 }),
    ];
    const result = generateOptimizedPositions(companies);
    expect(result).toHaveLength(3);
  });

  it('preserves company data', () => {
    const companies = [makeCompany({ id: 1, matchScore: 85, name: 'Stripe' })];
    const result = generateOptimizedPositions(companies);
    expect(result[0].name).toBe('Stripe');
    expect(result[0].matchScore).toBe(85);
  });

  it('assigns angle and distance to each company', () => {
    const companies = [makeCompany({ id: 1, matchScore: 85 })];
    const result = generateOptimizedPositions(companies);
    expect(typeof result[0].angle).toBe('number');
    expect(typeof result[0].distance).toBe('number');
  });

  it('returns empty array for empty input', () => {
    expect(generateOptimizedPositions([])).toEqual([]);
  });

  it('handles many companies without throwing', () => {
    const companies = Array.from({ length: 20 }, (_, i) =>
      makeCompany({ id: i + 1, matchScore: Math.max(10, 100 - i * 4) })
    );
    expect(() => generateOptimizedPositions(companies)).not.toThrow();
  });

  it('places higher-scored companies at closer distances', () => {
    const companies = [
      makeCompany({ id: 1, matchScore: 95 }),
      makeCompany({ id: 2, matchScore: 30 }),
    ];
    const result = generateOptimizedPositions(companies);
    const high = result.find(c => c.matchScore === 95)!;
    const low = result.find(c => c.matchScore === 30)!;
    expect(high.distance).toBeLessThan(low.distance);
  });
});
