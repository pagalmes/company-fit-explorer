/**
 * Company Relocation System
 * 
 * Handles smart repositioning of existing companies when new companies are added,
 * with smooth animations and minimal visual disruption. Ensures companies are
 * positioned accurately based on their match scores.
 */

import { Company } from '../types';
import { calculateDistanceFromScore } from './companyPositioning';

interface RelocationPlan {
  companyId: number;
  currentPosition: { angle: number; distance: number };
  targetPosition: { angle: number; distance: number };
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

interface RelocationResult {
  relocatedCompanies: Company[];
  animationPlan: RelocationPlan[];
  stableCompanies: number[]; // Companies that don't need to move
}

/**
 * Create a comprehensive relocation plan when a new company is added
 * This ensures all companies are optimally positioned based on their match scores
 */
export const createRelocationPlan = (
  newCompany: Company,
  existingCompanies: Company[]
): RelocationResult => {
  const allCompanies = [...existingCompanies, newCompany];
  const relocationPlans: RelocationPlan[] = [];
  const relocatedCompanies: Company[] = [];
  const stableCompanies: number[] = [];

  // Sort companies by match score (highest first) for optimal positioning
  const companiesByScore = allCompanies
    .slice()
    .sort((a, b) => b.matchScore - a.matchScore);

  // Track used positions to avoid conflicts
  const usedPositions = new Set<string>();
  
  for (const company of companiesByScore) {
    const targetDistance = calculateDistanceFromScore(company.matchScore);
    const currentDistance = company.distance || 0;
    const currentAngle = company.angle || 0;
    
    // Check if company needs repositioning
    const distanceError = Math.abs(targetDistance - currentDistance);
    const needsRepositioning = distanceError > 20; // 20px tolerance
    
    if (needsRepositioning || company.id === newCompany.id) {
      // Find optimal position for this company
      const optimalPosition = findOptimalPositionForCompany(
        company,
        targetDistance,
        usedPositions,
        companiesByScore.filter(c => c.id !== company.id)
      );
      
      const relocatedCompany = {
        ...company,
        angle: optimalPosition.angle,
        distance: optimalPosition.distance
      };
      
      relocatedCompanies.push(relocatedCompany);
      
      // Create relocation plan for animation
      relocationPlans.push({
        companyId: company.id,
        currentPosition: { angle: currentAngle, distance: currentDistance },
        targetPosition: optimalPosition,
        priority: getPriority(distanceError, company.id === newCompany.id),
        reason: company.id === newCompany.id 
          ? 'New company addition' 
          : `Distance adjustment: ${distanceError.toFixed(0)}px from optimal`
      });
      
      // Mark this position as used
      usedPositions.add(`${optimalPosition.angle}-${optimalPosition.distance}`);
    } else {
      // Company stays in place
      relocatedCompanies.push(company);
      stableCompanies.push(company.id);
      usedPositions.add(`${currentAngle}-${currentDistance}`);
    }
  }

  return {
    relocatedCompanies,
    animationPlan: relocationPlans,
    stableCompanies
  };
};

/**
 * Find the optimal position for a specific company considering existing positions
 */
const findOptimalPositionForCompany = (
  company: Company,
  targetDistance: number,
  _usedPositions: Set<string>,
  otherCompanies: Company[]
): { angle: number; distance: number } => {
  const attempts = 36; // Try every 10 degrees for better spacing
  const minDistance = 60; // Reduced minimum distance to allow closer packing
  
  // Start with a spread-out angle based on company ID to avoid clustering
  const startAngle = (company.id * 73) % 360; // Use prime number for better distribution
  
  // First, try to place at the exact target distance
  for (let attempt = 0; attempt < attempts; attempt++) {
    const angle = (startAngle + (attempt * (360 / attempts))) % 360;
    
    // Check for collisions with other companies at this angle and distance
    const hasCollision = otherCompanies.some(otherCompany => {
      if (!otherCompany.angle || !otherCompany.distance) return false;
      
      const distance = calculatePositionDistance(
        { angle, distance: targetDistance },
        { angle: otherCompany.angle, distance: otherCompany.distance }
      );
      
      return distance < minDistance;
    });
    
    if (!hasCollision) {
      console.log(`✅ Found optimal position for ${company.name}: angle=${Math.round(angle)}, distance=${targetDistance}`);
      return { angle: Math.round(angle), distance: targetDistance };
    }
  }
  
  // If target distance is crowded, try slightly larger distances (but stay close to target)
  for (let expansion = 15; expansion <= 45; expansion += 15) {
    const adjustedDistance = targetDistance + expansion;
    
    for (let attempt = 0; attempt < attempts; attempt++) {
      const angle = (startAngle + (attempt * (360 / attempts))) % 360;
      
      const hasCollision = otherCompanies.some(otherCompany => {
        if (!otherCompany.angle || !otherCompany.distance) return false;
        
        const distance = calculatePositionDistance(
          { angle, distance: adjustedDistance },
          { angle: otherCompany.angle, distance: otherCompany.distance }
        );
        
        return distance < minDistance;
      });
      
      if (!hasCollision) {
        console.log(`⚠️ Using expanded distance for ${company.name}: angle=${Math.round(angle)}, distance=${adjustedDistance} (target was ${targetDistance})`);
        return { angle: Math.round(angle), distance: adjustedDistance };
      }
    }
  }
  
  // Final fallback - ensure we don't go too far from target
  const maxFallbackDistance = Math.min(targetDistance + 60, 200);
  const fallbackAngle = (startAngle + Math.random() * 60 - 30) % 360; // Add some randomness
  
  console.log(`🚨 Fallback positioning for ${company.name}: angle=${Math.round(fallbackAngle)}, distance=${maxFallbackDistance} (target was ${targetDistance})`);
  return { angle: Math.round(fallbackAngle), distance: maxFallbackDistance };
};

/**
 * Calculate the distance between two positions in polar coordinates
 */
const calculatePositionDistance = (
  pos1: { angle: number; distance: number },
  pos2: { angle: number; distance: number }
): number => {
  // Convert to Cartesian coordinates
  const x1 = Math.cos(pos1.angle * Math.PI / 180) * pos1.distance;
  const y1 = Math.sin(pos1.angle * Math.PI / 180) * pos1.distance;
  const x2 = Math.cos(pos2.angle * Math.PI / 180) * pos2.distance;
  const y2 = Math.sin(pos2.angle * Math.PI / 180) * pos2.distance;
  
  // Calculate Euclidean distance
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
};

/**
 * Determine priority level for relocation animation
 */
const getPriority = (distanceError: number, isNewCompany: boolean): 'high' | 'medium' | 'low' => {
  if (isNewCompany) return 'high';
  if (distanceError > 50) return 'high';
  if (distanceError > 30) return 'medium';
  return 'low';
};

/**
 * Generate staggered animation delays based on priority and position
 * This creates a natural wave-like effect for repositioning
 */
export const generateAnimationDelays = (relocationPlans: RelocationPlan[]): Map<number, number> => {
  const delays = new Map<number, number>();
  
  // Sort by priority and then by angle for a natural flow
  const sortedPlans = relocationPlans
    .slice()
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // Within same priority, sort by angle to create a sweep effect
      return a.currentPosition.angle - b.currentPosition.angle;
    });
  
  sortedPlans.forEach((plan, index) => {
    let delay = 0;
    
    if (plan.priority === 'high') {
      delay = index * 100; // 100ms between high priority animations
    } else if (plan.priority === 'medium') {
      delay = 500 + (index * 150); // Start after high priority, 150ms between
    } else {
      delay = 1000 + (index * 200); // Start last, 200ms between
    }
    
    delays.set(plan.companyId, delay);
  });
  
  return delays;
};


/**
 * Calculate the visual impact score of a relocation plan
 * Lower scores indicate less visual disruption
 */
export const calculateVisualImpact = (relocationPlans: RelocationPlan[]): number => {
  let totalImpact = 0;
  
  for (const plan of relocationPlans) {
    const angleChange = Math.abs(plan.targetPosition.angle - plan.currentPosition.angle);
    const distanceChange = Math.abs(plan.targetPosition.distance - plan.currentPosition.distance);
    
    // Normalize angle change to 0-180 range (shortest path)
    const normalizedAngleChange = Math.min(angleChange, 360 - angleChange);
    
    // Weight distance changes more heavily as they're more noticeable
    const impact = (normalizedAngleChange / 180) + (distanceChange / 100) * 1.5;
    totalImpact += impact;
  }
  
  return totalImpact / relocationPlans.length;
};