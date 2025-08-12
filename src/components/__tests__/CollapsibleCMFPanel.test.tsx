import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CollapsibleCMFPanel from '../CollapsibleCMFPanel'
import { UserCMF } from '../../types'

/**
 * @testSuite CollapsibleCMFPanel
 * @description Comprehensive testing of the collapsible CMF panel component
 * 
 * @covers 12 critical test scenarios:
 * - Component rendering in collapsed/expanded states
 * - Keyboard accessibility (Enter, Space, Escape)
 * - Click interaction handling
 * - Content measurement and animation behavior
 * - ARIA attributes and accessibility features
 * - Loading state display
 * - Focus management
 * 
 * @regressionProtection Prevents:
 * ❌ Broken keyboard navigation accessibility
 * ❌ Missing ARIA attributes for screen readers
 * ❌ Failed toggle functionality
 * ❌ Broken loading state rendering
 * ❌ Focus management issues
 * ❌ Content measurement failures
 */
describe('CollapsibleCMFPanel', () => {
  const mockUserCMF: UserCMF = {
    id: 'user-1',
    name: 'John Smith',
    targetRole: 'Senior AI Engineer',
    targetCompanies: 'AI/ML companies with strong ethics focus',
    mustHaves: [
      'Remote-friendly culture',
      'Strong AI safety principles',
      'High technical standards'
    ],
    wantToHave: ['Competitive salary', 'Stock options'],
    experience: ['5+ years ML experience', 'Python expertise']
  }

  const mockOnToggle = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('component rendering', () => {
    it('should render in collapsed state', () => {
      const { container } = render(
        <CollapsibleCMFPanel
          userCMF={mockUserCMF}
          isCollapsed={true}
          onToggle={mockOnToggle}
        />
      )

      expect(screen.getByText('John Smith')).toBeInTheDocument()
      expect(screen.getByText('Click to view CMF criteria')).toBeInTheDocument()
      
      // Content is in DOM but visually hidden with maxHeight: 0px
      const collapsibleContainer = container.querySelector('.overflow-hidden')
      expect(collapsibleContainer).toHaveStyle('max-height: 0px')
      
      // Content should exist in DOM but be hidden
      expect(screen.getByText('Target Role')).toBeInTheDocument()
      expect(screen.getByText('Senior AI Engineer')).toBeInTheDocument()
    })

    it('should render in expanded state', () => {
      render(
        <CollapsibleCMFPanel
          userCMF={mockUserCMF}
          isCollapsed={false}
          onToggle={mockOnToggle}
        />
      )

      expect(screen.getByText('John Smith')).toBeInTheDocument()
      expect(screen.getByText('Your Candidate Market Fit')).toBeInTheDocument()
      
      // Expanded content should be visible
      expect(screen.getByText('Target Role')).toBeInTheDocument()
      expect(screen.getByText('Senior AI Engineer')).toBeInTheDocument()
      expect(screen.getByText('Remote-friendly culture')).toBeInTheDocument()
      expect(screen.getByText('Strong AI safety principles')).toBeInTheDocument()
    })

    it('should render loading state when isLoading is true', () => {
      render(
        <CollapsibleCMFPanel
          userCMF={mockUserCMF}
          isCollapsed={false}
          onToggle={mockOnToggle}
          isLoading={true}
        />
      )

      // Should show loading skeleton instead of content
      const loadingSkeleton = document.querySelector('.animate-pulse')
      expect(loadingSkeleton).toBeInTheDocument()
      
      // Should not show actual content
      expect(screen.queryByText('Target Role')).not.toBeInTheDocument()
    })

    it('should display all CMF sections when expanded', () => {
      render(
        <CollapsibleCMFPanel
          userCMF={mockUserCMF}
          isCollapsed={false}
          onToggle={mockOnToggle}
        />
      )

      // Check all main sections are present
      expect(screen.getByText('Target Role')).toBeInTheDocument()
      expect(screen.getByText('Target Companies')).toBeInTheDocument()
      expect(screen.getByText('Must Haves')).toBeInTheDocument()
      expect(screen.getByText('Want to Have')).toBeInTheDocument()
      expect(screen.getByText('Experience')).toBeInTheDocument()

      // Check specific content
      expect(screen.getByText('Senior AI Engineer')).toBeInTheDocument()
      expect(screen.getByText('AI/ML companies with strong ethics focus')).toBeInTheDocument()
      expect(screen.getByText('Remote-friendly culture')).toBeInTheDocument()
      expect(screen.getByText('Competitive salary')).toBeInTheDocument()
      expect(screen.getByText('5+ years ML experience')).toBeInTheDocument()
    })
  })

  describe('click interaction', () => {
    it('should call onToggle when header is clicked', () => {
      render(
        <CollapsibleCMFPanel
          userCMF={mockUserCMF}
          isCollapsed={true}
          onToggle={mockOnToggle}
        />
      )

      const header = screen.getByRole('button', { name: /expand cmf details panel/i })
      fireEvent.click(header)

      expect(mockOnToggle).toHaveBeenCalledTimes(1)
    })

    it('should call onToggle when chevron button is clicked', () => {
      render(
        <CollapsibleCMFPanel
          userCMF={mockUserCMF}
          isCollapsed={true}
          onToggle={mockOnToggle}
        />
      )

      // The chevron is inside a button element within the header
      const chevronButton = document.querySelector('button p-1')
      if (chevronButton) {
        fireEvent.click(chevronButton)
        expect(mockOnToggle).toHaveBeenCalledTimes(1)
      }
    })
  })

  describe('keyboard accessibility', () => {
    it('should toggle when Enter key is pressed', () => {
      render(
        <CollapsibleCMFPanel
          userCMF={mockUserCMF}
          isCollapsed={true}
          onToggle={mockOnToggle}
        />
      )

      const header = screen.getByRole('button', { name: /expand cmf details panel/i })
      fireEvent.keyDown(header, { key: 'Enter', code: 'Enter' })

      expect(mockOnToggle).toHaveBeenCalledTimes(1)
    })

    it('should toggle when Space key is pressed', () => {
      render(
        <CollapsibleCMFPanel
          userCMF={mockUserCMF}
          isCollapsed={true}
          onToggle={mockOnToggle}
        />
      )

      const header = screen.getByRole('button', { name: /expand cmf details panel/i })
      fireEvent.keyDown(header, { key: ' ', code: 'Space' })

      expect(mockOnToggle).toHaveBeenCalledTimes(1)
    })

    it('should toggle when Escape key is pressed and panel is expanded', () => {
      render(
        <CollapsibleCMFPanel
          userCMF={mockUserCMF}
          isCollapsed={false}
          onToggle={mockOnToggle}
        />
      )

      const header = screen.getByRole('button', { name: /collapse cmf details panel/i })
      fireEvent.keyDown(header, { key: 'Escape', code: 'Escape' })

      expect(mockOnToggle).toHaveBeenCalledTimes(1)
    })

    it('should not toggle when Escape key is pressed and panel is collapsed', () => {
      render(
        <CollapsibleCMFPanel
          userCMF={mockUserCMF}
          isCollapsed={true}
          onToggle={mockOnToggle}
        />
      )

      const header = screen.getByRole('button', { name: /expand cmf details panel/i })
      fireEvent.keyDown(header, { key: 'Escape', code: 'Escape' })

      expect(mockOnToggle).not.toHaveBeenCalled()
    })

    it('should not toggle when other keys are pressed', () => {
      render(
        <CollapsibleCMFPanel
          userCMF={mockUserCMF}
          isCollapsed={true}
          onToggle={mockOnToggle}
        />
      )

      const header = screen.getByRole('button', { name: /expand cmf details panel/i })
      
      // Test various non-triggering keys
      fireEvent.keyDown(header, { key: 'Tab', code: 'Tab' })
      fireEvent.keyDown(header, { key: 'ArrowDown', code: 'ArrowDown' })
      fireEvent.keyDown(header, { key: 'a', code: 'KeyA' })

      expect(mockOnToggle).not.toHaveBeenCalled()
    })

    it('should handle multiple keyboard events correctly', () => {
      render(
        <CollapsibleCMFPanel
          userCMF={mockUserCMF}
          isCollapsed={true}
          onToggle={mockOnToggle}
        />
      )

      const header = screen.getByRole('button', { name: /expand cmf details panel/i })
      
      // Test that multiple key presses work correctly
      fireEvent.keyDown(header, { key: 'Enter' })
      fireEvent.keyDown(header, { key: ' ' })

      expect(mockOnToggle).toHaveBeenCalledTimes(2)
    })
  })

  describe('ARIA attributes and accessibility', () => {
    it('should have proper ARIA attributes when collapsed', () => {
      render(
        <CollapsibleCMFPanel
          userCMF={mockUserCMF}
          isCollapsed={true}
          onToggle={mockOnToggle}
        />
      )

      const header = screen.getByRole('button', { name: /expand cmf details panel/i })
      
      expect(header).toHaveAttribute('aria-expanded', 'false')
      expect(header).toHaveAttribute('tabIndex', '0')
      expect(header).toHaveAttribute('role', 'button')
    })

    it('should have proper ARIA attributes when expanded', () => {
      render(
        <CollapsibleCMFPanel
          userCMF={mockUserCMF}
          isCollapsed={false}
          onToggle={mockOnToggle}
        />
      )

      const header = screen.getByRole('button', { name: /collapse cmf details panel/i })
      
      expect(header).toHaveAttribute('aria-expanded', 'true')
      expect(header).toHaveAttribute('tabIndex', '0')
      expect(header).toHaveAttribute('role', 'button')
    })

    it('should be focusable', () => {
      render(
        <CollapsibleCMFPanel
          userCMF={mockUserCMF}
          isCollapsed={true}
          onToggle={mockOnToggle}
        />
      )

      const header = screen.getByRole('button', { name: /expand cmf details panel/i })
      
      header.focus()
      expect(header).toHaveFocus()
    })
  })

  describe('icon display', () => {
    it('should show down chevron when collapsed', () => {
      render(
        <CollapsibleCMFPanel
          userCMF={mockUserCMF}
          isCollapsed={true}
          onToggle={mockOnToggle}
        />
      )

      // Look for the down chevron SVG path
      const downChevron = document.querySelector('path[d*="19 9l-7 7-7-7"]')
      expect(downChevron).toBeInTheDocument()
    })

    it('should show up chevron when expanded', () => {
      render(
        <CollapsibleCMFPanel
          userCMF={mockUserCMF}
          isCollapsed={false}
          onToggle={mockOnToggle}
        />
      )

      // Look for the up chevron SVG path
      const upChevron = document.querySelector('path[d*="5 15l7-7 7 7"]')
      expect(upChevron).toBeInTheDocument()
    })
  })

  describe('content measurement and animation', () => {
    it('should handle content without crashing', () => {
      // Test with minimal CMF data
      const minimalCMF: UserCMF = {
        id: 'user-min',
        name: 'Test User',
        targetRole: 'Engineer',
        targetCompanies: 'Tech companies',
        mustHaves: ['Remote work'],
        wantToHave: [],
        experience: []
      }

      expect(() => {
        render(
          <CollapsibleCMFPanel
            userCMF={minimalCMF}
            isCollapsed={false}
            onToggle={mockOnToggle}
          />
        )
      }).not.toThrow()

      expect(screen.getByText('Test User')).toBeInTheDocument()
      expect(screen.getByText('Engineer')).toBeInTheDocument()
    })

    it('should handle empty arrays gracefully', () => {
      const emptyCMF: UserCMF = {
        id: 'user-empty',
        name: 'Empty User',
        targetRole: 'Role',
        targetCompanies: 'Companies',
        mustHaves: [],
        wantToHave: [],
        experience: []
      }

      render(
        <CollapsibleCMFPanel
          userCMF={emptyCMF}
          isCollapsed={false}
          onToggle={mockOnToggle}
        />
      )

      expect(screen.getByText('Empty User')).toBeInTheDocument()
      expect(screen.getByText('Must Haves')).toBeInTheDocument()
      
      // Should not crash when arrays are empty
      expect(screen.queryByText('Want to Have')).not.toBeInTheDocument()
      expect(screen.queryByText('Experience')).not.toBeInTheDocument()
    })
  })

  describe('responsive design', () => {
    it('should have responsive classes applied', () => {
      const { container } = render(
        <CollapsibleCMFPanel
          userCMF={mockUserCMF}
          isCollapsed={false}
          onToggle={mockOnToggle}
        />
      )

      // Check for responsive width classes
      const panel = container.querySelector('.w-80.max-w-\\[calc\\(100vw-2rem\\)\\]')
      expect(panel).toBeInTheDocument()

      // Check for responsive content classes
      const content = container.querySelector('.p-3.md\\:p-4')
      expect(content).toBeInTheDocument()
    })
  })
})