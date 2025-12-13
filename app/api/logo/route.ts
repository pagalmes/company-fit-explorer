/**
 * Logo Proxy API Route
 *
 * Proxies Logo.dev and ui-avatars.com images to avoid CORS issues when loading in Cytoscape.
 * External image services don't send proper Access-Control-Allow-Origin headers, which blocks
 * CSS background-image loads in Cytoscape canvas rendering.
 *
 * This proxy:
 * 1. Fetches images from Logo.dev or ui-avatars.com
 * 2. Serves them with proper CORS headers
 * 3. Caches responses to reduce API calls
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const domain = searchParams.get('domain');

  if (!domain) {
    return NextResponse.json(
      { error: 'Missing domain parameter' },
      { status: 400 }
    );
  }

  try {
    let logoUrl: string;
    let contentType: string;

    // Check if this is a fallback avatar request (prefix: avatar:)
    if (domain.startsWith('avatar:')) {
      // Extract avatar parameters
      const avatarParams = domain.substring(7); // Remove 'avatar:' prefix
      logoUrl = `https://ui-avatars.com/api/?${decodeURIComponent(avatarParams)}`;
      contentType = 'image/png'; // ui-avatars returns PNG
    } else {
      // Regular Logo.dev request
  const apiKey = process.env.NEXT_PUBLIC_LOGO_DEV_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Logo.dev API key not configured' },
      { status: 500 }
    );
  }

      logoUrl = `https://img.logo.dev/${domain}?token=${apiKey}&format=webp&size=128`;
      contentType = 'image/webp';
    }

    // Fetch the image
    const response = await fetch(logoUrl);

    if (!response.ok) {
      // Return 404 or error status from the image service
      return NextResponse.json(
        { error: `Image service returned ${response.status}` },
        { status: response.status }
      );
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const actualContentType = response.headers.get('content-type') || contentType;

    // Return the image with CORS headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': actualContentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800', // Cache for 1 day, serve stale for 1 week
        'Access-Control-Allow-Origin': '*', // Allow CORS
        'Access-Control-Allow-Methods': 'GET',
      },
    });
  } catch (error) {
    console.error('Error fetching logo:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logo' },
      { status: 500 }
    );
  }
}
