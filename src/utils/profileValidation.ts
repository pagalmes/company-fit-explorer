import { UserCMF, CMFItem } from '../types';

/**
 * Validation error for profile validation
 */
export interface ValidationError {
  field: keyof Pick<UserCMF, 'name' | 'targetRole' | 'targetCompanies' | 'mustHaves' | 'wantToHave' | 'experience'>;
  message: string;
}

/**
 * Validation result containing errors and completion status
 */
export interface ValidationResult {
  isValid: boolean;
  isComplete: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Minimum requirements for a complete profile
 */
const PROFILE_REQUIREMENTS = {
  name: { minLength: 1, required: true },
  targetRole: { minLength: 1, required: true },
  targetCompanies: { minLength: 1, required: true },
  mustHaves: { minItems: 3, required: true },
  wantToHave: { minItems: 3, required: true },
  experience: { minItems: 3, required: true }
} as const;

/**
 * Validates a CMF item count (handles both string and CMFItem formats)
 */
function countCMFItems(items: (string | CMFItem)[] | undefined): number {
  if (!items || !Array.isArray(items)) return 0;
  return items.filter(item => {
    if (typeof item === 'string') {
      return item.trim().length > 0;
    }
    return item.short?.trim().length > 0 || item.detailed?.trim().length > 0;
  }).length;
}

/**
 * Validates a single string field (name, targetRole, targetCompanies)
 */
function validateStringField(
  field: 'name' | 'targetRole' | 'targetCompanies',
  value: string | undefined,
  isOptional: boolean = false
): ValidationError | null {
  const requirement = PROFILE_REQUIREMENTS[field];
  
  if (!value || !value.trim()) {
    if (requirement.required && !isOptional) {
      return {
        field,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} is required`
      };
    }
    return null;
  }

  if (value.trim().length < (requirement as { minLength: number }).minLength) {
    return {
      field,
      message: `${field} must be at least ${(requirement as { minLength: number }).minLength} character(s)`
    };
  }

  return null;
}

/**
 * Validates an array field (mustHaves, wantToHave, experience)
 */
function validateArrayField(
  field: 'mustHaves' | 'wantToHave' | 'experience',
  value: (string | CMFItem)[] | undefined,
  isOptional: boolean = false
): ValidationError | null {
  const requirement = PROFILE_REQUIREMENTS[field];
  const count = countCMFItems(value);

  if (count === 0) {
    if (requirement.required && !isOptional) {
      return {
        field,
        message: `Please add at least one ${field === 'experience' ? 'skill/experience' : field.replace(/([A-Z])/g, ' $1').trim()}`
      };
    }
    return null;
  }

  if (count < requirement.minItems) {
    return {
      field,
      message: `You need at least ${requirement.minItems} items in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`
    };
  }

  return null;
}

/**
 * Validates a complete UserCMF profile
 * Returns validation result with errors, warnings, and completion status
 * 
 * For 'complete' status, all required fields must:
 * - name: non-empty string
 * - targetRole: non-empty string
 * - targetCompanies: non-empty string
 * - mustHaves: minimum 3 items
 * - wantToHave: minimum 3 items
 * - experience: minimum 3 items
 * 
 * Any missing or invalid field will prevent proceeding
 */
export function validateProfile(cmf: Partial<UserCMF>, requireComplete: boolean = true): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Validate required string fields
  const nameError = validateStringField('name', cmf.name, !requireComplete);
  if (nameError) (requireComplete ? errors : warnings).push(nameError);

  const targetRoleError = validateStringField('targetRole', cmf.targetRole, !requireComplete);
  if (targetRoleError) (requireComplete ? errors : warnings).push(targetRoleError);

  const targetCompaniesError = validateStringField('targetCompanies', cmf.targetCompanies, !requireComplete);
  if (targetCompaniesError) (requireComplete ? errors : warnings).push(targetCompaniesError);

  // Validate required array fields
  const mustHavesError = validateArrayField('mustHaves', cmf.mustHaves, !requireComplete);
  if (mustHavesError) (requireComplete ? errors : warnings).push(mustHavesError);

  const wantToHaveError = validateArrayField('wantToHave', cmf.wantToHave, !requireComplete);
  if (wantToHaveError) (requireComplete ? errors : warnings).push(wantToHaveError);

  const experienceError = validateArrayField('experience', cmf.experience, !requireComplete);
  if (experienceError) (requireComplete ? errors : warnings).push(experienceError);

  const isValid = errors.length === 0;
  const isComplete = isValid && !warnings.some(w => w.message.includes('at least'));

  return {
    isValid,
    isComplete,
    errors,
    warnings
  };
}

/**
 * Checks if profile has minimal valid data (can proceed to next step)
 * Lower bar than validateProfile - just checks that required fields exist
 */
export function hasMinimalProfile(cmf: Partial<UserCMF>): boolean {
  return !!(
    cmf.name?.trim() &&
    cmf.targetRole?.trim() &&
    cmf.targetCompanies?.trim() &&
    (cmf.mustHaves?.length ?? 0) > 0 &&
    (cmf.wantToHave?.length ?? 0) > 0 &&
    (cmf.experience?.length ?? 0) > 0
  );
}

/**
 * Checks if profile meets all completion requirements
 */
export function isProfileComplete(cmf: Partial<UserCMF>): boolean {
  const result = validateProfile(cmf, true);
  return result.isComplete && result.isValid;
}

/**
 * Gets human-readable field name for display
 */
export function getFieldDisplayName(field: keyof typeof PROFILE_REQUIREMENTS): string {
  const displayNames: Record<string, string> = {
    name: 'Name',
    targetRole: 'Target Role',
    targetCompanies: 'Target Company Stage',
    mustHaves: 'Must-Haves',
    wantToHave: 'Want-to-Haves',
    experience: 'Skills/Experience'
  };
  return displayNames[field] || field;
}

/**
 * Gets the count of items in an array field (handles CMFItem format)
 */
export function countItemsInField(items: (string | CMFItem)[] | undefined): number {
  return countCMFItems(items);
}

/**
 * Gets the required minimum for an array field
 */
export function getMinimumRequired(field: 'mustHaves' | 'wantToHave' | 'experience'): number {
  return PROFILE_REQUIREMENTS[field].minItems;
}
