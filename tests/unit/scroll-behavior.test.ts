import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * @testSuite CSS Scroll Behavior Unit Tests
 * @description Tests to verify the CSS structure for scroll behavior
 *
 * These tests check that the CSS file has the correct rules to:
 * 1. Allow scrolling on most pages (landing, login, onboarding)
 * 2. Prevent scrolling on graph explorer (via :has() selector)
 * 3. Not have global overflow:hidden that affects all pages
 */

describe('CSS Scroll Behavior Structure', () => {
  const cssPath = path.join(process.cwd(), 'src/styles/index.css');
  let cssContent: string;

  it('should have the CSS file available', () => {
    expect(fs.existsSync(cssPath)).toBe(true);
    cssContent = fs.readFileSync(cssPath, 'utf-8');
    expect(cssContent).toBeTruthy();
  });

  it('should NOT have global overflow:hidden on html element', () => {
    cssContent = fs.readFileSync(cssPath, 'utf-8');

    // Check for global html overflow hidden
    const htmlBlockMatch = cssContent.match(/html\s*\{([^}]*)\}/);

    if (htmlBlockMatch) {
      const htmlStyles = htmlBlockMatch[1];
      // Should NOT have overflow: hidden without a selector condition
      expect(htmlStyles).not.toMatch(/overflow:\s*hidden/);
    }
  });

  it('should NOT have global overflow:hidden on body element', () => {
    cssContent = fs.readFileSync(cssPath, 'utf-8');

    // Find the main body block (not the conditional one)
    const bodyBlocks = cssContent.match(/body\s*\{([^}]*)\}/g);

    if (bodyBlocks) {
      // Check the first body block (should be the global one)
      const mainBodyBlock = bodyBlocks[0];
      expect(mainBodyBlock).not.toMatch(/overflow:\s*hidden/);
      expect(mainBodyBlock).not.toMatch(/max-height:\s*100dvh/);
    }
  });

  it('should have conditional overflow:hidden for graph explorer using :has()', () => {
    cssContent = fs.readFileSync(cssPath, 'utf-8');

    // Should have a rule that targets body:has([data-graph-explorer])
    expect(cssContent).toMatch(/body:has\(\[data-graph-explorer\]\)/);

    // Extract the conditional body rule
    const conditionalBodyMatch = cssContent.match(
      /body:has\(\[data-graph-explorer\]\)\s*\{([^}]*)\}/
    );

    expect(conditionalBodyMatch).toBeTruthy();

    if (conditionalBodyMatch) {
      const conditionalStyles = conditionalBodyMatch[1];
      // Should have overflow hidden in the conditional block
      expect(conditionalStyles).toMatch(/overflow:\s*hidden/);
      expect(conditionalStyles).toMatch(/height:\s*100dvh/);
      expect(conditionalStyles).toMatch(/max-height:\s*100dvh/);
    }
  });

  it('should use data-graph-explorer attribute for targeting', () => {
    cssContent = fs.readFileSync(cssPath, 'utf-8');

    // Verify the selector uses the correct attribute
    expect(cssContent).toContain('[data-graph-explorer]');
    expect(cssContent).toMatch(/body:has\(\[data-graph-explorer\]\)/);
  });

  it('should have background-attachment:fixed for gradient', () => {
    cssContent = fs.readFileSync(cssPath, 'utf-8');

    const htmlBlockMatch = cssContent.match(/html\s*\{([^}]*)\}/);

    if (htmlBlockMatch) {
      const htmlStyles = htmlBlockMatch[1];
      // Should have fixed background for gradient
      expect(htmlStyles).toMatch(/background-attachment:\s*fixed/);
    }
  });

  it('should document why overflow:hidden is conditional', () => {
    cssContent = fs.readFileSync(cssPath, 'utf-8');

    // Should have comments explaining the conditional overflow behavior
    const hasExplanation =
      cssContent.includes('Only apply viewport constraints') ||
      cssContent.includes('graph explorer') ||
      cssContent.includes('non-scrollable');

    expect(hasExplanation).toBe(true);
  });
});

describe('App Component Data Attribute', () => {
  const appPath = path.join(process.cwd(), 'src/App.tsx');

  it('should have data-graph-explorer attribute in App component', () => {
    expect(fs.existsSync(appPath)).toBe(true);
    const appContent = fs.readFileSync(appPath, 'utf-8');

    // Should have the data attribute
    expect(appContent).toContain('data-graph-explorer');
  });
});

describe('CosmosBackground Component Overflow', () => {
  const cosmosPath = path.join(process.cwd(), 'src/components/CosmosBackground.tsx');

  it('should have overflow-y-auto in CosmosBackground', () => {
    expect(fs.existsSync(cosmosPath)).toBe(true);
    const cosmosContent = fs.readFileSync(cosmosPath, 'utf-8');

    // Should have overflow-y-auto class
    expect(cosmosContent).toMatch(/overflow-y-auto/);
  });

  it('should not have overflow-hidden on root CosmosBackground div', () => {
    const cosmosContent = fs.readFileSync(cosmosPath, 'utf-8');

    // Extract the main container div classNames
    const mainDivMatch = cosmosContent.match(/className=\{`([^`]*min-h-screen[^`]*)`\}/);

    expect(mainDivMatch).toBeTruthy();

    if (mainDivMatch) {
      const mainDivClasses = mainDivMatch[1];
      // The main container should NOT have overflow-hidden (should have overflow-y-auto)
      expect(mainDivClasses).not.toContain('overflow-hidden');
      expect(mainDivClasses).toContain('overflow-y-auto');
    }
  });
});
