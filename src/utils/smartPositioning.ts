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
  existingCompanies: Company[],
  viewMode?: 'explore' | 'watchlist'
): PositioningSolution => {
  const targetDistance = calculateDistanceFromScore(newCompany.matchScore);
  const companiesAtSimilarDistance = existingCompanies.filter(
    c => c.distance && Math.abs(c.distance - targetDistance) < 30
  ).length;

  console.log(`🎯 Finding smart position for ${newCompany.name} (score: ${newCompany.matchScore}%)`);
  console.log(`   Target distance: ${targetDistance}px | Existing companies: ${existingCompanies.length} | Near target ring: ${companiesAtSimilarDistance}`);

  // Strategy 1: Try to place at target distance without moving anyone (36 positions per ring)
  const directPlacement = tryDirectPlacement(newCompany, targetDistance, existingCompanies, 10, viewMode);
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
  const nearTargetPlacement = tryNearTargetPlacement(newCompany, targetDistance, existingCompanies, viewMode);
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
  const smartRelocation = trySmartRelocation(newCompany, targetDistance, existingCompanies, viewMode);
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
 * Convert polar coordinates (angle, distance) to cartesian (x, y)
 */
const polarToCartesian = (angle: number, distance: number): { x: number; y: number } => {
  const angleRad = (angle * Math.PI) / 180;
  return {
    x: Math.cos(angleRad) * distance,
    y: Math.sin(angleRad) * distance
  };
};

/**
 * Check if a circle (node) overlaps with a rectangle (label area)
 * Uses closest point method for accurate collision detection
 */
const circleRectCollision = (
  circleX: number,
  circleY: number,
  circleRadius: number,
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number
): boolean => {
  // Find the closest point on the rectangle to the circle's center
  const closestX = Math.max(rectX - rectWidth / 2, Math.min(circleX, rectX + rectWidth / 2));
  const closestY = Math.max(rectY - rectHeight / 2, Math.min(circleY, rectY + rectHeight / 2));

  // Calculate distance from circle's center to this closest point
  const distanceX = circleX - closestX;
  const distanceY = circleY - closestY;
  const distanceSquared = distanceX * distanceX + distanceY * distanceY;

  // Collision occurs if distance is less than circle's radius
  return distanceSquared < (circleRadius * circleRadius);
};

/**
 * Get the actual angle and distance for a company, considering view-specific positions
 */
const getCompanyPosition = (company: Company, viewMode?: 'explore' | 'watchlist'): { angle: number; distance: number } | null => {
  let angle: number | undefined;
  let distance: number | undefined;

  if (viewMode === 'explore' && company.explorePosition) {
    angle = company.explorePosition.angle;
    distance = company.explorePosition.distance;
  } else if (viewMode === 'watchlist' && company.watchlistPosition) {
    angle = company.watchlistPosition.angle;
    distance = company.watchlistPosition.distance;
  } else {
    // Fallback to global position
    angle = company.angle;
    distance = company.distance;
  }

  if (angle === undefined || distance === undefined) return null;
  return { angle, distance };
};

/**
 * Try to place the company directly at target distance
 * Uses actual coordinate-based collision detection for nodes and labels
 */
const tryDirectPlacement = (
  company: Company,
  targetDistance: number,
  existingCompanies: Company[],
  angleIncrement: number = 10, // Default to 10 degrees (36 positions per ring)
  viewMode?: 'explore' | 'watchlist' // View mode to use correct positions
): Company | null => {
  const nodeRadius = 15; // Company nodes are 25px diameter (12.5px radius), add buffer
  const labelWidth = 60; // Label width from graphDataTransform
  const labelHeight = 15; // Label height
  const nameLabelOffset = 20; // Name label positioned at +20px
  const percentLabelOffset = 26; // Percent label positioned at +26px

  const numPositions = Math.floor(360 / angleIncrement); // 36 positions with 10° increment
  const startAngle = (company.id * 7) % 360; // Deterministic but varied start based on ID

  // Try all angles around the ring
  for (let i = 0; i < numPositions; i++) {
    const angle = (startAngle + (i * angleIncrement)) % 360;
    const newNodePos = polarToCartesian(angle, targetDistance);

    let conflictDetails: string[] = [];
    const hasConflict = existingCompanies.some(existing => {
      // Get the actual position for the existing company in the current view
      const existingPos = getCompanyPosition(existing, viewMode);
      if (!existingPos) {
        console.log(`⚠️ No position found for ${existing.name} in viewMode=${viewMode}`);
        return false;
      }

      const existingNodePos = polarToCartesian(existingPos.angle, existingPos.distance);

      // Check 1: Node-to-node collision (circle-circle)
      const nodeDistance = Math.sqrt(
        Math.pow(newNodePos.x - existingNodePos.x, 2) +
        Math.pow(newNodePos.y - existingNodePos.y, 2)
      );
      const nodeConflict = nodeDistance < (nodeRadius * 2);
      if (nodeConflict) {
        conflictDetails.push(`node-to-node with ${existing.name} (distance: ${nodeDistance.toFixed(1)}px < ${nodeRadius * 2}px)`);
      }

      // Check 2: New node overlapping existing node's labels
      // Existing node has 2 labels below it (name at +20px, percent at +26px)
      const existingNameLabelPos = polarToCartesian(existingPos.angle, existingPos.distance + nameLabelOffset);
      const existingPercentLabelPos = polarToCartesian(existingPos.angle, existingPos.distance + percentLabelOffset);

      const newNodeCoversExistingNameLabel = circleRectCollision(
        newNodePos.x, newNodePos.y, nodeRadius,
        existingNameLabelPos.x, existingNameLabelPos.y, labelWidth, labelHeight
      );
      if (newNodeCoversExistingNameLabel) {
        conflictDetails.push(`new node covers ${existing.name}'s name label`);
      }

      const newNodeCoversExistingPercentLabel = circleRectCollision(
        newNodePos.x, newNodePos.y, nodeRadius,
        existingPercentLabelPos.x, existingPercentLabelPos.y, labelWidth, labelHeight
      );
      if (newNodeCoversExistingPercentLabel) {
        conflictDetails.push(`new node covers ${existing.name}'s percent label`);
      }

      // Check 3: Existing node overlapping new node's labels
      const newNameLabelPos = polarToCartesian(angle, targetDistance + nameLabelOffset);
      const newPercentLabelPos = polarToCartesian(angle, targetDistance + percentLabelOffset);

      const existingNodeCoversNewNameLabel = circleRectCollision(
        existingNodePos.x, existingNodePos.y, nodeRadius,
        newNameLabelPos.x, newNameLabelPos.y, labelWidth, labelHeight
      );
      if (existingNodeCoversNewNameLabel) {
        conflictDetails.push(`${existing.name} node covers new name label`);
      }

      const existingNodeCoversNewPercentLabel = circleRectCollision(
        existingNodePos.x, existingNodePos.y, nodeRadius,
        newPercentLabelPos.x, newPercentLabelPos.y, labelWidth, labelHeight
      );
      if (existingNodeCoversNewPercentLabel) {
        conflictDetails.push(`${existing.name} node covers new percent label`);
      }

      return nodeConflict ||
             newNodeCoversExistingNameLabel ||
             newNodeCoversExistingPercentLabel ||
             existingNodeCoversNewNameLabel ||
             existingNodeCoversNewPercentLabel;
    });

    if (!hasConflict) {
      console.log(`✅ Found valid position for ${company.name} at angle ${angle}°, distance ${targetDistance}px`);
      return {
        ...company,
        angle: Math.round(angle),
        distance: targetDistance
      };
    } else if (conflictDetails.length > 0) {
      console.log(`❌ Angle ${angle}° blocked for ${company.name}: ${conflictDetails.join(', ')}`);
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
  existingCompanies: Company[],
  viewMode?: 'explore' | 'watchlist'
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
    const placement = tryDirectPlacement(company, distance, existingCompanies, 10, viewMode);
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
  existingCompanies: Company[],
  viewMode?: 'explore' | 'watchlist'
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
  const newCompanyPlacement = tryDirectPlacement(newCompany, targetDistance, remainingCompanies, 10, viewMode);
  if (!newCompanyPlacement) return null;

  const relocatedPlacement = tryDirectPlacement(
    candidateToMove.company,
    candidateToMove.optimalDistance,
    [...remainingCompanies, newCompanyPlacement],
    10,
    viewMode
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