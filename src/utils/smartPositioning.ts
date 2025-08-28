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
  
  console.log(`🎯 Finding smart position for ${newCompany.name} (${newCompany.matchScore}%) - target distance: ${targetDistance}px`);
  
  // Strategy 1: Try to place at target distance without moving anyone
  const directPlacement = tryDirectPlacement(newCompany, targetDistance, existingCompanies);
  if (directPlacement) {
    console.log(`✅ Direct placement successful for ${newCompany.name}`);
    return {
      newCompany: directPlacement,
      relocatedCompanies: [directPlacement],
      stableCompanies: existingCompanies,
      reason: 'Direct placement - no conflicts'
    };
  }
  
  // Strategy 2: Try small distance adjustment (±20px) without moving anyone
  const nearTargetPlacement = tryNearTargetPlacement(newCompany, targetDistance, existingCompanies);
  if (nearTargetPlacement) {
    console.log(`⚠️ Near-target placement for ${newCompany.name} at distance ${nearTargetPlacement.distance}`);
    return {
      newCompany: nearTargetPlacement,
      relocatedCompanies: [nearTargetPlacement],
      stableCompanies: existingCompanies,
      reason: `Minor distance adjustment to ${nearTargetPlacement.distance}px`
    };
  }
  
  // Strategy 3: Smart relocation - move 1-2 companies that would benefit from repositioning
  const smartRelocation = trySmartRelocation(newCompany, targetDistance, existingCompanies);
  if (smartRelocation) {
    console.log(`🔄 Smart relocation solution: moving ${smartRelocation.relocatedCompanies.length - 1} existing companies`);
    return smartRelocation;
  }
  
  // Strategy 4: Fallback - place at a reasonable distance with good angle separation
  const fallbackPlacement = createFallbackPlacement(newCompany, targetDistance, existingCompanies);
  console.log(`🚨 Fallback placement for ${newCompany.name} at distance ${fallbackPlacement.distance}`);
  
  return {
    newCompany: fallbackPlacement,
    relocatedCompanies: [fallbackPlacement],
    stableCompanies: existingCompanies,
    reason: `Fallback placement at ${fallbackPlacement.distance}px`
  };
};

/**
 * Try to place the company directly at target distance
 */
const tryDirectPlacement = (
  company: Company,
  targetDistance: number,
  existingCompanies: Company[]
): Company | null => {
  const minAngleSeparation = 15; // Degrees
  const minDistanceSeparation = 50; // Pixels
  
  // Try 24 angles (every 15 degrees)
  for (let i = 0; i < 24; i++) {
    const angle = (i * 15 + (company.id * 7) % 360) % 360; // Spread based on ID
    
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
 * Try placing near target distance (within ±20px)
 */
const tryNearTargetPlacement = (
  company: Company,
  targetDistance: number,
  existingCompanies: Company[]
): Company | null => {
  const distanceVariations = [
    targetDistance + 10,
    targetDistance - 10,
    targetDistance + 20,
    targetDistance - 20
  ].filter(d => d > 50); // Don't get too close to center
  
  for (const distance of distanceVariations) {
    const placement = tryDirectPlacement(company, distance, existingCompanies);
    if (placement) {
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
  
  // Use a distance that's reasonable (not too far from target)
  const fallbackDistance = Math.min(targetDistance + 50, 180);
  
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