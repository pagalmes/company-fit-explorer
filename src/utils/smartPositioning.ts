/**
 * Smart Positioning System
 * 
 * Handles intelligent company positioning with minimal disruption.
 * Only relocates companies when there's a clear benefit and uses
 * surgical repositioning rather than mass relocation.
 */

import { Company } from '../types';
import { calculateDistanceFromScore } from './companyPositioning';

interface PositioningSolution {
  newCompany: Company;
  relocatedCompanies: Company[];
  stableCompanies: Company[];
  reason: string;
}

/**
 * Find the best positioning solution for a new company
 * Uses intelligent strategies to minimize disruption
 */
export const findSmartPositioningSolution = (
  newCompany: Company,
  existingCompanies: Company[]
): PositioningSolution => {
  const targetDistance = calculateDistanceFromScore(newCompany.matchScore);
  const companiesAtSimilarDistance = existingCompanies.filter(
    c => c.distance && Math.abs(c.distance - targetDistance) < 30
  ).length;

  console.log(`🎯 Finding smart position for ${newCompany.name} (score: ${newCompany.matchScore}%)`);
  console.log(`   Target distance: ${targetDistance}px | Existing companies: ${existingCompanies.length} | Near target ring: ${companiesAtSimilarDistance}`);

  // Strategy 1: Try to place at target distance without moving anyone (36 positions per ring)
  const directPlacement = tryDirectPlacement(newCompany, targetDistance, existingCompanies);
  if (directPlacement) {
    console.log(`✅ Direct placement at ${directPlacement.distance}px, angle ${directPlacement.angle}°`);
    return {
      newCompany: directPlacement,
      relocatedCompanies: [directPlacement],
      stableCompanies: existingCompanies,
      reason: 'Direct placement - no conflicts'
    };
  }

  console.log(`   ⚠️ Target ring (${targetDistance}px) is full, trying nearby rings...`);

  // Strategy 2: Try expanding/contracting rings (±10px increments up to ±60px)
  const nearTargetPlacement = tryNearTargetPlacement(newCompany, targetDistance, existingCompanies);
  if (nearTargetPlacement && nearTargetPlacement.distance) {
    const deviation = Math.abs(nearTargetPlacement.distance - targetDistance);
    console.log(`✅ Near-target placement at ${nearTargetPlacement.distance}px, angle ${nearTargetPlacement.angle}° (deviation: ${deviation}px)`);
    return {
      newCompany: nearTargetPlacement,
      relocatedCompanies: [nearTargetPlacement],
      stableCompanies: existingCompanies,
      reason: `Nearby ring at ${nearTargetPlacement.distance}px (target: ${targetDistance}px)`
    };
  }

  console.log(`   ⚠️ Nearby rings also full, checking for relocation opportunities...`);

  // Strategy 3: Smart relocation - move 1-2 companies that would benefit from repositioning
  const smartRelocation = trySmartRelocation(newCompany, targetDistance, existingCompanies);
  if (smartRelocation) {
    console.log(`✅ Smart relocation: ${smartRelocation.reason}`);
    return smartRelocation;
  }

  console.log(`   🚨 No relocation opportunities, using fallback placement...`);

  // Strategy 4: Fallback - place beyond existing companies in least crowded sector
  const fallbackPlacement = createFallbackPlacement(newCompany, targetDistance, existingCompanies);

  return {
    newCompany: fallbackPlacement,
    relocatedCompanies: [fallbackPlacement],
    stableCompanies: existingCompanies,
    reason: `Fallback - outer ring at ${fallbackPlacement.distance}px`
  };
};

/**
 * Try to place the company directly at target distance
 */
const tryDirectPlacement = (
  company: Company,
  targetDistance: number,
  existingCompanies: Company[],
  angleIncrement: number = 10 // Default to 10 degrees (36 positions per ring)
): Company | null => {
  const minAngleSeparation = angleIncrement; // Use same as increment for consistent spacing
  const minDistanceSeparation = 50; // Pixels

  const numPositions = Math.floor(360 / angleIncrement); // 36 positions with 10° increment
  const startAngle = (company.id * 7) % 360; // Deterministic but varied start based on ID

  // Try all angles around the ring
  for (let i = 0; i < numPositions; i++) {
    const angle = (startAngle + (i * angleIncrement)) % 360;

    const hasConflict = existingCompanies.some(existing => {
      if (!existing.angle || !existing.distance) return false;

      const angleDiff = Math.min(
        Math.abs(angle - existing.angle),
        360 - Math.abs(angle - existing.angle)
      );

      const distanceDiff = Math.abs(targetDistance - existing.distance);

      // Check for both angle and distance conflicts
      return (angleDiff < minAngleSeparation && distanceDiff < minDistanceSeparation);
    });

    if (!hasConflict) {
      return {
        ...company,
        angle: Math.round(angle),
        distance: targetDistance
      };
    }
  }

  return null;
};

/**
 * Try placing near target distance with expanding rings
 * Supports going beyond current max distance if needed
 */
const tryNearTargetPlacement = (
  company: Company,
  targetDistance: number,
  existingCompanies: Company[]
): Company | null => {
  // Try expanding rings in increments of 10px, up to ±60px from target
  // This allows placement beyond the typical max distance (195px) if all inner rings are full
  const maxExpansion = 60;
  const ringIncrement = 10;

  const distanceVariations: number[] = [];

  // Build alternating pattern: +10, -10, +20, -20, +30, -30, etc.
  for (let expansion = ringIncrement; expansion <= maxExpansion; expansion += ringIncrement) {
    distanceVariations.push(targetDistance + expansion);
    if (targetDistance - expansion > 50) { // Don't get too close to center
      distanceVariations.push(targetDistance - expansion);
    }
  }

  // If target distance is near max (195px) and we've exhausted nearby rings,
  // try further out to ensure we can always place companies
  if (targetDistance > 150) {
    for (let expansion = maxExpansion + ringIncrement; expansion <= 120; expansion += ringIncrement) {
      distanceVariations.push(targetDistance + expansion);
    }
  }

  for (const distance of distanceVariations) {
    const placement = tryDirectPlacement(company, distance, existingCompanies);
    if (placement) {
      const deviation = Math.abs(distance - targetDistance);
      console.log(`📍 Placed ${company.name} at ${distance}px (target: ${targetDistance}px, deviation: ${deviation}px)`);
      return { ...placement, distance };
    }
  }

  return null;
};

/**
 * Try smart relocation - identify 1-2 companies that would benefit from moving
 */
const trySmartRelocation = (
  newCompany: Company,
  targetDistance: number,
  existingCompanies: Company[]
): PositioningSolution | null => {
  // Find companies that are poorly positioned (far from their optimal distance)
  const poorlyPositioned = existingCompanies
    .map(company => ({
      company,
      currentDistance: company.distance || 0,
      optimalDistance: calculateDistanceFromScore(company.matchScore),
      error: Math.abs((company.distance || 0) - calculateDistanceFromScore(company.matchScore))
    }))
    .filter(item => item.error > 30) // Only consider significantly mispositioned companies
    .sort((a, b) => b.error - a.error) // Sort by worst positioning first
    .slice(0, 2); // Only consider top 2 candidates for relocation
  
  if (poorlyPositioned.length === 0) {
    return null; // No good candidates for relocation
  }
  
  // Try relocating the worst-positioned company
  const candidateToMove = poorlyPositioned[0];
  const remainingCompanies = existingCompanies.filter(c => c.id !== candidateToMove.company.id);
  
  // Try to place both the new company and the relocated company optimally
  const newCompanyPlacement = tryDirectPlacement(newCompany, targetDistance, remainingCompanies);
  if (!newCompanyPlacement) return null;
  
  const relocatedPlacement = tryDirectPlacement(
    candidateToMove.company,
    candidateToMove.optimalDistance,
    [...remainingCompanies, newCompanyPlacement]
  );
  if (!relocatedPlacement) return null;
  
  return {
    newCompany: newCompanyPlacement,
    relocatedCompanies: [newCompanyPlacement, relocatedPlacement],
    stableCompanies: remainingCompanies,
    reason: `Relocated ${candidateToMove.company.name} from ${candidateToMove.currentDistance}px to ${candidateToMove.optimalDistance}px (error reduction: ${candidateToMove.error.toFixed(0)}px)`
  };
};

/**
 * Create a fallback placement that's reasonable even if not optimal
 * Guarantees placement by finding the least crowded sector and distance ring
 */
const createFallbackPlacement = (
  company: Company,
  targetDistance: number,
  existingCompanies: Company[]
): Company => {
  // Find the least crowded sector (90-degree quadrants)
  const sectors = [0, 90, 180, 270];
  const sectorCrowding = sectors.map(sectorStart => {
    const sectorEnd = (sectorStart + 90) % 360;
    const companiesInSector = existingCompanies.filter(c => {
      if (!c.angle) return false;
      const angle = c.angle;
      return sectorStart <= sectorEnd
        ? (angle >= sectorStart && angle < sectorEnd)
        : (angle >= sectorStart || angle < sectorEnd);
    }).length;

    return { sector: sectorStart, crowding: companiesInSector };
  });

  const leastCrowdedSector = sectorCrowding.sort((a, b) => a.crowding - b.crowding)[0];

  // Place in the middle of the least crowded sector
  const angle = (leastCrowdedSector.sector + 45) % 360;

  // Find the outermost existing company to determine safe fallback distance
  const maxExistingDistance = existingCompanies.reduce(
    (max, c) => Math.max(max, c.distance || 0),
    0
  );

  // Place beyond all existing companies, or at target + 80px, whichever is greater
  // This ensures we can always add companies even when graph is very crowded
  const fallbackDistance = Math.max(
    targetDistance + 80,
    maxExistingDistance + 30,
    220 // Minimum fallback distance to ensure visibility
  );

  console.log(`🚨 Fallback placement for ${company.name}: sector=${leastCrowdedSector.sector}°-${(leastCrowdedSector.sector + 90) % 360}° (${leastCrowdedSector.crowding} companies), distance=${fallbackDistance}px (target: ${targetDistance}px, max existing: ${maxExistingDistance}px)`);

  return {
    ...company,
    angle: Math.round(angle),
    distance: fallbackDistance
  };
};

/**
 * Check if a positioning solution is beneficial
 */
export const isPositioningSolutionBeneficial = (
  solution: PositioningSolution,
  threshold: number = 20
): boolean => {
  // Always beneficial if we're only adding one company
  if (solution.relocatedCompanies.length === 1) {
    return true;
  }
  
  // For relocations, check if the total positioning error is reduced
  const totalImprovement = solution.relocatedCompanies
    .filter(c => c.id !== solution.newCompany.id) // Exclude the new company
    .reduce((sum, company) => {
      const optimal = calculateDistanceFromScore(company.matchScore);
      const improvement = Math.abs((company.distance || 0) - optimal);
      return sum + improvement;
    }, 0);
  
  return totalImprovement > threshold;
};