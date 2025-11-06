/**
 * Company Suggestions Utility
 *
 * Provides autocomplete suggestions for company names with fallback to
 * a curated list of popular tech companies when external APIs aren't available.
 */

import { getCompanyLogo } from './logoProvider';

export interface CompanySuggestion {
  name: string;
  logo: string;
  industry?: string;
  description?: string;
  domain?: string;
}

// Curated list of popular tech companies for fallback suggestions
const POPULAR_COMPANIES = [
  { name: "Linear", industry: "Productivity", domain: "linear.app", description: "Issue tracking and project management" },
  { name: "Figma", industry: "Design", domain: "figma.com", description: "Collaborative design platform" },
  { name: "Notion", industry: "Productivity", domain: "notion.so", description: "All-in-one workspace for notes and collaboration" },
  { name: "Vercel", industry: "Infrastructure", domain: "vercel.com", description: "Frontend cloud platform" },
  { name: "Supabase", industry: "Database", domain: "supabase.com", description: "Open source Firebase alternative" },
  { name: "Stripe", industry: "Fintech", domain: "stripe.com", description: "Online payment processing" },
  { name: "Airbnb", industry: "Travel", domain: "airbnb.com", description: "Online marketplace for lodging" },
  { name: "Canva", industry: "Design", domain: "canva.com", description: "Graphic design platform" },
  { name: "Shopify", industry: "E-commerce", domain: "shopify.com", description: "E-commerce platform" },
  { name: "Twilio", industry: "Communications", domain: "twilio.com", description: "Cloud communications platform" },
  { name: "MongoDB", industry: "Database", domain: "mongodb.com", description: "NoSQL database platform" },
  { name: "Snowflake", industry: "Data", domain: "snowflake.com", description: "Cloud data platform" },
  { name: "Datadog", industry: "Monitoring", domain: "datadoghq.com", description: "Monitoring and analytics platform" },
  { name: "Atlassian", industry: "Software", domain: "atlassian.com", description: "Team collaboration software" },
  { name: "Slack", industry: "Communications", domain: "slack.com", description: "Business communication platform" },
  { name: "Discord", industry: "Communications", domain: "discord.com", description: "Voice and text chat platform" },
  { name: "GitHub", industry: "Developer Tools", domain: "github.com", description: "Code hosting and collaboration" },
  { name: "GitLab", industry: "Developer Tools", domain: "gitlab.com", description: "DevOps platform" },
  { name: "Netlify", industry: "Infrastructure", domain: "netlify.com", description: "Web development platform" },
  { name: "Amplitude", industry: "Analytics", domain: "amplitude.com", description: "Product analytics platform" },
  { name: "Mixpanel", industry: "Analytics", domain: "mixpanel.com", description: "Product analytics platform" },
  { name: "Segment", industry: "Analytics", domain: "segment.com", description: "Customer data platform" },
  { name: "Loom", industry: "Video", domain: "loom.com", description: "Video messaging platform" },
  { name: "Zoom", industry: "Video", domain: "zoom.us", description: "Video conferencing platform" },
  { name: "Miro", industry: "Collaboration", domain: "miro.com", description: "Online whiteboard platform" },
  { name: "Framer", industry: "Design", domain: "framer.com", description: "Website builder and design tool" },
  { name: "Webflow", industry: "Design", domain: "webflow.com", description: "Visual web development platform" },
  { name: "Retool", industry: "Developer Tools", domain: "retool.com", description: "Low-code app builder" },
  { name: "Airtable", industry: "Database", domain: "airtable.com", description: "Cloud collaboration platform" },
  { name: "Zapier", industry: "Automation", domain: "zapier.com", description: "Workflow automation platform" },
  { name: "Intercom", industry: "Customer Support", domain: "intercom.com", description: "Customer messaging platform" },
  { name: "Zendesk", industry: "Customer Support", domain: "zendesk.com", description: "Customer service platform" },
  { name: "HubSpot", industry: "Marketing", domain: "hubspot.com", description: "Marketing and sales platform" },
  { name: "Salesforce", industry: "CRM", domain: "salesforce.com", description: "Customer relationship management" },
  { name: "Anthropic", industry: "AI", domain: "anthropic.com", description: "AI safety research company" },
  { name: "OpenAI", industry: "AI", domain: "openai.com", description: "AI research and deployment company" },
  { name: "Midjourney", industry: "AI", domain: "midjourney.com", description: "AI image generation platform" },
  { name: "Stability AI", industry: "AI", domain: "stability.ai", description: "Open source AI company" },
  { name: "Hugging Face", industry: "AI", domain: "huggingface.co", description: "AI model repository and platform" },
  { name: "Replicate", industry: "AI", domain: "replicate.com", description: "Platform for running AI models" },
  { name: "Scale AI", industry: "AI", domain: "scale.com", description: "Data platform for AI" },
  { name: "Cohere", industry: "AI", domain: "cohere.ai", description: "Natural language processing AI" }
];

/**
 * Get company suggestions based on user input
 * Currently uses fallback list - can be enhanced with external APIs later
 */
export const getCompanySuggestions = async (query: string): Promise<CompanySuggestion[]> => {
  try {
    // Normalize query for better matching
    const normalizedQuery = query.toLowerCase().trim();
    
    if (normalizedQuery.length < 2) {
      return [];
    }

    // Filter companies based on name or industry match
    const filtered = POPULAR_COMPANIES.filter(company => 
      company.name.toLowerCase().includes(normalizedQuery) ||
      company.industry.toLowerCase().includes(normalizedQuery) ||
      company.description.toLowerCase().includes(normalizedQuery)
    );

    // Sort by relevance (exact name matches first, then partial matches)
    const sorted = filtered.sort((a, b) => {
      const aNameMatch = a.name.toLowerCase().startsWith(normalizedQuery);
      const bNameMatch = b.name.toLowerCase().startsWith(normalizedQuery);
      
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      
      // Secondary sort by name length (shorter names likely more relevant)
      return a.name.length - b.name.length;
    });

    // Convert to suggestion format with actual logos for popular companies
    return sorted.slice(0, 5).map(company => ({
      name: company.name,
      logo: getCompanyLogo(company.domain, company.name),
      industry: company.industry,
      description: company.description,
      domain: company.domain
    }));
    
  } catch (error) {
    console.error('Failed to get company suggestions:', error);
    return [];
  }
};

/**
 * Get a random selection of popular companies for initial display
 */
export const getPopularCompanies = (count: number = 6): CompanySuggestion[] => {
  const shuffled = [...POPULAR_COMPANIES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map(company => ({
    name: company.name,
    logo: getCompanyLogo(company.domain, company.name),
    industry: company.industry,
    description: company.description,
    domain: company.domain
  }));
};

/**
 * Check if a company name exists in our popular companies list
 */
export const isPopularCompany = (companyName: string): boolean => {
  const normalizedName = companyName.toLowerCase().trim();
  return POPULAR_COMPANIES.some(company => 
    company.name.toLowerCase() === normalizedName
  );
};

/**
 * Get company info by exact name match
 */
export const getCompanyByName = (companyName: string): CompanySuggestion | null => {
  const normalizedName = companyName.toLowerCase().trim();
  const company = POPULAR_COMPANIES.find(c =>
    c.name.toLowerCase() === normalizedName
  );

  if (company) {
    return {
      name: company.name,
      logo: getCompanyLogo(company.domain, company.name),
      industry: company.industry,
      description: company.description,
      domain: company.domain
    };
  }

  return null;
};