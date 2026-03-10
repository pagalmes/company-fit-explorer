import { describe, it, expect } from 'vitest';
import {
  createRelocationPlan,
  generateAnimationDelays,
  calculateVisualImpact,
} from '../companyRelocation';
import type { Company } from '../../types';

// Minimal Company fixture — only fields needed by relocation logic
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

describe('createRelocationPlan', { timeout: 5000 }, () => {
  it('returns a result object with required keys', () => {
    const newCo = makeCompany(1, 90, 0, 0);
    const result = createRelocationPlan(newCo, []);
    expect(result).toHaveProperty('relocatedCompanies');
    expect(result).toHaveProperty('animationPlan');
    expect(result).toHaveProperty('stableCompanies');
  });

  it('includes the new company in relocatedCompanies', () => {
    const newCo = makeCompany(1, 90, 0, 0);
    const { relocatedCompanies } = createRelocationPlan(newCo, []);
    expect(relocatedCompanies.some(c => c.id === 1)).toBe(true);
  });

  it('does not lose any companies in the result', () => {
    const existing = [makeCompany(2, 80, 90, 120), makeCompany(3, 70, 180, 140)];
    const newCo = makeCompany(1, 95, 0, 0);
    const { relocatedCompanies } = createRelocationPlan(newCo, existing);
    expect(relocatedCompanies).toHaveLength(3);
  });

  it('marks stable company (already at correct distance) in stableCompanies', () => {
    // matchScore 80 → distance ~163; place company exactly there (within 20px tolerance)
    const existing = [makeCompany(2, 80, 90, 163)];
    const newCo = makeCompany(1, 95, 0, 0);
    const { stableCompanies } = createRelocationPlan(newCo, existing);
    expect(stableCompanies).toContain(2);
  });

  it('assigns high priority to new company in animation plan', () => {
    const newCo = makeCompany(1, 95, 0, 0);
    const { animationPlan } = createRelocationPlan(newCo, []);
    const newEntry = animationPlan.find(p => p.companyId === 1);
    expect(newEntry?.priority).toBe('high');
  });

  it('creates correct reason for new company', () => {
    const newCo = makeCompany(1, 95, 0, 0);
    const { animationPlan } = createRelocationPlan(newCo, []);
    const entry = animationPlan.find(p => p.companyId === 1);
    expect(entry?.reason).toBe('New company addition');
  });

  it('produces unique angles for multiple companies with same score', () => {
    const existing = [
      makeCompany(2, 90, 0, 0),
      makeCompany(3, 90, 0, 0),
    ];
    const newCo = makeCompany(1, 90, 0, 0);
    const { relocatedCompanies } = createRelocationPlan(newCo, existing);
    const angles = relocatedCompanies.map(c => c.angle);
    // Angles should not all be identical
    const uniqueAngles = new Set(angles);
    expect(uniqueAngles.size).toBeGreaterThan(1);
  });
});

describe('generateAnimationDelays', { timeout: 5000 }, () => {
  it('returns a Map with entries for each plan', () => {
    const plans = [
      { companyId: 1, priority: 'high' as const, currentPosition: { angle: 0, distance: 100 }, targetPosition: { angle: 45, distance: 150 }, reason: 'test' },
      { companyId: 2, priority: 'medium' as const, currentPosition: { angle: 90, distance: 120 }, targetPosition: { angle: 135, distance: 160 }, reason: 'test' },
      { companyId: 3, priority: 'low' as const, currentPosition: { angle: 180, distance: 140 }, targetPosition: { angle: 225, distance: 180 }, reason: 'test' },
    ];
    const delays = generateAnimationDelays(plans);
    expect(delays).toBeInstanceOf(Map);
    expect(delays.size).toBe(3);
  });

  it('gives high priority items smaller delays than low priority', () => {
    const plans = [
      { companyId: 1, priority: 'high' as const, currentPosition: { angle: 0, distance: 100 }, targetPosition: { angle: 10, distance: 110 }, reason: 'a' },
      { companyId: 2, priority: 'low' as const, currentPosition: { angle: 90, distance: 150 }, targetPosition: { angle: 100, distance: 160 }, reason: 'b' },
    ];
    const delays = generateAnimationDelays(plans);
    expect(delays.get(1)!).toBeLessThan(delays.get(2)!);
  });

  it('medium priority delay is between high and low', () => {
    const plans = [
      { companyId: 1, priority: 'high' as const, currentPosition: { angle: 0, distance: 100 }, targetPosition: { angle: 10, distance: 110 }, reason: 'a' },
      { companyId: 2, priority: 'medium' as const, currentPosition: { angle: 45, distance: 120 }, targetPosition: { angle: 55, distance: 130 }, reason: 'b' },
      { companyId: 3, priority: 'low' as const, currentPosition: { angle: 90, distance: 140 }, targetPosition: { angle: 100, distance: 150 }, reason: 'c' },
    ];
    const delays = generateAnimationDelays(plans);
    expect(delays.get(2)!).toBeGreaterThan(delays.get(1)!);
    expect(delays.get(2)!).toBeLessThan(delays.get(3)!);
  });

  it('returns empty Map for empty input', () => {
    const delays = generateAnimationDelays([]);
    expect(delays.size).toBe(0);
  });
});

describe('calculateVisualImpact', { timeout: 5000 }, () => {
  it('returns 0 for no movement', () => {
    const plans = [
      { companyId: 1, priority: 'low' as const, currentPosition: { angle: 45, distance: 100 }, targetPosition: { angle: 45, distance: 100 }, reason: 'none' },
    ];
    expect(calculateVisualImpact(plans)).toBe(0);
  });

  it('returns a positive number when there is movement', () => {
    const plans = [
      { companyId: 1, priority: 'high' as const, currentPosition: { angle: 0, distance: 80 }, targetPosition: { angle: 90, distance: 160 }, reason: 'test' },
    ];
    expect(calculateVisualImpact(plans)).toBeGreaterThan(0);
  });

  it('larger movement produces larger impact score', () => {
    const smallMove = [
      { companyId: 1, priority: 'low' as const, currentPosition: { angle: 0, distance: 100 }, targetPosition: { angle: 10, distance: 105 }, reason: 'small' },
    ];
    const bigMove = [
      { companyId: 1, priority: 'high' as const, currentPosition: { angle: 0, distance: 80 }, targetPosition: { angle: 180, distance: 200 }, reason: 'big' },
    ];
    expect(calculateVisualImpact(bigMove)).toBeGreaterThan(calculateVisualImpact(smallMove));
  });

  it('handles multiple plans by averaging', () => {
    const plans = [
      { companyId: 1, priority: 'low' as const, currentPosition: { angle: 0, distance: 100 }, targetPosition: { angle: 0, distance: 100 }, reason: 'none' },
      { companyId: 2, priority: 'high' as const, currentPosition: { angle: 0, distance: 80 }, targetPosition: { angle: 90, distance: 160 }, reason: 'move' },
    ];
    const impact = calculateVisualImpact(plans);
    // Should be > 0 (because one item moves) but < the single-item impact
    const singleImpact = calculateVisualImpact([plans[1]]);
    expect(impact).toBeGreaterThan(0);
    expect(impact).toBeLessThan(singleImpact);
  });
});
