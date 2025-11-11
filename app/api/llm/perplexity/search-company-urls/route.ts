import { NextRequest, NextResponse } from 'next/server';

/**
 * Generate Google search URLs for company platforms and include website URL
 */
export async function POST(request: NextRequest) {
  try {
    const { companyName, websiteUrl } = await request.json();

    if (!companyName) {
      return NextResponse.json(
        { success: false, error: 'Company name is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Generating search URLs for: ${companyName}`);

    const externalLinks: Record<string, string> = {
      linkedin: generateGoogleSearchUrl(companyName, 'LinkedIn'),
      glassdoor: generateGoogleSearchUrl(companyName, 'Glassdoor'),
      crunchbase: generateGoogleSearchUrl(companyName, 'Crunchbase')
    };

    // Add website URL if provided
    if (websiteUrl) {
      externalLinks.website = websiteUrl;
    }

    console.log('✅ Generated URLs:', externalLinks);

    return NextResponse.json({
      success: true,
      data: externalLinks
    });

  } catch (error) {
    console.error('URL generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate search URLs'
      },
      { status: 500 }
    );
  }
}

/**
 * Generate a Google search URL for finding a company on a specific platform
 */
function generateGoogleSearchUrl(companyName: string, platformName: string): string {
  const query = `${companyName} on ${platformName}`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
