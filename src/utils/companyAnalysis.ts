/**
 * Company Positioning Analysis
 * 
 * Analyzes all companies for positioning consistency and collisions
 */

import { Company } from '../types';
import { calculateDistanceFromScore } from './companyPositioning';

interface PositionAnalysis {
  company: Company;
  targetDistance: number;
  currentDistance: number;
  error: number;
  shouldReposition: boolean;
}

interface CollisionAnalysis {
  company1: Company;
  company2: Company;
  angleDifference: number;
  distanceDifference: number;
  visualDistance: number;
  hasCollision: boolean;
}

/**
 * Analyze all companies for positioning consistency
 */
export const analyzeCompanyPositioning = (companies: Company[]): {
  analyses: PositionAnalysis[];
  collisions: CollisionAnalysis[];
  summary: {
    totalCompanies: number;
    poorlyPositioned: number;
    collisions: number;
    avgError: number;
  };
} => {
  // Analyze positioning errors
  const analyses: PositionAnalysis[] = companies.map(company => {
    const targetDistance = calculateDistanceFromScore(company.matchScore);
    const currentDistance = company.distance || 0;
    const error = Math.abs(targetDistance - currentDistance);
    
    return {
      company,
      targetDistance,
      currentDistance,
      error,
      shouldReposition: error > 25 // More than 25px off
    };
  });

  // Analyze collisions
  const collisions: CollisionAnalysis[] = [];
  const minVisualDistance = 50; // Minimum visual separation needed
  
  for (let i = 0; i < companies.length; i++) {
    for (let j = i + 1; j < companies.length; j++) {
      const c1 = companies[i];
      const c2 = companies[j];
      
      if (!c1.angle || !c1.distance || !c2.angle || !c2.distance) continue;
      
      const angleDiff = Math.min(
        Math.abs(c1.angle - c2.angle),
        360 - Math.abs(c1.angle - c2.angle)
      );
      const distanceDiff = Math.abs(c1.distance - c2.distance);
      
      // Calculate actual visual distance using polar coordinates
      const x1 = Math.cos(c1.angle * Math.PI / 180) * c1.distance;
      const y1 = Math.sin(c1.angle * Math.PI / 180) * c1.distance;
      const x2 = Math.cos(c2.angle * Math.PI / 180) * c2.distance;
      const y2 = Math.sin(c2.angle * Math.PI / 180) * c2.distance;
      const visualDistance = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
      
      const hasCollision = visualDistance < minVisualDistance;
      
      if (hasCollision || angleDiff < 10) { // Also flag close angles
        collisions.push({
          company1: c1,
          company2: c2,
          angleDifference: angleDiff,
          distanceDifference: distanceDiff,
          visualDistance,
          hasCollision
        });
      }
    }
  }

  const poorlyPositioned = analyses.filter(a => a.shouldReposition).length;
  const avgError = analyses.reduce((sum, a) => sum + a.error, 0) / analyses.length;

  return {
    analyses,
    collisions,
    summary: {
      totalCompanies: companies.length,
      poorlyPositioned,
      collisions: collisions.filter(c => c.hasCollision).length,
      avgError
    }
  };
};

/**
 * Generate optimized positions for all companies
 */
export const generateOptimizedPositions = (companies: Company[]): Company[] => {
  console.log(`🔧 Generating optimized positions for ${companies.length} companies`);
  
  // Sort by match score (highest first) for better positioning
  const sortedCompanies = companies
    .slice()
    .sort((a, b) => b.matchScore - a.matchScore);
  
  const optimizedCompanies: Company[] = [];
  const minAngleSeparation = 12; // Degrees
  const minVisualDistance = 60; // Pixels
  
  for (const company of sortedCompanies) {
    const targetDistance = calculateDistanceFromScore(company.matchScore);
    
    // Find optimal angle for this distance
    const optimalPosition = findOptimalAngle(
      targetDistance,
      company,
      optimizedCompanies,
      minAngleSeparation,
      minVisualDistance
    );
    
    optimizedCompanies.push({
      ...company,
      angle: optimalPosition.angle,
      distance: optimalPosition.distance
    });
    
    console.log(`✅ ${company.name}: ${company.matchScore}% → ${optimalPosition.distance}px @ ${optimalPosition.angle}°`);
  }
  
  return optimizedCompanies;
};

/**
 * Find optimal angle for a company at target distance
 */
const findOptimalAngle = (
  targetDistance: number,
  company: Company,
  existingCompanies: Company[],
  minAngleSeparation: number,
  minVisualDistance: number
): { angle: number; distance: number } => {
  
  // Try exact target distance first
  const idealAngle = findAngleAtDistance(targetDistance, company, existingCompanies, minAngleSeparation, minVisualDistance);
  if (idealAngle !== null) {
    return { angle: idealAngle, distance: targetDistance };
  }
  
  // Try slight distance adjustments
  for (const adjustment of [-15, 15, -30, 30]) {
    const adjustedDistance = targetDistance + adjustment;
    if (adjustedDistance < 50) continue; // Don't get too close to center
    
    const adjustedAngle = findAngleAtDistance(adjustedDistance, company, existingCompanies, minAngleSeparation, minVisualDistance);
    if (adjustedAngle !== null) {
      console.log(`⚠️ ${company.name}: adjusted distance to ${adjustedDistance}px (target was ${targetDistance}px)`);
      return { angle: adjustedAngle, distance: adjustedDistance };
    }
  }
  
  // Fallback: find least crowded sector
  const sectorAngle = findLeastCrowdedSector(existingCompanies);
  const fallbackDistance = Math.min(targetDistance + 40, 180);
  
  console.log(`🚨 ${company.name}: fallback positioning at ${fallbackDistance}px @ ${sectorAngle}°`);
  return { angle: sectorAngle, distance: fallbackDistance };
};

/**
 * Find an available angle at specific distance
 */
const findAngleAtDistance = (
  distance: number,
  company: Company,
  existingCompanies: Company[],
  minAngleSeparation: number,
  minVisualDistance: number
): number | null => {
  
  // Start angle based on company ID for consistency
  const baseAngle = (company.id * 17) % 360; // Use prime number for distribution
  
  // Try 30 different angles (every 12 degrees)
  for (let i = 0; i < 30; i++) {
    const angle = (baseAngle + (i * 12)) % 360;
    
    const hasConflict = existingCompanies.some(existing => {
      if (!existing.angle || !existing.distance) return false;
      
      // Check angle separation
      const angleDiff = Math.min(
        Math.abs(angle - existing.angle),
        360 - Math.abs(angle - existing.angle)
      );
      
      if (angleDiff < minAngleSeparation) {
        const distanceDiff = Math.abs(distance - existing.distance);
        return distanceDiff < 40; // If angles are close, distances must be far apart
      }
      
      // Check visual distance
      const x1 = Math.cos(angle * Math.PI / 180) * distance;
      const y1 = Math.sin(angle * Math.PI / 180) * distance;
      const x2 = Math.cos(existing.angle * Math.PI / 180) * existing.distance;
      const y2 = Math.sin(existing.angle * Math.PI / 180) * existing.distance;
      const visualDistance = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
      
      return visualDistance < minVisualDistance;
    });
    
    if (!hasConflict) {
      return Math.round(angle);
    }
  }
  
  return null;
};

/**
 * Find the least crowded 90-degree sector
 */
const findLeastCrowdedSector = (existingCompanies: Company[]): number => {
  const sectors = [0, 45, 90, 135, 180, 225, 270, 315]; // 8 sectors
  
  const sectorCounts = sectors.map(sectorStart => {
    const sectorEnd = (sectorStart + 45) % 360;
    const count = existingCompanies.filter(company => {
      if (!company.angle) return false;
      const angle = company.angle;
      
      if (sectorStart <= sectorEnd) {
        return angle >= sectorStart && angle < sectorEnd;
      } else {
        return angle >= sectorStart || angle < sectorEnd;
      }
    }).length;
    
    return { sector: sectorStart, count };
  });
  
  // Return middle of least crowded sector
  const leastCrowded = sectorCounts.sort((a, b) => a.count - b.count)[0];
  return (leastCrowded.sector + 22.5) % 360; // Middle of 45-degree sector
};