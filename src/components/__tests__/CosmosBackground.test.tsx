import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CosmosBackground } from '../CosmosBackground';

describe('CosmosBackground', { timeout: 5000 }, () => {
  it('renders children', () => {
    render(<CosmosBackground><p>hello world</p></CosmosBackground>);
    expect(screen.getByText('hello world')).toBeInTheDocument();
  });

  it('renders the background container', () => {
    const { container } = render(<CosmosBackground>content</CosmosBackground>);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/min-h-screen/);
  });

  it('applies custom className', () => {
    const { container } = render(<CosmosBackground className="my-custom-class">x</CosmosBackground>);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/my-custom-class/);
  });

  it('renders stars after mount', async () => {
    const { container } = render(<CosmosBackground>content</CosmosBackground>);
    // After initial render, stars not yet shown (mounted=false)
    // After act, useEffect fires and mounted=true
    await act(async () => {});
    // STAR_POSITIONS has 12 stars
    const stars = container.querySelectorAll('.animate-pulse.opacity-30');
    expect(stars.length).toBe(12);
  });

  it('renders exactly 12 star positions (from STAR_POSITIONS constant)', async () => {
    const { container } = render(<CosmosBackground>content</CosmosBackground>);
    await act(async () => {});
    const stars = container.querySelectorAll('.animate-pulse.opacity-30');
    expect(stars.length).toBe(12);
  });

  it('renders ambient orbs', () => {
    const { container } = render(<CosmosBackground>content</CosmosBackground>);
    const orbs = container.querySelectorAll('.blur-3xl');
    expect(orbs.length).toBeGreaterThan(0);
  });
});
