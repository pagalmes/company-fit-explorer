/**
 * Logo Proxy API Route
 *
 * Proxies Logo.dev images to avoid CORS issues when loading in Cytoscape.
 * Logo.dev doesn't send Access-Control-Allow-Origin headers, which blocks
 * CSS background-image loads from client-side JavaScript.
 *
 * This proxy:
 * 1. Fetches images from Logo.dev with our API key
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

  const apiKey = process.env.NEXT_PUBLIC_LOGO_DEV_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Logo.dev API key not configured' },
      { status: 500 }
    );
  }

  try {
    // Fetch from Logo.dev
    const logoUrl = `https://img.logo.dev/${domain}?token=${apiKey}&format=webp&size=128`;
    const response = await fetch(logoUrl);

    if (!response.ok) {
      // Return 404 or error status from Logo.dev
      return NextResponse.json(
        { error: `Logo.dev returned ${response.status}` },
        { status: response.status }
      );
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/webp';

    // Return the image with CORS headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
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
