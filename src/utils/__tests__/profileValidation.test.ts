import { describe, it, expect } from 'vitest';
import {
  validateProfile,
  isProfileComplete,
  hasMinimalProfile,
  getFieldDisplayName,
  countItemsInField,
  getMinimumRequired
} from '../profileValidation';
import { UserCMF } from '../../types';

describe('Profile Validation', () => {
  describe('validateProfile', () => {
    it('should identify missing name field', () => {
      const profile: Partial<UserCMF> = {
        name: '',
        targetRole: 'Senior PM',
        targetCompanies: 'Growth stage',
        mustHaves: ['Item 1', 'Item 2', 'Item 3'],
        wantToHave: ['Item 1', 'Item 2', 'Item 3'],
        experience: ['Item 1', 'Item 2', 'Item 3']
      };

      const result = validateProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({
        field: 'name',
        message: expect.stringContaining('Name is required')
      }));
    });

    it('should identify missing targetRole field', () => {
      const profile: Partial<UserCMF> = {
        name: 'John Doe',
        targetRole: '',
        targetCompanies: 'Growth stage',
        mustHaves: ['Item 1', 'Item 2', 'Item 3'],
        wantToHave: ['Item 1', 'Item 2', 'Item 3'],
        experience: ['Item 1', 'Item 2', 'Item 3']
      };

      const result = validateProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({
        field: 'targetRole'
      }));
    });

    it('should identify insufficient mustHaves', () => {
      const profile: Partial<UserCMF> = {
        name: 'John Doe',
        targetRole: 'Senior PM',
        targetCompanies: 'Growth stage',
        mustHaves: ['Item 1', 'Item 2'],
        wantToHave: ['Item 1', 'Item 2', 'Item 3'],
        experience: ['Item 1', 'Item 2', 'Item 3']
      };

      const result = validateProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({
        field: 'mustHaves',
        message: expect.stringContaining('at least 3')
      }));
    });

    it('should identify insufficient wantToHave', () => {
      const profile: Partial<UserCMF> = {
        name: 'John Doe',
        targetRole: 'Senior PM',
        targetCompanies: 'Growth stage',
        mustHaves: ['Item 1', 'Item 2', 'Item 3'],
        wantToHave: ['Item 1'],
        experience: ['Item 1', 'Item 2', 'Item 3']
      };

      const result = validateProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({
        field: 'wantToHave'
      }));
    });

    it('should identify insufficient experience', () => {
      const profile: Partial<UserCMF> = {
        name: 'John Doe',
        targetRole: 'Senior PM',
        targetCompanies: 'Growth stage',
        mustHaves: ['Item 1', 'Item 2', 'Item 3'],
        wantToHave: ['Item 1', 'Item 2', 'Item 3'],
        experience: ['Item 1', 'Item 2']
      };

      const result = validateProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({
        field: 'experience'
      }));
    });

    it('should accept complete profile', () => {
      const profile: Partial<UserCMF> = {
        name: 'John Doe',
        targetRole: 'Senior PM',
        targetCompanies: 'Growth stage',
        mustHaves: ['Item 1', 'Item 2', 'Item 3'],
        wantToHave: ['Item 1', 'Item 2', 'Item 3'],
        experience: ['Item 1', 'Item 2', 'Item 3']
      };

      const result = validateProfile(profile);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.isComplete).toBe(true);
    });

    it('should handle whitespace-only fields as empty', () => {
      const profile: Partial<UserCMF> = {
        name: '   ',
        targetRole: 'Senior PM',
        targetCompanies: 'Growth stage',
        mustHaves: ['Item 1', 'Item 2', 'Item 3'],
        wantToHave: ['Item 1', 'Item 2', 'Item 3'],
        experience: ['Item 1', 'Item 2', 'Item 3']
      };

      const result = validateProfile(profile);
      expect(result.isValid).toBe(false);
    });

    it('should accept CMFItem format in arrays', () => {
      const profile: Partial<UserCMF> = {
        name: 'John Doe',
        targetRole: 'Senior PM',
        targetCompanies: 'Growth stage',
        mustHaves: [
          { short: 'Item 1', detailed: 'Detailed description 1' },
          { short: 'Item 2', detailed: 'Detailed description 2' },
          { short: 'Item 3', detailed: 'Detailed description 3' }
        ],
        wantToHave: [
          { short: 'Item 1', detailed: 'Detailed description 1' },
          { short: 'Item 2', detailed: 'Detailed description 2' },
          { short: 'Item 3', detailed: 'Detailed description 3' }
        ],
        experience: ['Experience 1', 'Experience 2', 'Experience 3']
      };

      const result = validateProfile(profile);
      expect(result.isValid).toBe(true);
      expect(result.isComplete).toBe(true);
    });

    it('should support optional mode for partial validation', () => {
      const profile: Partial<UserCMF> = {
        name: 'John Doe',
        targetRole: 'Senior PM',
        targetCompanies: 'Growth stage',
        mustHaves: ['Item 1', 'Item 2'],  // Only 2, needs 3
        wantToHave: ['Item 1'],  // Only 1, needs 3
        experience: ['Item 1']  // Only 1, needs 3
      };

      const result = validateProfile(profile, false);
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('isProfileComplete', () => {
    it('should return true for complete profile', () => {
      const profile: Partial<UserCMF> = {
        name: 'John Doe',
        targetRole: 'Senior PM',
        targetCompanies: 'Growth stage',
        mustHaves: ['Item 1', 'Item 2', 'Item 3'],
        wantToHave: ['Item 1', 'Item 2', 'Item 3'],
        experience: ['Item 1', 'Item 2', 'Item 3']
      };

      expect(isProfileComplete(profile)).toBe(true);
    });

    it('should return false for incomplete profile', () => {
      const profile: Partial<UserCMF> = {
        name: 'John Doe',
        targetRole: 'Senior PM',
        targetCompanies: 'Growth stage',
        mustHaves: ['Item 1', 'Item 2'],
        wantToHave: ['Item 1', 'Item 2', 'Item 3'],
        experience: ['Item 1', 'Item 2', 'Item 3']
      };

      expect(isProfileComplete(profile)).toBe(false);
    });
  });

  describe('hasMinimalProfile', () => {
    it('should return true when all required fields have content', () => {
      const profile: Partial<UserCMF> = {
        name: 'John',
        targetRole: 'Role',
        targetCompanies: 'Stage',
        mustHaves: ['Item'],
        wantToHave: ['Item'],
        experience: ['Item']
      };

      expect(hasMinimalProfile(profile)).toBe(true);
    });

    it('should return false when any required field is missing', () => {
      const profile: Partial<UserCMF> = {
        name: 'John',
        targetRole: '',
        targetCompanies: 'Stage',
        mustHaves: ['Item'],
        wantToHave: ['Item'],
        experience: ['Item']
      };

      expect(hasMinimalProfile(profile)).toBe(false);
    });

    it('should return false when arrays are empty', () => {
      const profile: Partial<UserCMF> = {
        name: 'John',
        targetRole: 'Role',
        targetCompanies: 'Stage',
        mustHaves: [],
        wantToHave: ['Item'],
        experience: ['Item']
      };

      expect(hasMinimalProfile(profile)).toBe(false);
    });
  });

  describe('getFieldDisplayName', () => {
    it('should return proper display names', () => {
      expect(getFieldDisplayName('name')).toBe('Name');
      expect(getFieldDisplayName('targetRole')).toBe('Target Role');
      expect(getFieldDisplayName('targetCompanies')).toBe('Target Company Stage');
      expect(getFieldDisplayName('mustHaves')).toBe('Must-Haves');
      expect(getFieldDisplayName('wantToHave')).toBe('Want-to-Haves');
      expect(getFieldDisplayName('experience')).toBe('Skills/Experience');
    });
  });

  describe('countItemsInField', () => {
    it('should count string items', () => {
      const items = ['Item 1', 'Item 2', 'Item 3'];
      expect(countItemsInField(items as any)).toBe(3);
    });

    it('should count CMFItem items', () => {
      const items = [
        { short: 'Item 1', detailed: 'Detail 1' },
        { short: 'Item 2', detailed: 'Detail 2' }
      ];
      expect(countItemsInField(items as any)).toBe(2);
    });

    it('should filter empty string items', () => {
      const items = ['Item 1', '', 'Item 3'];
      expect(countItemsInField(items as any)).toBe(2);
    });

    it('should handle undefined', () => {
      expect(countItemsInField(undefined)).toBe(0);
    });

    it('should handle mixed string and CMFItem arrays', () => {
      const items = [
        'String Item',
        { short: 'CMF Item', detailed: 'Detail' }
      ];
      expect(countItemsInField(items as any)).toBe(2);
    });
  });

  describe('getMinimumRequired', () => {
    it('should return 3 for all array fields', () => {
      expect(getMinimumRequired('mustHaves')).toBe(3);
      expect(getMinimumRequired('wantToHave')).toBe(3);
      expect(getMinimumRequired('experience')).toBe(3);
    });
  });

  describe('Edge cases', () => {
    it('should handle all fields with CMFItem format', () => {
      const profile: Partial<UserCMF> = {
        name: 'John Doe',
        targetRole: 'Senior PM',
        targetCompanies: 'Growth stage',
        mustHaves: [
          { short: 'Remote', detailed: 'Must have flexible work location' },
          { short: 'Growth', detailed: 'Fast growing company' },
          { short: 'Culture', detailed: 'Strong team culture' }
        ],
        wantToHave: [
          { short: 'Equity', detailed: 'Stock options available' },
          { short: 'Travel', detailed: 'Some travel opportunities' },
          { short: 'Innovation', detailed: 'Innovation focused' }
        ],
        experience: [
          'Product Management',
          'B2B SaaS',
          'Team Leadership'
        ]
      };

      const result = validateProfile(profile);
      expect(result.isValid).toBe(true);
      expect(result.isComplete).toBe(true);
    });

    it('should handle very long content strings', () => {
      const longString = 'A'.repeat(1000);
      const profile: Partial<UserCMF> = {
        name: longString,
        targetRole: longString,
        targetCompanies: longString,
        mustHaves: [longString, longString, longString],
        wantToHave: [longString, longString, longString],
        experience: [longString, longString, longString]
      };

      const result = validateProfile(profile);
      expect(result.isValid).toBe(true);
    });

    it('should handle arrays with only empty items', () => {
      const profile: Partial<UserCMF> = {
        name: 'John Doe',
        targetRole: 'Senior PM',
        targetCompanies: 'Growth stage',
        mustHaves: ['', '   ', ''],
        wantToHave: ['', '', ''],
        experience: ['', '', '']
      };

      const result = validateProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
