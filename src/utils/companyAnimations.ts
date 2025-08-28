/**
 * Company Animation System
 * 
 * Handles smooth animations for company relocations with phase-in/phase-out effects,
 * ensuring natural-looking transitions when companies are repositioned.
 */

import { Company } from '../types';

interface AnimationState {
  companyId: number;
  startTime: number;
  duration: number;
  startPosition: { angle: number; distance: number };
  endPosition: { angle: number; distance: number };
  easing: EasingFunction;
  phase: 'phase-out' | 'relocating' | 'phase-in';
}

type AnimationCallback = (companyId: number, position: { angle: number; distance: number }, phase: string) => void;

type EasingFunction = (t: number) => number;

/**
 * Animation manager for handling multiple company transitions
 */
export class CompanyAnimationManager {
  private activeAnimations = new Map<number, AnimationState>();
  private animationCallbacks = new Map<number, AnimationCallback>();
  private isRunning = false;
  private animationFrame?: number;

  /**
   * Start animations for multiple companies with staggered delays
   */
  public startRelocationAnimations(
    _companies: Company[],
    relocations: Array<{
      companyId: number;
      currentPosition: { angle: number; distance: number };
      targetPosition: { angle: number; distance: number };
      delay: number;
      priority: 'high' | 'medium' | 'low';
    }>,
    onUpdateCallback: (companyId: number, position: { angle: number; distance: number }, phase: string) => void
  ): Promise<void> {
    return new Promise((resolve) => {
      let completedAnimations = 0;
      const totalAnimations = relocations.length;

      // Set up animations with delays
      relocations.forEach((relocation) => {
        setTimeout(() => {
          this.startSingleAnimation(
            relocation.companyId,
            relocation.currentPosition,
            relocation.targetPosition,
            this.getDurationForPriority(relocation.priority),
            (companyId, position, phase) => {
              onUpdateCallback(companyId, position, phase);
              
              // Check if this animation is complete
              if (phase === 'completed') {
                completedAnimations++;
                if (completedAnimations === totalAnimations) {
                  resolve();
                }
              }
            }
          );
        }, relocation.delay);
      });

      // Start the animation loop
      if (!this.isRunning) {
        this.startAnimationLoop();
      }
    });
  }

  /**
   * Start animation for a single company
   */
  private startSingleAnimation(
    companyId: number,
    startPosition: { angle: number; distance: number },
    endPosition: { angle: number; distance: number },
    duration: number,
    callback: AnimationCallback
  ): void {
    // Animation uses three-phase approach: phase-out -> relocate -> phase-in

    const animationState: AnimationState = {
      companyId,
      startTime: Date.now(),
      duration: duration,
      startPosition,
      endPosition,
      easing: this.createSmootherEasing(),
      phase: 'phase-out'
    };

    this.activeAnimations.set(companyId, animationState);
    this.animationCallbacks.set(companyId, callback);
  }

  /**
   * Main animation loop
   */
  private startAnimationLoop(): void {
    this.isRunning = true;
    
    const animate = () => {
      const currentTime = Date.now();
      let hasActiveAnimations = false;

      this.activeAnimations.forEach((animation, companyId) => {
        const elapsed = currentTime - animation.startTime;
        const progress = Math.min(elapsed / animation.duration, 1);

        // Determine current phase based on progress
        let phase: 'phase-out' | 'relocating' | 'phase-in';
        let phaseProgress: number;

        if (progress <= 0.2) {
          phase = 'phase-out';
          phaseProgress = progress / 0.2;
        } else if (progress <= 0.8) {
          phase = 'relocating';
          phaseProgress = (progress - 0.2) / 0.6;
        } else {
          phase = 'phase-in';
          phaseProgress = (progress - 0.8) / 0.2;
        }

        // Calculate current position
        const position = this.calculateAnimationPosition(
          animation,
          phaseProgress,
          phase
        );

        // Call the callback
        const callback = this.animationCallbacks.get(companyId);
        if (callback) {
          callback(companyId, position, phase);
        }

        // Check if animation is complete
        if (progress >= 1) {
          this.activeAnimations.delete(companyId);
          this.animationCallbacks.delete(companyId);
          
          // Final callback with completion status
          if (callback) {
            callback(companyId, animation.endPosition, 'completed');
          }
        } else {
          hasActiveAnimations = true;
        }
      });

      if (hasActiveAnimations) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.isRunning = false;
      }
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  /**
   * Calculate position during animation considering phase
   */
  private calculateAnimationPosition(
    animation: AnimationState,
    phaseProgress: number,
    phase: 'phase-out' | 'relocating' | 'phase-in'
  ): { angle: number; distance: number } {
    const { startPosition, endPosition, easing } = animation;
    const easedProgress = easing(phaseProgress);

    switch (phase) {
      case 'phase-out':
        // During phase-out, company stays at start position but might fade/scale
        return {
          angle: startPosition.angle,
          distance: startPosition.distance
        };

      case 'relocating':
        // During relocation, interpolate position with smooth shortest-angle path
        return {
          angle: this.interpolateAngle(startPosition.angle, endPosition.angle, easedProgress),
          distance: this.interpolateDistance(startPosition.distance, endPosition.distance, easedProgress)
        };

      case 'phase-in':
        // During phase-in, company is at final position but might fade/scale in
        return {
          angle: endPosition.angle,
          distance: endPosition.distance
        };

      default:
        return startPosition;
    }
  }

  /**
   * Interpolate between two angles using the shortest path
   */
  private interpolateAngle(startAngle: number, endAngle: number, progress: number): number {
    let delta = endAngle - startAngle;
    
    // Ensure we take the shortest path around the circle
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    
    const currentAngle = startAngle + (delta * progress);
    
    // Normalize to 0-360 range
    return ((currentAngle % 360) + 360) % 360;
  }

  /**
   * Interpolate between two distances with easing
   */
  private interpolateDistance(startDistance: number, endDistance: number, progress: number): number {
    return startDistance + ((endDistance - startDistance) * progress);
  }

  /**
   * Create a smoother easing function combining ease-in-out with anticipation
   */
  private createSmootherEasing(): EasingFunction {
    return (t: number) => {
      // Combination of ease-in-out-cubic with slight anticipation
      if (t < 0.1) {
        // Slight anticipation at the beginning
        return 0.1 * Math.sin(t * Math.PI / 0.1) * (1 - t);
      } else if (t < 0.5) {
        // Ease out from anticipation
        const adjustedT = (t - 0.1) / 0.4;
        return 4 * adjustedT * adjustedT * adjustedT;
      } else {
        // Smooth ease-in for second half
        const adjustedT = (t - 0.5) / 0.5;
        return 1 - 4 * Math.pow(1 - adjustedT, 3);
      }
    };
  }

  /**
   * Get animation duration based on priority
   */
  private getDurationForPriority(priority: 'high' | 'medium' | 'low'): number {
    switch (priority) {
      case 'high': return 1200; // 1.2 seconds for high priority (new companies)
      case 'medium': return 1000; // 1 second for medium priority
      case 'low': return 800; // 0.8 seconds for low priority adjustments
      default: return 1000;
    }
  }

  /**
   * Stop all active animations
   */
  public stopAllAnimations(): void {
    this.activeAnimations.clear();
    this.animationCallbacks.clear();
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    this.isRunning = false;
  }

  /**
   * Check if any animations are currently running
   */
  public hasActiveAnimations(): boolean {
    return this.activeAnimations.size > 0;
  }

  /**
   * Get the current phase of a specific company's animation
   */
  public getAnimationPhase(companyId: number): string | null {
    const animation = this.activeAnimations.get(companyId);
    return animation ? animation.phase : null;
  }
}

/**
 * Global animation manager instance
 */
export const companyAnimationManager = new CompanyAnimationManager();

/**
 * Easing functions library
 */
export const Easing = {
  linear: (t: number) => t,
  
  easeInOutCubic: (t: number) => 
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    
  easeOutBounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;

    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
  
  anticipate: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  }
};